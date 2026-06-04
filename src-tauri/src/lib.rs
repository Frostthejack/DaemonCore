use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder, Manager, Emitter, AppHandle,
};
use axum::{
    routing::post,
    Json, Router,
    extract::State,
    http::StatusCode,
};
use axum_extra::{
    extract::TypedHeader,
    headers::{authorization::Bearer, Authorization},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::time::Duration;
use std::collections::HashMap;
use uuid::Uuid;
use std::fs;

/// Port for the webhook server
const WEBHOOK_PORT: u16 = 32947;

#[derive(Debug, Deserialize, Serialize)]
struct WebhookEvent {
    event_type: String,
    profile_name: String,
    session_id: Option<String>,
    message: Option<String>,
    #[serde(default)]
    metadata: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct WebhookResponse {
    status: String,
    message: String,
}

/// Webhook token storage - holds the auth token for the webhook endpoint
pub struct WebhookTokenStore {
    token: Mutex<String>,
}

impl WebhookTokenStore {
    pub fn new() -> Self {
        Self {
            token: Mutex::new(String::new()),
        }
    }

    pub async fn get(&self) -> String {
        self.token.lock().await.clone()
    }

    pub async fn set(&self, token: String) {
        *self.token.lock().await = token;
    }
}

/// Global token store instance
static TOKEN_STORE: std::sync::OnceLock<Arc<WebhookTokenStore>> = std::sync::OnceLock::new();

fn get_token_store() -> &'static Arc<WebhookTokenStore> {
    TOKEN_STORE.get_or_init(|| Arc::new(WebhookTokenStore::new()))
}

/// Load or generate the webhook auth token
/// Token is stored in the app config directory and persists across restarts
fn load_or_generate_token(app: &AppHandle) -> String {
    let token_path = app
        .path()
        .app_config_dir()
        .map(|p| p.join("webhook_token.txt"))
        .unwrap_or_else(|_| std::path::PathBuf::from("webhook_token.txt"));

    // Try to read existing token
    if let Ok(token) = fs::read_to_string(&token_path) {
        let trimmed = token.trim();
        if !trimmed.is_empty() {
            eprintln!("[webhook] Loaded existing token from {:?}", token_path);
            return trimmed.to_string();
        }
    }

    // Generate new token
    let new_token = Uuid::new_v4().to_string();
    eprintln!("[webhook] Generated new token: {}", new_token);

    // Save token to file
    if let Some(parent) = token_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(&token_path, &new_token);

    new_token
}

/// Maps tool names to granular sub-states for pet reactions
/// Inspired by hermes-visualizer-plugin's mood detection approach
fn map_tool_to_substate(tool_name: &str) -> Option<&'static str> {
    match tool_name {
        // Investigation -> curious
        "web_search" | "read_file" | "browser_navigate" => Some("curious"),
        // Terminal/work operations -> terminal_work
        "terminal" | "patch" | "browser_click" | "todo" => Some("terminal_work"),
        // Code operations -> code_work
        "execute_code" | "delegate_task" => Some("code_work"),
        // Creative operations -> excited
        "image_generate" | "text_to_speech" => Some("excited"),
        // User interaction -> surprised
        "clarify" => Some("surprised"),
        // Analysis operations -> analyzing (within thinking)
        "memory" | "session_search" | "vision_analyze" => Some("analyzing"),
        // Completion operations -> done (happy completion)
        "write_file" | "send_message" => Some("done"),
        // Default: no sub-state
        _ => None,
    }
}

fn map_event_to_pet_state(event_type: &str) -> &str {
    match event_type {
        "agent_start" => "Idle",
        "agent_thinking" => "Thinking",
        "agent_working" => "Working",
        "agent_done" => "Done",
        "agent_error" => "Error",
        "agent_notification" => "Notification",
        "agent_sleep" => "Sleeping",
        // Session lifecycle events
        "session_start" => "Idle",
        "session_end" => "Idle",
        "session_update" => "Idle",
        _ => "Idle",
    }
}

/// Extracts tool name from metadata and returns appropriate sub-state
fn extract_substate_from_metadata(metadata: &serde_json::Value) -> Option<String> {
    if let Some(tool) = metadata.get("tool").and_then(|t| t.as_str()) {
        map_tool_to_substate(tool).map(|s| s.to_string())
    } else {
        None
    }
}

async fn handle_webhook(
    State(app): State<Arc<Mutex<AppHandle>>>,
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    Json(payload): Json<WebhookEvent>,
) -> Result<Json<WebhookResponse>, StatusCode> {
    // Validate the bearer token
    let expected_token = get_token_store().get().await;
    if auth.token() != expected_token {
        eprintln!("[webhook] Invalid token provided");
        return Err(StatusCode::UNAUTHORIZED);
    }

    eprintln!("[webhook] Received event: {} for profile: {}", payload.event_type, payload.profile_name);
    let app = app.lock().await;
    let pet_state = map_event_to_pet_state(&payload.event_type);
    
    // Extract tool name from metadata for tool-specific reactions
    // Backward compatible: returns None if no tool field in metadata
    let tool_name = payload.metadata.get("tool").and_then(|t| t.as_str());
    
    // Extract sub-state from metadata if available
    let sub_state = extract_substate_from_metadata(&payload.metadata);
    
    // Emit the pet state event with optional sub-state
    let state_event = serde_json::json!({
        "state": pet_state,
        "sub_state": sub_state,
    });
    
    if let Err(e) = app.emit("pet_state_event", state_event) {
        eprintln!("[webhook] Failed to emit pet_state_event: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    // Emit hermes_event with tool_name included in payload
    // Backward compatible: tool_name is optional and defaults to null for events without it
    let event_payload = serde_json::json!({
        "event_type": &payload.event_type,
        "profile_name": &payload.profile_name,
        "session_id": &payload.session_id,
        "message": &payload.message,
        "metadata": &payload.metadata,
        "tool_name": tool_name,
    });
    if let Err(e) = app.emit("hermes_event", event_payload) {
        eprintln!("[webhook] Failed to emit hermes_event: {}", e);
    }
    
    // Emit session lifecycle events for session_* event types
    if payload.event_type.starts_with("session_") {
        let session_event = serde_json::json!({
            "event_type": payload.event_type,
            "session_id": payload.session_id,
            "profile_name": payload.profile_name,
            "session_name": payload.metadata.get("session_name").and_then(|v| v.as_str()),
            "character": payload.metadata.get("character").and_then(|v| v.as_str()),
            "status": payload.metadata.get("status").and_then(|v| v.as_str()),
            "timestamp": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as i64)
                .ok(),
        });
        if let Err(e) = app.emit("session_event", session_event) {
            eprintln!("[webhook] Failed to emit session_event: {}", e);
        }
    }
    
    Ok(Json(WebhookResponse {
        status: "ok".to_string(),
        message: format!("Event {} mapped to pet state: {} (sub_state: {:?})", payload.event_type, pet_state, sub_state),
    }))
}

async fn start_webhook_server(app_handle: tauri::AppHandle) {
    // Load or generate the webhook auth token
    let token = load_or_generate_token(&app_handle);
    get_token_store().set(token).await;

    let app = Arc::new(Mutex::new(app_handle));
    let router = Router::new()
        .route("/api/webhook", post(handle_webhook))
        .with_state(app);
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", WEBHOOK_PORT))
        .await
        .expect("Failed to bind webhook server");
    eprintln!("[webhook] Server listening on http://127.0.0.1:{}", WEBHOOK_PORT);
    axum::serve(listener, router)
        .await
        .expect("Webhook server failed");
}

#[tauri::command]
fn set_ignore_cursor_events(app: tauri::AppHandle, ignore: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
fn get_mouse_pos(app: tauri::AppHandle) -> Result<(f64, f64), String> {
    match app.cursor_position() {
        Ok(pos) => {
            // Get the main window to calculate viewport-relative coordinates
            if let Some(window) = app.get_webview_window("main") {
                let scale_factor = window.scale_factor().unwrap_or(1.0);
                let screen_logical = pos.to_logical::<f64>(scale_factor);
                let window_physical = window.inner_position().unwrap_or(tauri::PhysicalPosition::new(0, 0));
                let window_logical = window_physical.to_logical::<f64>(scale_factor);
                let client_x = screen_logical.x - window_logical.x;
                let client_y = screen_logical.y - window_logical.y;
                Ok((client_x, client_y))
            } else {
                // Fallback: return screen coordinates if window not found
                Ok((pos.x, pos.y))
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Pet bounding box for hit-testing
/// Pet character is 150x150px at medium scale, scaled by size factor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetBoundingBox {
    pub profile_name: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl PetBoundingBox {
    /// Check if a point is inside this bounding box
    pub fn contains(&self, px: f64, py: f64) -> bool {
        px >= self.x && px <= self.x + self.width
            && py >= self.y && py <= self.y + self.height
    }
}

/// Global pet position storage - shared between Tauri commands and mouse tracker
pub struct PetPositionStore {
    pets: Mutex<HashMap<String, PetBoundingBox>>,
}

impl PetPositionStore {
    pub fn new() -> Self {
        Self {
            pets: Mutex::new(HashMap::new()),
        }
    }

    pub async fn update(&self, bbox: PetBoundingBox) {
        let mut pets = self.pets.lock().await;
        pets.insert(bbox.profile_name.clone(), bbox);
    }

    pub async fn remove(&self, profile_name: &str) {
        let mut pets = self.pets.lock().await;
        pets.remove(profile_name);
    }

    pub async fn get_all(&self) -> Vec<PetBoundingBox> {
        self.pets.lock().await.values().cloned().collect()
    }

    pub async fn check_hit(&self, x: f64, y: f64) -> bool {
        let pets = self.pets.lock().await;
        for bbox in pets.values() {
            if bbox.contains(x, y) {
                return true;
            }
        }
        false
    }
}

/// Global store instance
static PET_STORE: std::sync::OnceLock<Arc<PetPositionStore>> = std::sync::OnceLock::new();

fn get_pet_store() -> &'static Arc<PetPositionStore> {
    PET_STORE.get_or_init(|| Arc::new(PetPositionStore::new()))
}

/// Tauri command to update pet position from frontend
#[tauri::command]
async fn update_pet_position(
    profile_name: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let bbox = PetBoundingBox {
        profile_name,
        x,
        y,
        width,
        height,
    };
    get_pet_store().update(bbox).await;
    Ok(())
}

/// Tauri command to remove pet (when it's closed)
#[tauri::command]
async fn remove_pet_position(profile_name: String) -> Result<(), String> {
    get_pet_store().remove(&profile_name).await;
    Ok(())
}

/// Tauri command to get the webhook auth token
/// This allows the frontend to retrieve the token for making authenticated requests
#[tauri::command]
async fn get_webhook_token() -> Result<String, String> {
    Ok(get_token_store().get().await)
}

/// Tauri command to regenerate the webhook auth token
/// Generates a new UUID token and persists it to the config file
#[tauri::command]
async fn regenerate_webhook_token(app: tauri::AppHandle) -> Result<String, String> {
    // Generate new token
    let new_token = Uuid::new_v4().to_string();
    
    // Save to file
    let token_path = app
        .path()
        .app_config_dir()
        .map(|p| p.join("webhook_token.txt"))
        .unwrap_or_else(|_| std::path::PathBuf::from("webhook_token.txt"));
    
    if let Some(parent) = token_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(&token_path, &new_token);
    
    // Update in-memory store
    get_token_store().set(new_token.clone()).await;
    
    eprintln!("[webhook] Regenerated new token: {}", new_token);
    Ok(new_token)
}

/// Spawn a background task that polls the OS mouse position and emits
/// a `mouse_position` event at ~60 Hz.  This works even when the window
/// has `set_ignore_cursor_events(true)` because it uses the Tauri
/// `cursor_position()` API which queries the OS directly.
/// Emits viewport-relative (client) coordinates for use in the frontend.
/// 
/// Also performs hit-testing against pet bounding boxes to toggle
/// click-through state synchronously.
fn start_mouse_tracker(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            if let Some(window) = app_handle.get_webview_window("main") {
                if let Ok(pos) = app_handle.cursor_position() {
                    let scale_factor = window.scale_factor().unwrap_or(1.0);
                    let screen_logical = pos.to_logical::<f64>(scale_factor);
                    // Convert screen coordinates to viewport-relative (client) coordinates
                    let window_physical = window.inner_position().unwrap_or(tauri::PhysicalPosition::new(0, 0));
                    let window_logical = window_physical.to_logical::<f64>(scale_factor);
                    let client_x = screen_logical.x - window_logical.x;
                    let client_y = screen_logical.y - window_logical.y;
                    let _ = app_handle.emit("mouse_position", (client_x, client_y));
                    
                    // Hit-testing: check if cursor is over any pet
                    // Pet size is 150x150px at medium scale, centered on position
                    // We need to check if cursor is within the pet's bounds
                    let pets = get_pet_store().get_all().await;
                    let mut should_ignore = true;
                    
                    for pet in &pets {
                        if pet.contains(client_x, client_y) {
                            should_ignore = false;
                            break;
                        }
                    }
                    
                    // Update click-through state
                    if let Err(e) = window.set_ignore_cursor_events(should_ignore) {
                        eprintln!("[mouse_tracker] Failed to set ignore cursor events: {}", e);
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(16)).await; // ~60 fps
        }
    });
}

/// Build the system tray menu
fn build_tray_menu(app: &tauri::AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let show_pet = CheckMenuItemBuilder::new("Show Pet")
        .id("show_pet")
        .checked(true)
        .build(app)?;
    let sounds = CheckMenuItemBuilder::new("Sounds")
        .id("sounds")
        .checked(true)
        .build(app)?;
    let follow_mouse = CheckMenuItemBuilder::new("Follow Mouse")
        .id("follow_mouse")
        .checked(true)
        .build(app)?;

    // Theme items (radio-style via checkable)
    let theme_midnight = CheckMenuItemBuilder::new("Theme: Midnight")
        .id("theme_midnight")
        .checked(true)
        .build(app)?;
    let theme_peach = CheckMenuItemBuilder::new("Theme: Peach")
        .id("theme_peach")
        .checked(false)
        .build(app)?;
    let theme_cloud = CheckMenuItemBuilder::new("Theme: Cloud")
        .id("theme_cloud")
        .checked(false)
        .build(app)?;
    let theme_moss = CheckMenuItemBuilder::new("Theme: Moss")
        .id("theme_moss")
        .checked(false)
        .build(app)?;

    // Size items
    let size_small = CheckMenuItemBuilder::new("Size: Small")
        .id("size_small")
        .checked(false)
        .build(app)?;
    let size_medium = CheckMenuItemBuilder::new("Size: Medium")
        .id("size_medium")
        .checked(true)
        .build(app)?;
    let size_large = CheckMenuItemBuilder::new("Size: Large")
        .id("size_large")
        .checked(false)
        .build(app)?;

    let sessions = MenuItemBuilder::with_id("sessions", "Active Sessions...")
        .enabled(true)
        .build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit")
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show_pet)
        .item(&sounds)
        .item(&follow_mouse)
        .separator()
        .item(&theme_midnight)
        .item(&theme_peach)
        .item(&theme_cloud)
        .item(&theme_moss)
        .separator()
        .item(&size_small)
        .item(&size_medium)
        .item(&size_large)
        .separator()
        .item(&sessions)
        .separator()
        .item(&quit)
        .build()?;

    Ok(menu)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Set window to cover primary monitor while preserving transparency
            // Note: maximize() breaks transparency on Windows DWM, so we use manual sizing
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let size = monitor.size();
                    let pos = monitor.position();
                    eprintln!("[setup] Setting window size={:?} pos={:?}", size, pos);
                    if let Err(e) = window.set_size(*size) {
                        eprintln!("[setup] Failed to set window size: {}", e);
                    }
                    if let Err(e) = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y)) {
                        eprintln!("[setup] Failed to set window position: {}", e);
                    }
                } else {
                    eprintln!("[setup] Failed to get primary monitor, using fallback");
                    // Fallback: try to get monitor from available monitors
                    if let Ok(monitors) = window.available_monitors() {
                        if let Some(monitor) = monitors.into_iter().next() {
                            let size = monitor.size();
                            let pos = monitor.position();
                            let _ = window.set_size(*size);
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y));
                        }
                    }
                }
            }
            // Enable click-through by default for transparent window
            if let Some(window) = app.get_webview_window("main") {
                if let Err(e) = window.set_ignore_cursor_events(true) {
                    eprintln!("[setup] Failed to set ignore cursor events: {}", e);
                }
            }
            // Start webhook server
            tauri::async_runtime::spawn(start_webhook_server(app.handle().clone()));

            // Start mouse tracker
            start_mouse_tracker(app.handle().clone());

            // Build tray icon from raw RGBA bytes (purple circle)
            let size: u32 = 32;
            let mut rgba = Vec::new();
            for y in 0..size {
                for x in 0..size {
                    let cx = size as f64 / 2.0;
                    let cy = size as f64 / 2.0;
                    let r = (size as f64 / 2.0) - 2.0;
                    let dx = x as f64 - cx;
                    let dy = y as f64 - cy;
                    if dx * dx + dy * dy <= r * r {
                        rgba.extend_from_slice(&[124, 109, 240, 255]);
                    } else {
                        rgba.extend_from_slice(&[0, 0, 0, 0]);
                    }
                }
            }
            let tray_icon = tauri::image::Image::new_owned(rgba, size, size);

            let menu = build_tray_menu(app.handle())?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .menu(&menu)
                .on_menu_event(move |app: &tauri::AppHandle, event| {
                    let id = event.id.as_ref();
                    match id {
                        "show_pet" => {
                            app.emit("tray_event", id).unwrap_or_default();
                        }
                        "sounds" => {
                            app.emit("tray_event", id).unwrap_or_default();
                        }
                        "follow_mouse" => {
                            app.emit("tray_event", id).unwrap_or_default();
                        }
                        "theme_midnight" => {
                            app.emit("tray_event", "theme:midnight").unwrap_or_default();
                        }
                        "theme_peach" => {
                            app.emit("tray_event", "theme:peach").unwrap_or_default();
                        }
                        "theme_cloud" => {
                            app.emit("tray_event", "theme:cloud").unwrap_or_default();
                        }
                        "theme_moss" => {
                            app.emit("tray_event", "theme:moss").unwrap_or_default();
                        }
                        "size_small" => {
                            app.emit("tray_event", "size:small").unwrap_or_default();
                        }
                        "size_medium" => {
                            app.emit("tray_event", "size:medium").unwrap_or_default();
                        }
                        "size_large" => {
                            app.emit("tray_event", "size:large").unwrap_or_default();
                        }
                        "sessions" => {
                            app.emit("tray_event", "sessions").unwrap_or_default();
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_mouse_pos,
            set_ignore_cursor_events,
            update_pet_position,
            remove_pet_position,
            get_webhook_token,
            regenerate_webhook_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}