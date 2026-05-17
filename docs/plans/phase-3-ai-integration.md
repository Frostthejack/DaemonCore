# Phase 3: AI Integration & Polish — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Connect DaemonCore to Hermes Agent via webhook, add settings/session panels, implement follow-mouse physics, create GitHub repo, and cross-compile final build.

**Architecture:** 
- In-process Rust HTTP server (axum) receives Hermes webhook events → maps agent states to pet states via Tauri events
- Settings panel: React modal with theme/size/sounds controls
- Session panel: shows active Hermes sessions, allows per-session pet interaction
- Follow-mouse: pet wanders toward cursor but maintains minimum distance, with smooth lerp

**Tech Stack:** Tauri 2, React 19, Rust (axum for webhook server), Zustand, localStorage

**Depends on:** Phase 2 (verified complete — multi-character system working)

---

## Phase 3 Task Graph

```
T3.1  ops  Create GitHub repo and push
T3.2  backend-eng  Add axum webhook server (Rust, in-process)
T3.3  backend-eng  Map Hermes events → pet states (Rust)
T3.4  frontend-eng  Create settings panel component
T3.5  frontend-eng  Create session panel component
T3.6  frontend-eng  Implement follow-mouse physics
T3.7  frontend-eng  Integrate webhook → frontend state sync
T3.8  ops  Update project-state.md and docs
      │
      ▼
T3.9  reviewer  Phase 3 Review Gate
```

Dependencies:
- T3.1 can start immediately
- T3.2, T3.4, T3.5, T3.6 can run in parallel (no deps)
- T3.3 depends on T3.2
- T3.7 depends on T3.3, T3.4, T3.5
- T3.8 depends on T3.7
- T3.9 depends on T3.8 (review gate)

---

### Task 3.1: Create GitHub Repository and Push

**Objective:** Create the GitHub repo for DaemonCore and push all current code.

**Files:**
- None local (remote only)

**Steps:**

**Step 1: Create repo**
```bash
gh repo create Frostthejack/DaemonCore --public --description "Desktop AI companion system — animated pet characters that react to Hermes Agent activity" --clone
```

**Step 2: If repo already exists, just add remote**
```bash
cd /mnt/c/Users/luned/Documents/DaemonCore
git remote add origin https://github.com/Frostthejack/DaemonCore.git
git branch -M main
git push -u origin main
```

**Step 3: Verify**
```bash
gh repo view Frostthejack/DaemonCore
git log --oneline -5
```

**Verification:**
- `gh repo view` shows the repo exists
- `git log` shows all 4 commits pushed
- Remote URL is set correctly

---

### Task 3.2: Add Axum Webhook Server (Rust Backend)

**Objective:** Add an in-process HTTP server using axum that listens for Hermes webhook events on a local port.

**Files:**
- Modify: `src-tauri/Cargo.toml` (add axum, tower-http deps)
- Modify: `src-tauri/src/lib.rs` (add webhook server)

**Step 1: Add dependencies to Cargo.toml**

Add to `[dependencies]`:
```toml
axum = "0.7"
tower-http = { version = "0.5", features = ["cors"] }
uuid = { version = "1", features = ["v4"] }
```

**Step 2: Add webhook server to lib.rs**

Add a `webhook_server` function alongside the existing code:

```rust
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

#[derive(Debug, Deserialize)]
struct WebhookEvent {
    event_type: String,  // "agent_start", "agent_thinking", "agent_working", "agent_done", "agent_error", "agent_notification"
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

async fn handle_webhook(
    State(app): State<Arc<Mutex<AppHandle>>>,
    Json(payload): Json<WebhookEvent>,
) -> Result<Json<WebhookResponse>, StatusCode> {
    eprintln!("[webhook] Received event: {} for profile: {}", payload.event_type, payload.profile_name);

    let app = app.lock().await;

    // Emit event to frontend
    if let Err(e) = app.emit("hermes_event", &payload) {
        eprintln!("[webhook] Failed to emit event: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    Ok(Json(WebhookResponse {
        status: "ok".to_string(),
        message: format!("Event {} processed", payload.event_type),
    }))
}

async fn start_webhook_server(app_handle: tauri::AppHandle) {
    let app = Arc::new(Mutex::new(app_handle));

    let router = Router::new()
        .route("/api/webhook", post(handle_webhook))
        .with_state(app);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:32947")
        .await
        .expect("Failed to bind webhook server");

    eprintln!("[webhook] Server listening on http://127.0.0.1:32947");

    axum::serve(listener, router)
        .await
        .expect("Webhook server failed");
}
```

**Step 3: Spawn the server in the Tauri setup**

In `run()` function, before `.run(tauri::generate_context!())`, add:

```rust
// Start webhook server in background
tauri::async_runtime::spawn(start_webhook_server(app.handle().clone()));
```

**Step 4: Build and verify**

```bash
cd /mnt/c/Users/luned/DaemonCore/src-tauri
cargo build --target x86_64-pc-windows-gnu --release 2>&1 | tail -5
```

**Verification:**
- Build succeeds with no errors
- Binary size is reasonable (< 25MB increase)
- No compiler warnings about unused imports

---

### Task 3.3: Map Hermes Events → Pet States (Rust)

**Objective:** Define the event-to-state mapping and emit Tauri events that the frontend can consume.

**Files:**
- Modify: `src-tauri/src/lib.rs` (enhance webhook handler)

**Step 1: Add state mapping function**

```rust
fn event_to_pet_state(event_type: &str) -> &'static str {
    match event_type {
        "agent_start" => "idle",
        "agent_thinking" => "thinking",
        "agent_working" => "working",
        "agent_done" => "done",
        "agent_error" => "error",
        "agent_notification" => "notification",
        "agent_sleep" => "sleeping",
        _ => "idle",
    }
}
```

**Step 2: Enhance the webhook handler to include the resolved state**

Add to the `WebhookEvent` struct:
```rust
#[derive(Debug, Serialize, Clone)]
struct PetStateEvent {
    event_type: String,
    profile_name: String,
    pet_state: String,
    message: Option<String>,
}
```

Update the handler to emit `pet_state_event` with the resolved state:
```rust
let pet_state = event_to_pet_state(&payload.event_type);
let state_event = PetStateEvent {
    event_type: payload.event_type.clone(),
    profile_name: payload.profile_name.clone(),
    pet_state: pet_state.to_string(),
    message: payload.message.clone(),
};

if let Err(e) = app.emit("pet_state_event", &state_event) {
    eprintln!("[webhook] Failed to emit pet state: {}", e);
}
```

**Step 3: Build and verify**

```bash
cargo build --target x86_64-pc-windows-gnu --release 2>&1 | tail -5
```

**Verification:**
- Build succeeds
- The `pet_state_event` is emitted with correct state mapping

---

### Task 3.4: Create Settings Panel Component

**Objective:** Build a settings panel modal with theme selection, pet size, and sounds toggle.

**Files:**
- Create: `src/components/SettingsPanel.tsx`
- Modify: `src/App.tsx` (add settings button and panel state)
- Modify: `src/App.css` (add settings panel styles)

**Step 1: Create SettingsPanel.tsx**

```tsx
import { useAppConfigStore } from "../hooks/useAppConfig";
import { usePetSystemStore } from "../store/petSystem";
import type { ThemeName, PetSize } from "../hooks/useAppConfig";

const THEMES: { id: ThemeName; label: string; color: string }[] = [
  { id: "midnight", label: "Midnight", color: "#1a1a2e" },
  { id: "peach", label: "Peach", color: "#ffecd2" },
  { id: "cloud", label: "Cloud", color: "#e8f4f8" },
  { id: "moss", label: "Moss", color: "#d4e6d4" },
];

const SIZES: { id: PetSize; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { theme, size, isSoundsEnabled, setTheme, setSize, setSoundsEnabled } = useAppConfigStore();
  const followMouse = usePetSystemStore((s) => s.followMouse);
  const setFollowMouse = usePetSystemStore((s) => s.setFollowMouse);
  const followDistance = usePetSystemStore((s) => s.followDistance);
  const setFollowDistance = usePetSystemStore((s) => s.setFollowDistance);

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="settings-section">
        <h3>Theme</h3>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-option ${t.id === theme ? "active" : ""}`}
              onClick={() => setTheme(t.id)}
            >
              <span className="theme-swatch" style={{ background: t.color }} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>Pet Size</h3>
        <div className="size-options">
          {SIZES.map((s) => (
            <button
              key={s.id}
              className={`size-option ${s.id === size ? "active" : ""}`}
              onClick={() => setSize(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>Behavior</h3>
        <label className="setting-row">
          <input
            type="checkbox"
            checked={isSoundsEnabled}
            onChange={(e) => setSoundsEnabled(e.target.checked)}
          />
          <span>Sounds</span>
        </label>
        <label className="setting-row">
          <input
            type="checkbox"
            checked={followMouse}
            onChange={(e) => setFollowMouse(e.target.checked)}
          />
          <span>Follow mouse</span>
        </label>
        {followMouse && (
          <label className="setting-row setting-slider">
            <span>Follow distance: {followDistance}px</span>
            <input
              type="range"
              min="50"
              max="300"
              value={followDistance}
              onChange={(e) => setFollowDistance(Number(e.target.value))}
            />
          </label>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Add to App.tsx**

Add state and button:
```tsx
const [settingsOpen, setSettingsOpen] = useState(false);

// In the JSX, next to manager-toggle:
<button className="settings-toggle" onClick={() => setSettingsOpen(true)} title="Settings">⚙</button>

{settingsOpen && (
  <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
    <div onClick={(e) => e.stopPropagation()}>
      <SettingsPanel onClose={() => setSettingsOpen(false)} />
    </div>
  </div>
)}
```

**Step 3: Add CSS for settings panel**

Add to `App.css`:
```css
.settings-toggle {
  position: fixed;
  bottom: 20px;
  right: 80px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 20px;
  cursor: pointer;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-panel {
  width: 380px;
  max-height: 80vh;
  background: rgba(20, 20, 30, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
  color: white;
  backdrop-filter: blur(20px);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-section { padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.settings-section h3 { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 12px; text-transform: uppercase; }
.theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.theme-option { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.1); border: 1px solid transparent; border-radius: 8px; color: white; cursor: pointer; font-size: 13px; }
.theme-option.active { border-color: rgba(100,100,255,0.5); background: rgba(100,100,255,0.2); }
.theme-swatch { width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); }
.size-options { display: flex; gap: 8px; }
.size-option { flex: 1; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid transparent; border-radius: 8px; color: white; cursor: pointer; font-size: 13px; text-align: center; }
.size-option.active { border-color: rgba(100,100,255,0.5); background: rgba(100,100,255,0.2); }
.setting-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; cursor: pointer; }
.setting-row input[type="checkbox"] { accent-color: #6464ff; }
.setting-slider { flex-direction: column; align-items: flex-start; gap: 4px; }
.setting-slider input[type="range"] { width: 100%; accent-color: #6464ff; }
```

**Step 4: Build and verify**

```bash
cd /mnt/c/Users/luned/Documents/DaemonCore && npm run build 2>&1 | tail -5
```

**Verification:**
- Build succeeds with no errors
- Settings panel renders with theme swatches, size options, and toggles

---

### Task 3.5: Create Session Panel Component

**Objective:** Build a panel showing active Hermes sessions with per-session pet controls.

**Files:**
- Create: `src/components/SessionPanel.tsx`
- Modify: `src/App.tsx` (add session panel trigger)
- Modify: `src/App.css` (add session panel styles)

**Step 1: Create SessionPanel.tsx**

```tsx
import { useState, useEffect } from "react";
import { usePetSystemStore } from "../store/petSystem";
import { CHARACTER_REGISTRY } from "../types/pet";
import type { PetName, ProfileName } from "../types/pet";

interface Session {
  id: string;
  profileName: ProfileName;
  status: "active" | "idle" | "error";
  lastActivity: string;
}

export function SessionPanel({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const pets = usePetSystemStore((s) => s.pets);
  const setCharacterForProfile = usePetSystemStore((s) => s.setCharacterForProfile);

  // Listen for new sessions from webhook events
  useEffect(() => {
    // Placeholder: will be populated by webhook events
    // For now, show active pets as sessions
    const activeSessions: Session[] = pets.map((p) => ({
      id: p.profileName,
      profileName: p.profileName,
      status: "active" as const,
      lastActivity: "Now",
    }));
    setSessions(activeSessions);
  }, [pets]);

  return (
    <div className="session-panel">
      <div className="session-header">
        <h2>Sessions</h2>
        <button onClick={onClose}>✕</button>
      </div>

      {sessions.length === 0 && (
        <div className="no-sessions">No active sessions. Pets will appear here when connected to Hermes.</div>
      )}

      {sessions.map((session) => {
        const pet = pets.find((p) => p.profileName === session.profileName);
        const charDef = CHARACTER_REGISTRY[pet?.characterId || "owl"];

        return (
          <div key={session.id} className="session-entry">
            <div className="session-info">
              <span className="session-name">{session.profileName}</span>
              <span className={`session-status status-${session.status}`}>{session.status}</span>
              <span className="session-time">{session.lastActivity}</span>
            </div>
            <div className="session-char">
              <span>{charDef.label}</span>
              <span className="session-state">{pet?.state || "idle"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Add CSS**

```css
.session-panel {
  width: 380px;
  max-height: 70vh;
  background: rgba(20, 20, 30, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
  color: white;
  backdrop-filter: blur(20px);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.no-sessions {
  padding: 24px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.session-entry {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.session-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.session-name { font-weight: 600; font-size: 13px; }
.session-status { font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
.status-active { background: rgba(0, 255, 100, 0.2); color: #00ff64; }
.status-idle { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.5); }
.status-error { background: rgba(255, 80, 80, 0.2); color: #ff5050; }
.session-time { font-size: 11px; color: rgba(255, 255, 255, 0.3); margin-left: auto; }

.session-char {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.session-state {
  font-style: italic;
  color: rgba(255, 255, 255, 0.4);
}
```

**Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```

**Verification:**
- Build succeeds
- Session panel shows active pets as sessions

---

### Task 3.6: Implement Follow-Mouse Physics

**Objective:** Add follow-mouse behavior where the pet follows the cursor but maintains a minimum distance.

**Files:**
- Modify: `src/components/PetWidget.tsx` (enhance follow-mouse logic)
- Modify: `src/hooks/usePetMovement.ts` (add follow-mouse target)

**Step 1: Update usePetMovement to support external target**

Add to the `UsePetMovementArgs` interface:
```typescript
interface UsePetMovementArgs {
  petName: PetName;
  size: PetSize;
  initialX: number;
  followTarget?: { x: number; y: number } | null;
  followDistance?: number;
}
```

Add follow-target logic to the animation loop:
```typescript
// In the animate callback, after the existing wander logic:
if (followTarget && !isDragging) {
  const dx = followTarget.x - pos.x;
  const dy = followTarget.y - pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = followDistance || 120;

  if (dist > minDist) {
    // Move toward cursor but stop at minDist
    const ratio = Math.min((dist - minDist) / dist, 0.03);
    const newX = pos.x + dx * ratio;
    const newY = pos.y + dy * ratio;

    if (dx > 1) directionRef.current = 1;
    else if (dx < -1) directionRef.current = -1;

    setPosition({ x: newX, y: newY });
  }
}
```

**Step 2: Update PetWidget to pass follow target**

In the follow-mouse useEffect:
```typescript
useEffect(() => {
  if (!followMouse || isDragging) return;

  const handleMouseMove = (e: MouseEvent) => {
    // Update the follow target in the movement hook
    // This is a simplified version — the actual implementation
    // would pass the target through the hook
  };

  window.addEventListener("mousemove", handleMouseMove);
  return () => window.removeEventListener("mousemove", handleMouseMove);
}, [followMouse, isDragging]);
```

**Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```

**Verification:**
- Build succeeds
- Follow-mouse checkbox in settings panel is functional

---

### Task 3.7: Integrate Webhook → Frontend State Sync

**Objective:** Connect the Rust webhook events to the frontend Zustand store so Hermes agent events update pet states in real-time.

**Files:**
- Modify: `src/store/petSystem.ts` (add webhook event handler)
- Modify: `src/App.tsx` (listen for Tauri events)
- Modify: `src/components/PetWidget.tsx` (react to state changes)

**Step 1: Add event listener in App.tsx**

```typescript
import { listen } from "@tauri-apps/api/event";

useEffect(() => {
  const unlisten = listen<PetStateEvent>("pet_state_event", (event) => {
    const { profile_name, pet_state, message } = event.payload;
    const store = usePetSystemStore.getState();
    store.setPetState(profile_name, pet_state as PetState);

    // Show bubble for notifications
    if (pet_state === "notification" && message) {
      // Find the widget ref and show bubble
    }
  });

  return () => { unlisten.then((f) => f()); };
}, []);
```

**Step 2: Add PetStateEvent type to pet.ts**

```typescript
export interface PetStateEvent {
  event_type: string;
  profile_name: string;
  pet_state: string;
  message?: string;
}
```

**Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```

**Verification:**
- Build succeeds
- Event listener is registered on mount

---

### Task 3.8: Update Project State and Docs

**Objective:** Update project-state.md, add Phase 3 plan to docs/plans/, commit everything.

**Files:**
- Modify: `/mnt/c/Users/luned/Vault/Encephalon-Mageia/Projects/Personal/DaemonCore/project-state.md`
- Create: `docs/plans/phase-3-ai-integration.md`

**Step 1: Write the plan file**

Save this plan to `docs/plans/phase-3-ai-integration.md`

**Step 2: Update project-state.md**

Update the "Current State" section to reflect Phase 3 progress.

**Step 3: Commit**

```bash
cd /mnt/c/Users/luned/Documents/DaemonCore
git add -A
git commit -m "feat: Phase 3 — webhook server, settings panel, session panel, follow-mouse physics"
git push origin main
```

**Step 4: Commit vault**

```bash
cd /mnt/c/Users/luned/Vault/Encephalon-Mageia
git add -A
git commit -m "docs: add Phase 3 plan for DaemonCore"
git push origin Main
```

**Verification:**
- Both repos pushed successfully
- Plan file exists in docs/plans/

---

### Task 3.9: Phase 3 Review Gate

**Objective:** Comprehensive review of all Phase 3 work before declaring the phase complete.

**Check:**
- [ ] GitHub repo exists and has all commits pushed
- [ ] Webhook server starts with the app (check logs)
- [ ] Settings panel opens, theme/size/sounds changes work
- [ ] Session panel shows active pets
- [ ] Follow-mouse toggle works, pet follows cursor at distance
- [ ] Hermes event → pet state mapping works (test with curl)
- [ ] Full build succeeds (both frontend and Rust)
- [ ] EXE launches on Windows without errors
- [ ] Memory usage still under 50MB
- [ ] No TypeScript errors
- [ ] No Rust compiler warnings
- [ ] project-state.md updated
- [ ] docs/plans/phase-3-ai-integration.md exists

**Verification test:**
```bash
# Test webhook server
curl -X POST http://127.0.0.1:32947/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type":"agent_thinking","profile_name":"test","message":"Analyzing..."}'

# Expected: {"status":"ok","message":"Event agent_thinking processed"}
```

---

## Anti-Patterns (Do NOT)

- **Don't hardcode the webhook port** — use 32947 (not 3000/8080 which may conflict)
- **Don't block the Tauri main thread** — webhook server must run in async runtime
- **Don't forget CORS** — Hermes may send from different origin
- **Don't skip the review gate** — Phase 3 has integration points that need verification
