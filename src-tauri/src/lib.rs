use tauri::{Manager, Emitter, menu::{MenuBuilder, MenuItemBuilder, CheckMenuItemBuilder}, tray::TrayIconBuilder, image::Image};
use axum::{
    routing::post,
    Json, Router,
    extract::State,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::AppHandle;

/// Port for the webhook server — change this constant to reconfigure.
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

/// Map Hermes event types to PetState values for the frontend.
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

    // Emit pet_state_event to frontend with the mapped state
    if let Err(e) = app.emit("pet_state_event", pet_state) {
        eprintln!("[webhook] Failed to emit pet_state_event: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    // Also emit the raw event for compatibility
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

            // Build system tray
            let char_toggle = CheckMenuItemBuilder::new("Show Pet")
                .id("show_pet")
                .checked(true)
                .build(app)?;

            let sounds_item = CheckMenuItemBuilder::new("Sounds")
                .id("sounds")
                .checked(true)
                .build(app)?;

            let quit_i = MenuItemBuilder::with_id("quit", "Quit")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&char_toggle)
                .item(&sounds_item)
                .separator()
                .item(&quit_i)
                .build()?;

            let show_pet_state = std::sync::Arc::new(std::sync::Mutex::new(true));
            let show_pet_state_clone = show_pet_state.clone();

            // Create a simple tray icon from raw RGBA bytes
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

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .menu(&menu)
                .on_menu_event(move |app: &tauri::AppHandle, event| {
                    let id = event.id.as_ref();
                    match id {
                        "show_pet" => {
                            let mut state = show_pet_state_clone.lock().unwrap();
                            *state = !*state;
                            app.emit("tray_event", id).unwrap_or_default();
                        }
                        "sounds" => {
                            app.emit("tray_event", id).unwrap_or_default();
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
        // Start webhook server in background using Tauri async runtime
        .setup(|app| {
            tauri::async_runtime::spawn(start_webhook_server(app.handle().clone()));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
