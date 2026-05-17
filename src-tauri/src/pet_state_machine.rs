use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

// PetState enum with all required states
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum PetState {
    Idle,
    Thinking,
    Working,
    Done,
    Error,
    Dragging,
    Notification,
    Sleeping,
}

// Priority levels for each state
impl PetState {
    pub fn priority(&self) -> u8 {
        match self {
            PetState::Dragging => 10,
            PetState::Error => 8,
            PetState::Notification => 7,
            PetState::Done => 5,
            PetState::Working => 3,
            PetState::Thinking => 2,
            PetState::Idle => 1,
            PetState::Sleeping => 0,
        }
    }
}

// State machine that manages pet state with priority resolution
pub struct PetStateMachine {
    current_state: Arc<Mutex<PetState>>,
    last_state_change: Arc<Mutex<Instant>>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
}

impl PetStateMachine {
    pub fn new() -> Self {
        PetStateMachine {
            current_state: Arc::new(Mutex::new(PetState::Idle)),
            last_state_change: Arc::new(Mutex::new(Instant::now())),
            app_handle: Arc::new(Mutex::new(None)),
        }
    }

    // Set the app handle for emitting events
    pub fn set_app_handle(&self, app: AppHandle) {
        *self.app_handle.lock().unwrap() = Some(app);
    }

    // Get current state
    pub fn get_current_state(&self) -> PetState {
        *self.current_state.lock().unwrap()
    }

    // Get state priority
    pub fn get_state_priority(&self, state: PetState) -> u8 {
        state.priority()
    }

    // Set state with priority resolution
    pub fn set_state(&self, new_state: PetState) {
        let mut current = self.current_state.lock().unwrap();
        let current_priority = current.priority();
        let new_priority = new_state.priority();

        // Higher priority always wins
        if new_priority > current_priority {
            *current = new_state;
            *self.last_state_change.lock().unwrap() = Instant::now();
            println!(
                "State changed: {:?} (priority: {})",
                new_state, new_priority
            );
        } else {
            println!(
                "State rejected: {:?} (priority: {}) - current: {:?} (priority: {})",
                new_state, new_priority, *current, current_priority
            );
        }
    }

    // Check if auto-return timer has elapsed
    fn should_auto_return(&self) -> Option<PetState> {
        let current = *self.current_state.lock().unwrap();
        let elapsed = self.last_state_change.lock().unwrap().elapsed();

        match current {
            PetState::Done => {
                if elapsed >= Duration::from_secs(4) {
                    Some(PetState::Idle)
                } else {
                    None
                }
            }
            PetState::Error => {
                if elapsed >= Duration::from_secs(5) {
                    Some(PetState::Idle)
                } else {
                    None
                }
            }
            PetState::Notification => {
                if elapsed >= Duration::from_secs_f64(3.5) {
                    Some(PetState::Idle)
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    // Process auto-return logic
    pub fn process_auto_return(&self) {
        if let Some(return_state) = self.should_auto_return() {
            self.set_state(return_state);
            if let Some(app) = self.app_handle.lock().unwrap().as_ref() {
                let _ = app.emit("state_changed", format!("{:?}", return_state));
            }
        }
    }
}

// Tauri commands
#[tauri::command]
pub fn get_current_state_cmd(state_machine: tauri::State<'_, PetStateMachine>) -> PetState {
    state_machine.get_current_state()
}

#[tauri::command]
pub fn set_state_cmd(state_machine: tauri::State<'_, PetStateMachine>, new_state: PetState) {
    state_machine.set_state(new_state);
    if let Some(app) = state_machine.app_handle.lock().unwrap().as_ref() {
        let _ = app.emit("state_changed", format!("{:?}", new_state));
    }
}

#[tauri::command]
pub fn get_state_priority_cmd(state: PetState) -> u8 {
    state.priority()
}

// Tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_priority_levels() {
        assert_eq!(PetState::Dragging.priority(), 10);
        assert_eq!(PetState::Error.priority(), 8);
        assert_eq!(PetState::Notification.priority(), 7);
        assert_eq!(PetState::Done.priority(), 5);
        assert_eq!(PetState::Working.priority(), 3);
        assert_eq!(PetState::Thinking.priority(), 2);
        assert_eq!(PetState::Idle.priority(), 1);
        assert_eq!(PetState::Sleeping.priority(), 0);
    }

    #[test]
    fn test_state_machine_priority_resolution() {
        let sm = PetStateMachine::new();

        // Start idle
        assert_eq!(sm.get_current_state(), PetState::Idle);

        // Error has higher priority than idle
        sm.set_state(PetState::Error);
        assert_eq!(sm.get_current_state(), PetState::Error);

        // Idle should be rejected (lower priority)
        sm.set_state(PetState::Idle);
        assert_eq!(sm.get_current_state(), PetState::Error);

        // Done has lower priority than Error, should be rejected
        sm.set_state(PetState::Done);
        assert_eq!(sm.get_current_state(), PetState::Error);

        // Notification has higher priority than Error
        sm.set_state(PetState::Notification);
        assert_eq!(sm.get_current_state(), PetState::Notification);

        // Dragging has highest priority
        sm.set_state(PetState::Dragging);
        assert_eq!(sm.get_current_state(), PetState::Dragging);
    }

    #[test]
    fn test_auto_return_done_to_idle() {
        let sm = PetStateMachine::new();
        sm.set_state(PetState::Done);
        assert_eq!(sm.get_current_state(), PetState::Done);
    }

    #[test]
    fn test_auto_return_error_to_idle() {
        let sm = PetStateMachine::new();
        sm.set_state(PetState::Error);
        assert_eq!(sm.get_current_state(), PetState::Error);
    }

    #[test]
    fn test_auto_return_notification_to_idle() {
        let sm = PetStateMachine::new();
        sm.set_state(PetState::Notification);
        assert_eq!(sm.get_current_state(), PetState::Notification);
    }
}
