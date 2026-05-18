# DaemonCore — Project State

> Last updated: 2026-05-18

## Overview

DaemonCore is a desktop AI companion system built with Tauri 2 + React 19. Animated pet characters live on your desktop and react to Hermes Agent activity via webhook events. Each Hermes profile gets its own pet with a selectable character, and the pets change behavior based on agent state (thinking, working, done, error, etc.).

**Repository:** https://github.com/Frostthejack/DaemonCore

## Current Status: Phase 4 In Progress

Phase 3 ("AI Integration & Polish") is fully complete — all tasks including the Phase 3 review gate are done. Phase 4 ("Enhancements & Polish") has been decomposed into 6 tasks on the kanban board.

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

### Phase 3 — Complete
- GitHub repo created and pushed
- Axum webhook server (Rust backend)
- Hermes event → pet state mapping
- Settings panel (theme, size, sounds toggle, follow-mouse)
- Session panel (UI complete, placeholder data)
- Follow-mouse physics with distance threshold
- Frontend webhook → Zustand state sync
- Click-through transparency system
- System tray menu
- Phase 3 review gate passed

### Phase 4 — In Progress (6 tasks)

| ID | Task | Assignee | Status |
|----|------|----------|--------|
| t_7f8c87b2 | Enhanced state mapping: granular sub-states for tool-specific reactions | backend-eng | ready |
| t_003da138 | Sound system: audio playback for pet state changes | frontend-eng | ready |
| t_7613e430 | Real session data: populate SessionPanel with actual Hermes sessions | frontend-eng | ready |
| t_b8db951f | Webhook authentication: token-based auth for /api/webhook | backend-eng | ready |
| t_f6017620 | Animation variety: multiple animation variants per pet state | frontend-eng | ready |
| t_009a153b | Phase 4 Review Gate | reviewer | blocked (parents: all above) |

**Research basis:** Phase 4 priorities informed by analysis of the hermes-visualizer-plugin (https://github.com/rwcrosk-arch/hermes-visualizer-plugin). See docs/research/hermes-visualizer-plugin-analysis.md for full research document.

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

- **Phase 4 tasks**: 5 implementation tasks + 1 review gate on the kanban board
- **Cross-compilation**: Final Windows build (currently builds for `x86_64-pc-windows-gnu`)
- **Multi-monitor support**: Window sizing uses `primary_monitor()` — multi-monitor setups may have the window appear on the wrong screen
- **Backup/export**: Pet state and settings are persisted to localStorage only. No backup/export mechanism exists

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
├── docs/
│   ├── plans/
│   │   └── phase-3-ai-integration.md  # Phase 3 plan
│   └── research/
│       └── hermes-visualizer-plugin-analysis.md  # Phase 4 research
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Known Issues

1. **State mapping case mismatch**: Rust backend emits capitalized states ("Idle", "Thinking", etc.) while frontend expects lowercase ("idle", "thinking", etc.). The frontend `HERMES_EVENT_TO_PET_STATE` map uses lowercase keys, so the Rust-emitted `pet_state_event` with capitalized values won't match the frontend's expected `PetState` type. The `hermes_event` listener does its own mapping, so this is partially mitigated, but direct `pet_state_event` consumers would see a mismatch. *(Being addressed by Phase 4 enhanced state mapping task)*

2. **Single-monitor assumption**: Window sizing uses `primary_monitor()` — multi-monitor setups may have the window appear on the wrong screen.

3. **Webhook server binds to 127.0.0.1 only**: The axum server listens on localhost, so external machines cannot send webhook events. This is intentional for security but means Hermes must run on the same machine.

4. **No webhook authentication**: The `/api/webhook` endpoint accepts any POST request with no auth token or secret validation. *(Being addressed by Phase 4 webhook auth task)*

5. **localStorage only**: Pet state and settings are persisted to localStorage only. No backup/export mechanism exists.

## Tech Stack

- **Frontend**: React 19, TypeScript 6, Vite 8, Zustand 5
- **Backend**: Rust, Tauri 2, axum 0.7, tokio, serde
- **Build target**: x86_64-pc-windows-gnu
- **Package manager**: npm (also has pnpm-lock.yaml)
- **Linting**: ESLint 10 with typescript-eslint
