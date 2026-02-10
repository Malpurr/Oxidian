pub mod core_cmds;
pub mod feature_cmds;
pub mod plugin_cmds;

// Re-export all commands for easy registration in main.rs
pub use core_cmds::*;
pub use feature_cmds::*;
pub use plugin_cmds::*;
