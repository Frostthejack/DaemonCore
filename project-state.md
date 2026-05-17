# DaemonCore — Project State

> Last updated: 2026-05-17

## Overview

DaemonCore is a desktop AI companion system built with Tauri 2 + React 19. Animated pet characters live on your desktop and react to Hermes Agent activity via webhook events. Each Hermes profile gets its own pet with a selectable character, and the pets change behavior based on agent state (thinking, working, done, error, etc.).

**Repository:** https://github.com/Frostthejack/DaemonCore

## Current Status: Phase 3 In Progress

Phase 3 ("AI Integration & Polish") is largely complete. The webhook server, settings panel, session panel, follow-mouse physics, and frontend webhook integration are all implemented and pushed to GitHub. The remaining work is the Phase 3 review gate (T3.9).

### Phase 1 — Complete
- Scaffolded Tauri 2 + React + TypeScript app
- Basic pet rendering with SVG characters
- Eye tracking (cursor-follow) system

### Phase 2 — Complete
- Multi-character system with 6 characters (Owl, Brain, Terminal, Magnifier, Paw, Pixie)
- Character selector per profile
- Cross-fade transitions between characters
- Priority state machine for pet behaviors
- Zustand store with localStorage persistence

### Phase 3 — In Progress (8/9 tasks done)

| Task | Description | Status |
|------|-------------|--------|
| T3.1 | Create GitHub repo and push | Done |
| T3.2 | Add axum webhook server (Rust) | Done |
| T3.3 | Map Hermes events to pet states | Done |
| T3.4 | Create settings panel component | Done |
| T3.5 | Create session panel component | Done |
| T3.6 | Implement follow-mouse physics | Done |
| T3.7 | Integrate webhook to frontend state sync | Done |
| T3.8 | Update project-state.md and docs | In Progress (this file) |
| T3.9 | Phase 3 Review Gate | Pending |

## Architecture

### Frontend (React 19 + TypeScript + Zustand)
- `src/App.tsx` — Main app, webhook event listener, character selector, pet manager
- `src/components/PetWidget.tsx` — Individual pet widget with SVG rendering
- `src/components/SettingsPanel.tsx` — Theme/size/sounds settings modal
- `src/components/SessionPanel.tsx` — Active Hermes sessions panel
- `src/components/characters/` — 7 character SVG renderers (Owl, Brain, Terminal, Magnifier, Paw, Pixie)
- `src/hooks/useAppConfig.ts` — App config store (theme, size, sounds), tray event listener, click-through logic
- `src/hooks/usePetMovement.ts` — Pet movement: wandering, follow-mouse, drag, animation loop
- `src/store/petSystem.ts` — Zustand store: pet lifecycle, profile→character mapping, state management
- `src/types/pet.ts` — Type definitions: PetName, PetState, PetInstance, CharacterDef, CHARACTER_REGISTRY

### Backend (Rust + Tauri 2)
- `src-tauri/src/lib.rs` — Main Tauri app: webhook server (axum on port 32947), system tray, window setup, mouse position commands
- `src-tauri/src/pet_state_machine.rs` — Pet state machine logic
- `src-tauri/Cargo.toml` — Dependencies: tauri, axum, tokio, serde, tower-http, uuid

### Event Flow
```
Hermes Agent → POST /api/webhook → Rust axum server → Tauri event emit → React listener → Zustand store → PetWidget re-render
```

## What's Implemented

- **Webhook server**: In-process axum HTTP server on `127.0.0.1:32947` receives Hermes webhook events
- **Event mapping**: Hermes event types (agent_start, agent_thinking, agent_working, agent_done, agent_error, agent_notification, agent_sleep) mapped to pet states
- **6 characters**: Owl (default), Brain, Terminal, Magnifier, Paw, Pixie — each with cartoon or abstract SVG art
- **Character selector**: Per-profile character assignment with dropdown
- **Settings panel**: Theme (midnight/peach/cloud/moss), pet size (small/medium/large), sounds toggle, follow-mouse toggle + distance slider
- **Session panel**: Shows active Hermes sessions with per-session pet controls
- **Follow-mouse physics**: Pet wanders toward cursor but maintains minimum distance, with smooth lerp
- **Wandering**: Random destination picking with easing, pause intervals, 60fps animation loop
- **Drag & drop**: Click and drag pets to reposition
- **Click-through**: Canvas alpha check — clicks pass through transparent areas, hit on opaque pet pixels
- **System tray**: Show/hide pet, sounds toggle, quit
- **State persistence**: Profile→character mapping and settings saved to localStorage
- **Priority state machine**: Dragging > Error > Notification > Done > Working > Thinking > Idle > Sleeping

## What's Pending

- **T3.9 Phase 3 Review Gate**: Full review of all Phase 3 work before considering it done
- **Cross-compilation**: Final Windows build (currently builds for `x86_64-pc-windows-gnu`)
- **Sound system**: Sounds toggle exists in UI but no actual audio playback is implemented
- **Session panel population**: Session panel shows active pets but doesn't yet receive real session data from Hermes (placeholder implementation)

## Build Instructions

### Prerequisites
- Node.js (v18+)
- Rust toolchain with `x86_64-pc-windows-gnu` target
- Tauri CLI: `npm install -g @tauri-apps/cli`

### Frontend Development
```bash
cd /mnt/c/Users/luned/Documents/Projects/DaemonCore
npm install
npm run dev          # Vite dev server with HMR
npm run build        # Production build
npm run lint         # ESLint
```

### Full Tauri Development
```bash
cd /mnt/c/Users/luned/Documents/Projects/DaemonCore
npm run tauri dev    # Runs Tauri app with hot reload
```

### Production Build (Windows)
```bash
cd /mnt/c/Users/luned/Documents/Projects/DaemonCore/src-tauri
cargo build --target x86_64-pc-windows-gnu --release
```

### Project Structure
```
DaemonCore/
├── src/                      # React frontend
│   ├── App.tsx               # Main app component
│   ├── App.css               # Global styles (628 lines)
│   ├── components/
│   │   ├── characters/       # 7 SVG character renderers
│   │   ├── PetWidget.tsx     # Pet widget component
│   │   ├── SessionPanel.tsx  # Session panel
│   │   └── SettingsPanel.tsx # Settings panel
│   ├── hooks/
│   │   ├── useAppConfig.ts   # App config store + click-through
│   │   └── usePetMovement.ts # Pet movement/animation
│   ├── store/
│   │   └── petSystem.ts      # Zustand pet store
│   └── types/
│       └── pet.ts            # Type definitions
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── lib.rs            # Tauri app + webhook server
│   │   ├── main.rs           # Entry point
│   │   └── pet_state_machine.rs
│   ├── Cargo.toml            # Rust dependencies
│   └── capabilities/         # Tauri capabilities
├── docs/plans/
│   └── phase-3-ai-integration.md  # Phase 3 plan
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Known Issues

1. **State mapping case mismatch**: Rust backend emits capitalized states ("Idle", "Thinking", etc.) while frontend expects lowercase ("idle", "thinking", etc.). The frontend `HERMES_EVENT_TO_PET_STATE` map uses lowercase keys, so the Rust-emitted `pet_state_event` with capitalized values won't match the frontend's expected `PetState` type. The `hermes_event` listener does its own mapping, so this is partially mitigated, but direct `pet_state_event` consumers would see a mismatch.

2. **Session panel uses placeholder data**: The SessionPanel derives sessions from active pets rather than from actual Hermes session data. Real session tracking would require the webhook to emit session lifecycle events.

3. **No sound implementation**: The sounds toggle and `isSoundsEnabled` state exist but no audio files or playback logic have been added.

4. **Single-monitor assumption**: Window sizing uses `primary_monitor()` — multi-monitor setups may have the window appear on the wrong screen.

5. **Webhook server binds to 127.0.0.1 only**: The axum server listens on localhost, so external machines cannot send webhook events. This is intentional for security but means Hermes must run on the same machine.

6. **No webhook authentication**: The `/api/webhook` endpoint accepts any POST request with no auth token or secret validation.

7. **localStorage only**: Pet state and settings are persisted to localStorage only. No backup/export mechanism exists.

## Tech Stack

- **Frontend**: React 19, TypeScript 6, Vite 8, Zustand 5
- **Backend**: Rust, Tauri 2, axum 0.7, tokio, serde
- **Build target**: x86_64-pc-windows-gnu
- **Package manager**: npm (also has pnpm-lock.yaml)
- **Linting**: ESLint 10 with typescript-eslint
