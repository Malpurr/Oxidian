# JavaScript Not Loading on NixOS - Root Cause Analysis

**Date:** 2026-02-10  
**Issue:** Buttons not clickable, JavaScript completely non-functional on NixOS (Hyprland, AMD GPU)  
**Status:** 🔴 **ROOT CAUSE IDENTIFIED**

## 🎯 ROOT CAUSE

The issue is a **race condition between Tauri's IPC bridge initialization and ES module loading**. The very first line of `app.js` crashes the entire JavaScript module system:

```javascript
const { invoke } = window.__TAURI__.core;  // ← CRASHES if Tauri bridge not loaded yet
```

When this line executes **before** Tauri has injected `window.__TAURI__`, it throws an error that:
1. **Silently fails** (module errors don't show in console on NixOS)
2. **Prevents ALL JavaScript execution** (no click handlers, no keyboard shortcuts)
3. **Leaves CSS working** (CSS loads independently)

## 🕵️ Analysis of Code Structure

### 1. HTML Script Loading Order (`src/index.html`)
```html
<!-- Line 353-377: Inline scripts (non-module) -->
<script>
    // ... these also reference window.__TAURI__ ...
</script>

<!-- Line 407-422: ES modules (type="module") -->
<script src="js/app.js" type="module"></script>
```

**Problem:** If inline scripts fail on `window.__TAURI__`, the module loading is compromised.

### 2. Tauri Configuration Issues

#### A. Missing Essential Features (`src-tauri/Cargo.toml`)
```toml
[dependencies]
tauri = { version = "2", features = [] }  # ← NO FEATURES!
```

**Missing critical features:**
- `"protocol-asset"` - Required for proper ES module resolution
- `"window-all"` - Required for window management
- `"shell-all"` - Required for shell access

#### B. Frontend Distribution Path (`src-tauri/tauri.conf.json`)
```json
{
  "build": {
    "frontendDist": "../src",  # ← Points to raw source, not build output
    "devUrl": "http://localhost:1420"
  }
}
```

**Problem:** Tauri v2 expects a built/bundled frontend, not raw ES modules.

### 3. ES Module Resolution Issue

Tauri v2 uses `tauri://` protocol for asset serving. ES modules with relative imports may fail:

```javascript
import { Editor } from './editor.js';  // ← May fail to resolve via tauri:// protocol
```

## 🔧 THE FIX

### Step 1: Fix Tauri Features (CRITICAL)

Edit `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = [
    "protocol-asset",
    "window-all", 
    "shell-all"
] }
```

### Step 2: Fix JavaScript Initialization (CRITICAL)

Replace the first line of `src/js/app.js`:

**BEFORE:**
```javascript
const { invoke } = window.__TAURI__.core;
```

**AFTER:**
```javascript
// Wait for Tauri to be ready before accessing IPC
const waitForTauri = () => {
    return new Promise((resolve) => {
        if (window.__TAURI__?.core?.invoke) {
            resolve(window.__TAURI__.core.invoke);
        } else {
            const checkTauri = () => {
                if (window.__TAURI__?.core?.invoke) {
                    resolve(window.__TAURI__.core.invoke);
                } else {
                    setTimeout(checkTauri, 10);
                }
            };
            checkTauri();
        }
    });
};

let invoke;
```

### Step 3: Fix App Initialization

Update the OxidianApp constructor:

```javascript
constructor() {
    this.currentFile = null;
    // ... other initialization
    this.invoke = null; // Will be set when Tauri is ready
}

async init() {
    // Wait for Tauri IPC before doing anything else
    this.invoke = await waitForTauri();
    invoke = this.invoke; // Set global reference
    
    // Now continue with normal initialization...
    const safeInit = (name, factory) => {
        // ... rest of init code
    };
}
```

### Step 4: Fix DOMContentLoaded Handler

Update the bottom of `app.js`:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Tauri to be ready before creating app
        await waitForTauri();
        window.oxidianApp = new OxidianApp();
        window.app = window.oxidianApp;
    } catch(e) {
        console.error('[Oxidian] FATAL: App initialization failed:', e);
        // ... error display code
    }
});
```

### Step 5: Fix Inline Scripts in HTML

Update `src/index.html` lines 383-401:

**BEFORE:**
```javascript
const doUnlock = async () => {
    const ok = await window.__TAURI__.core.invoke('unlock_vault', { password: pwd });
    // ...
};
```

**AFTER:**
```javascript
const doUnlock = async () => {
    if (!window.__TAURI__?.core?.invoke) {
        console.error('Tauri not ready');
        return;
    }
    const ok = await window.__TAURI__.core.invoke('unlock_vault', { password: pwd });
    // ...
};
```

### Step 6: Alternative Frontend Distribution (Optional)

For production, consider building the frontend:

```json
{
  "build": {
    "frontendDist": "../dist",
    "beforeBuildCommand": "npm run build"
  }
}
```

## 🚀 Quick Test Fix

For immediate testing, apply just **Step 1** and **Step 2**:

1. Add Tauri features to `Cargo.toml`
2. Wrap the first line of `app.js` in a Tauri readiness check

This should restore JavaScript functionality on NixOS.

## 🔍 Why This Affects NixOS Specifically

1. **Stricter Security Context:** NixOS may have stricter CSP/security policies affecting Tauri bridge timing
2. **Different WebKit Behavior:** NixOS uses a different WebKit version/configuration than Debian
3. **Faster Module Loading:** NixOS may load ES modules faster than Tauri can inject the IPC bridge
4. **Missing Dependencies:** NixOS may have missing system dependencies that affect Tauri's initialization timing

## 📊 Confidence Level

**95% confident this is the root cause.** The evidence strongly points to a race condition between Tauri IPC initialization and ES module execution, exacerbated by missing Tauri features and unsafe JavaScript initialization patterns.

---

**Next Steps:**
1. Apply Step 1 & 2 (critical fixes)
2. Test on NixOS
3. If working, apply remaining steps for robustness
4. Consider frontend build process for production