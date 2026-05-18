# Hermes Visualizer Plugin — Research Analysis

> **Date:** 2026-05-18
> **Source:** https://github.com/rwcrosk-arch/hermes-visualizer-plugin
> **Researcher:** OWL (orchestrator)
> **Kanban Task:** t_18d24af9

---

## 1. What It Is

A **terminal-based visual plugin** for Hermes Agent that displays looping catgirl animations reacting to agent tool calls in real time. It consists of two components:

1. **Hermes Plugin** — hooks into Hermes Agent's plugin system (`post_tool_call`, `on_session_start`, `on_session_end`)
2. **Visualizer Daemon** — a standalone Python daemon that reads events from a named pipe and renders GIF animations via `chafa` in a separate terminal window

**License:** MIT  
**Language:** Python 83%, Shell 17%  
**Version:** v1.0.0 (Apr 21, 2026)

---

## 2. Architecture

```
┌─────────────────────────────────┐
│      Hermes Agent Process       │
│  ┌───────────────────────────┐  │
│  │  Plugin: visualizer       │  │
│  │  ┌─────────────────────┐  │  │
│  │  │ post_tool_call hook │──┼──┼──→ mood from tool name
│  │  │ on_session_start    │──┼──┼──→ happy
│  │  │ on_session_end      │──┼──┼──→ sleeping
│  │  └─────────────────────┘  │  │
│  │           ↓               │  │
│  │   JSON to events.pipe     │  │
│  └───────────────────────────┘  │
│           │                     │
│  ┌────────┴────────┐            │
│  │  events.pipe    │  (FIFO)    │
│  └────────┬────────┘            │
└───────────│─────────────────────┘
            ↓
┌─────────────────────────────────┐
│   Visualizer Daemon Terminal    │
│  ┌─────────────────────────┐    │
│  │ daemon.py               │    │
│  │  ├─ reads pipe (O_RDWR) │    │
│  │  ├─ picks animation     │    │
│  │  ├─ loops chafa GIF     │    │
│  │  └─ clear + ANSI status │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Key Technical Details

- **IPC Mechanism:** Named pipe (FIFO) at `~/.hermes/plugins/visualizer/events.pipe`
- **Event Format:** JSON lines written to the pipe: `{"mood": "happy", "message": "..."}`
- **Rendering:** `chafa` terminal image renderer for GIF display; ANSI ASCII fallback
- **Animation Cycling:** Daemon continuously loops current mood's GIF until new event arrives
- **Mood Library:** 8 moods × 3 GIFs each = 24 GIFs + ANSI fallbacks
- **Zero Core Modifications:** Pure Hermes plugin — no patches to agent itself

---

## 3. Mood Mapping

### 3.1 Tool-to-Mood Mapping (TOOL_MOOD_MAP)

| Tool | Mood |
|------|------|
| `web_search`, `web_search_replica`, `web_extract` | curious |
| `terminal` | working |
| `execute_code` | thinking |
| `read_file` | curious |
| `write_file` | happy |
| `patch` | working |
| `image_generate` | excited |
| `vision_analyze` | thinking |
| `browser_navigate` | curious |
| `browser_click` | working |
| `mixture_of_agents` | thinking |
| `skills_list` | curious |
| `todo` | working |
| `memory` | thinking |
| `session_search` | thinking |
| `delegate_task` | working |
| `clarify` | surprised |
| `text_to_speech` | excited |
| `send_message` | happy |

### 3.2 Keyword-Based Fallback Detection (MOOD_KEYWORDS)

When no tool match is found, the daemon scans `tool + message` text against keyword lists:

| Mood | Keywords |
|------|----------|
| happy | "success", "completed", "done", "finished", "saved", "created" |
| curious | "search", "extract", "browse", "find", "look", "query" |
| working | "terminal", "execute", "run", "build", "install", "compile" |
| thinking | "reason", "analyze", "plan", "think", "consider", "evaluate" |
| sad | "error", "fail", "missing", "denied", "refused", "broken" |
| excited | "image_generate", "create", "discover", "amazing", "awesome" |
| sleeping | "idle", "wait", "sleep", "pause", "timeout" |
| surprised | "unexpected", "surprise", "whoa", "wow" |

### 3.3 Mood Determination Priority

1. Explicit `"mood"` field in event JSON → use it directly
2. Tool name matches `TOOL_MOOD_MAP` → use mapped mood
3. Keyword scan of `tool + text` against `MOOD_KEYWORDS`
4. Result text contains "error" → `"sad"`
5. Fallback → `"happy"` (DEFAULT_MOOD)

### 3.4 Session Lifecycle Hooks

| Hook | Mood |
|------|------|
| `on_session_start` | 🌸 `happy` |
| `on_session_end` | 💤 `sleeping` |
| `post_tool_call` | (determined by tool name + keywords) |

---

## 4. Relevance to DaemonCore

### 4.1 DaemonCore's Current Architecture

DaemonCore already has a complete event-driven pet system:

```
Hermes Agent → POST /api/webhook → Rust axum server (port 32947) → Tauri event emit → React listener → Zustand store → PetWidget re-render
```

- **6 characters** with SVG art (Owl, Brain, Terminal, Magnifier, Paw, Pixie)
- **Priority state machine:** Dragging > Error > Notification > Done > Working > Thinking > Idle > Sleeping
- **Webhook server** on `127.0.0.1:32947`
- **State persistence** via Zustand + localStorage

### 4.2 Comparison

| Aspect | Visualizer Plugin | DaemonCore |
|--------|-------------------|------------|
| **Display** | Terminal (chafa GIF) | Desktop window (Tauri + SVG) |
| **Event Source** | Hermes plugin hooks | Webhook HTTP POST |
| **IPC** | Named pipe (FIFO) | Tauri events (in-process) |
| **Mood Detection** | Tool name mapping | Hermes event type mapping |
| **Moods/States** | 8 catgirl moods | 8 priority states |
| **Characters** | Catgirl GIFs | 6 SVG characters |
| **Platform** | Terminal (cross-platform) | Desktop (Windows via Tauri) |
| **Fallback** | ANSI ASCII | SVG (vector, always works) |

### 4.3 DaemonCore ↔ Visualizer: State Mapping Side-by-Side

This is the most actionable comparison. Both systems map Hermes activity to pet states, but at different granularity levels:

**DaemonCore's current mapping** (from `lib.rs` `map_event_to_pet_state`):
```
agent_start        → Idle
agent_thinking     → Thinking
agent_working      → Working
agent_done         → Done
agent_error        → Error
agent_notification → Notification
agent_sleep        → Sleeping
```

**Visualizer's mapping** (from `daemon.py` `TOOL_MOOD_MAP` + `MOOD_KEYWORDS`):
```
web_search/read_file/browser_navigate → curious (no DaemonCore equivalent)
terminal/patch/browser_click/todo      → working (maps to DaemonCore Working)
execute_code/memory/session_search     → thinking (maps to DaemonCore Thinking)
write_file/send_message               → happy (no DaemonCore equivalent)
image_generate/text_to_speech         → excited (no DaemonCore equivalent)
clarify                               → surprised (no DaemonCore equivalent)
errors in result text                 → sad (maps to DaemonCore Error)
session_start                         → happy (maps to DaemonCore Idle)
session_end                           → sleeping (maps to DaemonCore Sleeping)
```

**Key insight:** The visualizer has 3 moods that DaemonCore lacks entirely: `curious`, `happy`, and `excited`. These could be added as new PetStates or as sub-states within existing states to provide more visual variety.

### 4.4 DaemonCore Gaps This Research Reveals

From comparing the two codebases, the visualizer plugin highlights these DaemonCore gaps:

1. **No `curious` state** — Searching/reading is the most common Hermes activity but DaemonCore shows the same `working` or `thinking` state for it
2. **No `excited` state** — Image/audio generation is a distinct, joyful activity that deserves its own animation
3. **No keyword-based fallback** — DaemonCore relies entirely on explicit webhook event types; if Hermes sends an unexpected event, the pet doesn't react. The visualizer's keyword scanning provides resilience
4. **No multi-animation cycling** — DaemonCore has one animation per state; the visualizer's 3-GIF-per-mood pattern makes the character feel more alive
5. **No text-based error detection** — DaemonCore needs an explicit `agent_error` event; the visualizer auto-detects errors from result text

### 4.5 Integration Opportunities

**A) Mood Detection Logic → Enhance DaemonCore's State Mapping**

The visualizer plugin's mood-to-tool mapping is **more granular** than DaemonCore's current Hermes event mapping. DaemonCore currently maps Hermes webhook event types (agent_start, agent_thinking, agent_working, agent_done, agent_error, agent_sleep) to pet states. The visualizer adds nuance:

- `curious` for search/read operations
- `excited` for image/audio generation
- `surprised` for clarification questions
- `sad` for errors (DaemonCore already has this)

**This could enhance DaemonCore's state machine** by adding more granular sub-states within the existing priority framework. For example, within the "working" state, you could have different animations for terminal work vs. coding vs. searching.

**B) Terminal Companion Mode**

The visualizer could run **alongside** DaemonCore as a terminal companion — the desktop pet shows the main animation while a terminal window shows a secondary visualization. This would require:

1. DaemonCore's webhook server to also write to a named pipe
2. Running the visualizer daemon in a terminal window

**C) Plugin-Based Event Source for DaemonCore**

Instead of (or in addition to) the webhook server, DaemonCore could consume events from the Hermes plugin system directly. This would mean:

- Installing the visualizer plugin (or a DaemonCore-specific plugin)
- The plugin writes to a named pipe
- DaemonCore's Rust backend reads from the pipe
- This provides **tighter integration** with Hermes than the webhook approach

**D) Mood Library for DaemonCore Animations**

The visualizer's concept of multiple animations per mood (3 GIFs per mood) could inspire DaemonCore to have **multiple animation variants per state** — e.g., different "thinking" animations that cycle randomly.

---

## 5. Recommendations

### 5.1 What Would Help Finish DaemonCore

**Directly helpful:**

1. **Enhanced state mapping** — The visualizer's granular mood detection (curious, excited, surprised) could be added to DaemonCore's webhook event handler to provide more nuanced pet reactions. This is the **highest-value integration point**.

2. **Multiple animations per state** — The visualizer's pattern of 3 GIFs per mood is a good model for DaemonCore to add animation variety (e.g., 2-3 different "thinking" SVG animations that cycle).

3. **Error detection from result text** — The visualizer auto-detects errors from result text. DaemonCore currently relies on explicit `agent_error` webhook events. Adding text-based error detection as a fallback would make DaemonCore more resilient.

**Not directly helpful:**

- The terminal GIF rendering (chafa) is not applicable to DaemonCore's desktop SVG approach
- The named pipe IPC is redundant with DaemonCore's existing Tauri event system
- The catgirl art style doesn't match DaemonCore's existing character designs

### 5.2 Suggested Next Steps for DaemonCore

Based on this research and the current project state (Phase 3 complete, all kanban tasks done), here's what I'd recommend for moving forward:

**Phase 4 Candidates:**

1. **Enhanced State Mapping** — Add granular sub-states to DaemonCore's state machine inspired by the visualizer's mood detection. Map specific tool categories to distinct pet animations within the existing priority framework.

2. **Sound System** — The sounds toggle exists in UI but no audio playback is implemented. This is a known gap from the current project state.

3. **Real Session Data** — The session panel currently uses placeholder data. Integrating actual Hermes session lifecycle events would make it functional.

4. **Webhook Authentication** — The `/api/webhook` endpoint currently accepts any POST request. Adding token-based auth would be important for any real deployment.

5. **Animation Variety** — Add multiple animation variants per state (inspired by the visualizer's 3-GIF-per-mood pattern) to make the pet feel more alive.

6. **Cross-compilation & Distribution** — Final Windows build, installer, auto-update mechanism.

---

## 6. Conclusion

The hermes-visualizer-plugin is **architecturally complementary** to DaemonCore but not directly integrable. Its value to DaemonCore is primarily as a **reference for mood/state detection patterns** and the concept of multiple animations per state. The core rendering approach (terminal GIFs via chafa) serves a different use case than DaemonCore's desktop SVG pets.

**Bottom line:** Borrow the mood detection logic and multi-animation pattern. Skip the terminal rendering and named pipe IPC. DaemonCore's existing webhook + Tauri event architecture is more robust for the desktop pet use case.

---

*Research compiled by OWL, 2026-05-18. Kanban task: t_18d24af9.*
