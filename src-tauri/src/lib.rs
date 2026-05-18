use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    image::Image, Manager, Emitter, AppHandle,
};
use axum::{
    routing::post,
    Json, Router,
    extract::State,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

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

fn map_event_to_pet_state(event_type: &str) -> &str {
    match event_type {
        "agent_start" => "Idle",
        "agent_thinking" => "Thinking",
        "agent_working" => "Working",
        "agent_done" => "Done",
        "agent_error" => "Error",
        "agent_notification" => "Notification",
        "agent_sleep" => "Sleeping",
        _ => "Idle",
    }
}

async fn handle_webhook(
    State(app): State<Arc<Mutex<AppHandle>>>,
    Json(payload): Json<WebhookEvent>,
) -> Result<Json<WebhookResponse>, StatusCode> {
    eprintln!("[webhook] Received event: {} for profile: {}", payload.event_type, payload.profile_name);
    let app = app.lock().await;
    let pet_state = map_event_to_pet_state(&payload.event_type);
    if let Err(e) = app.emit("pet_state_event", pet_state) {
        eprintln!("[webhook] Failed to emit pet_state_event: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    if let Err(e) = app.emit("hermes_event", &payload) {
        eprintln!("[webhook] Failed to emit hermes_event: {}", e);
    }
    Ok(Json(WebhookResponse {
        status: "ok".to_string(),
        message: format!("Event {} mapped to pet state: {}", payload.event_type, pet_state),
    }))
}

async fn start_webhook_server(app_handle: tauri::AppHandle) {
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
fn get_mouse_pos(app: tauri::AppHandle, window: tauri::Window) -> Result<(f64, f64), String> {
    match app.cursor_position() {
        Ok(pos) => {
            let scale_factor = window.scale_factor().unwrap_or(1.0);
            let screen_logical = pos.to_logical::<f64>(scale_factor);
            let window_physical = window.inner_position().unwrap_or(tauri::PhysicalPosition::new(0, 0));
            let window_logical = window_physical.to_logical::<f64>(scale_factor);
            let client_x = screen_logical.x - window_logical.x;
            let client_y = screen_logical.y - window_logical.y;
            Ok((client_x, client_y))
        }
        Err(e) => Err(e.to_string()),
    }
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
            // Set window to cover primary monitor
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let size = monitor.size();
                    if let Err(e) = window.set_size(*size) {
                        eprintln!("Failed setting window size: {}", e);
                    }
                    if let Err(e) = window.set_position(tauri::PhysicalPosition::new(monitor.position().x, monitor.position().y)) {
                        eprintln!("Failed setting window position: {}", e);
                    }
                }
            }

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
            let tray_icon = Image::new(&rgba, size, size);

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
        ])
        .setup(|app| {
            tauri::async_runtime::spawn(start_webhook_server(app.handle().clone()));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
