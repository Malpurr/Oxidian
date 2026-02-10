# Oxidian Tester 5: Rust-Side WebView Configuration Analysis

## Problem
JavaScript wird in Oxidian (Tauri v2) nicht ausgeführt.

## Analysis Results (2026-02-10)

### 🚨 Critical Issue Found: Build Configuration Mismatch

**Root Cause:** Cargo build is failing due to a feature mismatch:

```
The `tauri` dependency features on the `Cargo.toml` file does not match the allowlist defined under `tauri.conf.json`.
Please run `tauri dev` or `tauri build` or remove the `protocol-asset` feature.
```

**Impact:** This build error prevents the application from running properly, which could leave the WebView in an uninitialized state where JavaScript execution is disabled.

### Code Analysis

#### 1. Tauri Builder Configuration (`main.rs`)

The builder configuration appears correct:
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .manage(state)
    .invoke_handler(tauri::generate_handler![
        // ... extensive command list
    ])
    .setup(|app| {
        let window = app.get_webview_window("main").unwrap();
        window.set_title("Oxidian").ok();
        Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

#### 2. Potential Panic Sources

**High Risk:**
- `app.get_webview_window("main").unwrap()` in setup - if the main window doesn't exist, this will panic
- `SearchIndex::new(&vault_path).expect("Failed to initialize search index")`
- `std::fs::create_dir_all(&vault_path).expect("Failed to create vault directory")`

**Medium Risk:**
- Multiple `.unwrap()` calls in command functions could crash the invoke handler

#### 3. WebView Configuration Analysis

**tauri.conf.json:**
```json
{
  "app": {
    "windows": [
      {
        "title": "Oxidian",
        "width": 1200,
        "height": 800,
        // ... basic window config, no WebView restrictions
      }
    ],
    "withGlobalTauri": true  // ✅ This enables global Tauri API access
  }
}
```

**No JavaScript-disabling configurations found:**
- No `webview.javascriptEnabled: false`
- No CSP restrictions that would block JS
- No initialization scripts that could interfere
- No explicit WebView builder customizations

#### 4. Cargo.toml vs tauri.conf.json Mismatch

**Cargo.toml:**
```toml
tauri = { version = "2", features = ["protocol-asset"] }
```

**Issue:** The `protocol-asset` feature is enabled in Cargo.toml but not allowed in the tauri.conf.json allowlist, causing build failures.

#### 5. Command Registration

All 80+ commands are properly registered with `#[tauri::command]` attributes and included in `generate_handler![]`. No compilation errors found in command definitions (beyond the feature mismatch).

### Web Search Insights

Found relevant issues:
1. **Setup Panics**: GitHub discussion shows that panics in the `.setup()` closure can leave the WebView in a broken state
2. **State Management**: If `app.manage()` calls panic, the entire builder can fail
3. **WebView Debugging**: Right-click → "Inspect Element" should work if WebView is properly initialized

### Recommendations

#### 🔧 Immediate Fixes

1. **Fix Build Configuration:**
   ```bash
   # Option A: Remove the feature
   # Edit Cargo.toml: tauri = { version = "2" }
   
   # Option B: Add to tauri.conf.json allowlist
   # Add proper allowlist configuration
   ```

2. **Improve Error Handling in Setup:**
   ```rust
   .setup(|app| {
       if let Some(window) = app.get_webview_window("main") {
           window.set_title("Oxidian").ok();
       } else {
           log::error!("Main window not found during setup");
       }
       Ok(())
   })
   ```

3. **Add Startup Error Handling:**
   ```rust
   let search_index = match SearchIndex::new(&vault_path) {
       Ok(idx) => idx,
       Err(e) => {
           log::error!("Failed to initialize search index: {}", e);
           // Return default or handle gracefully
       }
   };
   ```

#### 🧪 Testing Steps

1. Fix the build configuration mismatch first
2. Run `cargo check` to verify compilation
3. Test with `RUST_BACKTRACE=1` to catch any remaining panics
4. Use browser dev tools (F12) to check if JavaScript is executing
5. Verify `window.__TAURI__` object is available in console

### Conclusion

**Primary Issue:** Build configuration mismatch preventing proper application startup.

**Secondary Issues:** Unsafe `.unwrap()` calls in critical paths that could panic and corrupt WebView state.

**JavaScript Execution:** No explicit JavaScript-disabling code found, but build failures could prevent proper WebView initialization.

The WebView configuration itself appears correct - the issue is likely in the build process preventing the application from starting properly, which leaves the WebView in an uninitialized state where JavaScript cannot execute.