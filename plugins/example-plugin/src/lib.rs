//! Example Oxidian Plugin — Word Count
//! 
//! This plugin demonstrates the WASM plugin interface.
//! It appends a word count footer to rendered HTML.
//! 
//! Build with: cargo build --target wasm32-unknown-unknown --release

/// Called when the plugin is loaded
#[no_mangle]
pub extern "C" fn on_load() {
    // Plugin initialization
}

/// Called when the plugin is unloaded
#[no_mangle]
pub extern "C" fn on_unload() {
    // Cleanup
}

/// Returns the plugin name (as a pointer to a static string)
#[no_mangle]
pub extern "C" fn plugin_name() -> *const u8 {
    b"Word Count\0".as_ptr()
}

/// Returns the plugin version
#[no_mangle]
pub extern "C" fn plugin_version() -> *const u8 {
    b"0.1.0\0".as_ptr()
}

/// Process rendered HTML — add a word count footer
/// In a real implementation, this would use shared memory to exchange strings
/// For now, this demonstrates the function signature pattern
#[no_mangle]
pub extern "C" fn on_render(html_ptr: *const u8, html_len: u32) -> u64 {
    // In a real WASM plugin, we would:
    // 1. Read the HTML string from shared memory
    // 2. Count words by stripping HTML tags
    // 3. Append a footer div with the count
    // 4. Write the result back to shared memory
    // 5. Return a pointer+length packed into u64
    
    // This is a stub that returns 0 (no modification)
    0
}

/// Process note content on open
#[no_mangle]
pub extern "C" fn on_note_open(path_ptr: *const u8, path_len: u32, 
                                content_ptr: *const u8, content_len: u32) -> u64 {
    0 // No modification
}

/// Process note content on save
#[no_mangle]
pub extern "C" fn on_note_save(path_ptr: *const u8, path_len: u32,
                                content_ptr: *const u8, content_len: u32) -> u64 {
    0 // No modification
}
