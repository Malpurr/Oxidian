# Oxidian Tauri v2 vs v1 Migration Analysis Report

**Date:** 2026-02-10  
**Issue:** JavaScript wird in Oxidian (Tauri v2) nicht ausgeführt  
**Focus:** Tauri v1/v2 Migration Check and invoke_handler Analysis

## 1. Dependencies Analysis

### Current Tauri Configuration
- **Tauri Version:** v2 (confirmed in Cargo.toml)
- **Core Dependencies:** All correctly updated to v2
  - `tauri = { version = "2", features = ["protocol-asset"] }`
  - `tauri-plugin-dialog = "2"`
  - `tauri-plugin-fs = "2"`
  - `tauri-plugin-shell = "2"`
  - `tauri-build = { version = "2", features = [] }`

✅ **Status:** Dependencies are properly migrated to Tauri v2.

## 2. Main.rs Structure Analysis

### Builder Pattern Check
The project uses `tauri::Builder::default()` which is the correct v2 syntax. Key observations:

- ✅ Proper plugin initialization (dialog, fs, shell)
- ✅ State management correctly implemented
- ✅ Setup closure properly configured with webview window title setting

### Critical Issue Found: Project Structure Mismatch

🚨 **MAJOR PROBLEM:** The project structure does NOT match Tauri v2 requirements:

#### Current Structure:
```
src-tauri/
├── src/
│   ├── main.rs  ← Entry point
│   └── lib.rs   ← Module declarations only
```

#### Required v2 Structure:
According to migration guide, for Tauri v2:
1. `src/main.rs` should be renamed to `src/lib.rs` 
2. The main function should be renamed to `run()` with `#[cfg_attr(mobile, tauri::mobile_entry_point)]`
3. A new `main.rs` should be created that calls `app_lib::run()`

**Current lib.rs content:**
```rust
pub mod engine;
pub mod features;
// ... other modules only
```

**Expected lib.rs content should include the entire main() logic**

## 3. invoke_handler Registration Analysis

The `invoke_handler` is correctly registered with a comprehensive list of commands:

```rust
.invoke_handler(tauri::generate_handler![
    // 80+ commands properly registered across:
    // - Core CRUD operations
    // - Settings management  
    // - Encryption features
    // - Search functionality
    // - Plugin system
    // - Remember (spaced repetition)
])
```

✅ **Status:** invoke_handler registration appears complete and syntactically correct.

## 4. Setup Function Analysis

The setup function includes proper window configuration:
```rust
.setup(|app| {
    let window = app.get_webview_window("main").unwrap();
    window.set_title("Oxidian").ok();
    Ok(())
})
```

⚠️ **Potential Issue:** Using `.unwrap()` could cause panic if "main" window doesn't exist, preventing WebView initialization.

## 5. Web Research Findings

Key findings from Tauri v2 migration documentation:

### Critical Migration Requirements:
1. **Mobile Support Structure:** Tauri v2 requires library crate structure even for desktop-only apps
2. **Window API Changes:** `Window` renamed to `WebviewWindow`, `get_window()` renamed to `get_webview_window()`  
3. **JavaScript API Changes:** `@tauri-apps/api/window` moved to `@tauri-apps/api/webviewWindow`

### Common v2 JavaScript Execution Issues:
- Incorrect project structure preventing proper initialization
- Missing mobile entry point configuration
- WebView window reference failures during setup

## 6. Root Cause Analysis

**Primary Issue:** Project structure is not fully migrated to Tauri v2 requirements.

The current setup has:
- ✅ Updated dependencies
- ✅ Correct API usage in Rust code
- ❌ **INCORRECT project structure** - missing mobile-compatible entry point

This structural mismatch likely prevents proper WebView initialization, causing JavaScript execution to fail.

## 7. Recommended Fix

### Step 1: Restructure Entry Points
1. Move current `main.rs` content to `lib.rs`
2. Change function signature:
   ```rust
   #[cfg_attr(mobile, tauri::mobile_entry_point)]
   pub fn run() {
       // current main() content
   }
   ```
3. Create new `main.rs`:
   ```rust
   #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
   
   fn main() {
       oxidian::run();
   }
   ```

### Step 2: Add Cargo.toml Library Configuration
```toml
[lib]
name = "oxidian"
crate-type = ["staticlib", "cdylib", "rlib"]
```

### Step 3: Improve Setup Error Handling
Replace `.unwrap()` with proper error handling:
```rust
.setup(|app| {
    if let Some(window) = app.get_webview_window("main") {
        window.set_title("Oxidian").ok();
    }
    Ok(())
})
```

## 8. Risk Assessment

**High Risk:** The current structure may work partially but could fail unpredictably, especially:
- During mobile compilation attempts
- With certain WebView initialization timing
- When Tauri runtime expects proper mobile entry points

## 9. Conclusion

The JavaScript execution issue is likely caused by **incomplete Tauri v2 migration** - specifically the project structure. While dependencies and API usage are correct, the missing mobile-compatible entry point structure prevents proper WebView initialization.

**Confidence Level:** High - this matches documented v2 migration requirements and explains the JavaScript execution failure.

**Next Steps:**
1. Implement structural changes (Steps 1-3)
2. Test JavaScript execution
3. Monitor for setup-related panics in logs