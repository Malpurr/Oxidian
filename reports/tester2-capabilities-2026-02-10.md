# Tauri v2 Capabilities/Permissions Audit Report

**Date:** 2026-02-10  
**Issue:** JavaScript wird in Oxidian (Tauri v2) nicht ausgeführt. Selbst inline `<script>` tags tun nichts.  
**Root Cause:** Missing Content Security Policy (CSP) configuration

## Findings

### 1. Capabilities Structure ✅

**Status:** `default.json` existiert und ist korrekt strukturiert

**Location:** `/root/.openclaw/workspace/oxidian/src-tauri/capabilities/default.json`

```json
{
  "identifier": "default",
  "description": "Default capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "fs:default",
    "shell:default"
  ]
}
```

**Assessment:** Die Capabilities sind korrekt definiert und enthalten die notwendigen Core-Permissions.

### 2. Generated Files Structure ✅

**Location:** `/root/.openclaw/workspace/oxidian/src-tauri/gen/`

```
gen/
├── schemas/
│   ├── acl-manifests.json (139KB)
│   ├── capabilities.json (200B)
│   ├── desktop-schema.json (407KB)
│   └── linux-schema.json (407KB)
```

**Assessment:** Alle notwendigen Schema-Dateien sind vorhanden und wurden korrekt generiert.

### 3. Cargo.toml Analysis ❌ PROBLEM FOUND

**Current Features:**
```toml
[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

**Missing:** Das `"devtools"` Feature ist NICHT aktiviert, aber das ist nicht die Hauptursache des Problems.

### 4. Tauri Configuration Analysis 🚨 MAJOR PROBLEM

**Current `tauri.conf.json`:**
```json
{
  "productName": "Oxidian",
  "version": "2.0.0",
  "identifier": "com.oxidian.app",
  "build": {
    "frontendDist": "../src",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "",
    "beforeBuildCommand": ""
  },
  "app": {
    "windows": [...],
    "withGlobalTauri": true
  },
  "plugins": {...}
}
```

**CRITICAL MISSING:** Keine CSP (Content Security Policy) Konfiguration in `app.security.csp`!

### 5. JavaScript Code Analysis ✅

**Found Scripts in `index.html`:**
- 2 inline `<script>` blocks (Lines 311-346 und 348-383)
- 17 external JS modules loaded as `type="module"`

**Problem:** Inline Scripts werden blockiert ohne CSP-Erlaubnis.

## Root Cause Analysis

### Tauri v2 CSP Protection

Tauri v2 hat standardmäßig eine **restriktive Content Security Policy**, die:
- Inline JavaScript blockiert (ohne entsprechende CSP-Direktiven)
- Nur Hashes/Nonces für erlaubte Scripts zulässt
- External Scripts nur von vertrauenswürdigen Quellen erlaubt

**Ohne CSP-Konfiguration = Totales JavaScript-Blocking**

### Vergleich mit offizieller Tauri v2 API Example

**Offizielle Working Configuration:**
```json
{
  "app": {
    "security": {
      "csp": {
        "default-src": "'self' customprotocol: asset:",
        "connect-src": "ipc: http://ipc.localhost",
        "font-src": ["https://fonts.gstatic.com"],
        "img-src": "'self' asset: http://asset.localhost blob: data:",
        "style-src": "'unsafe-inline' 'self' https://fonts.googleapis.com"
      }
    }
  }
}
```

**Oxidian Missing:** Die gesamte `app.security.csp` Sektion!

## Solution Recommendations

### 1. 🚨 PRIORITY 1: Add CSP Configuration

Add to `src-tauri/tauri.conf.json`:

```json
{
  "app": {
    "security": {
      "csp": {
        "default-src": "'self' customprotocol: asset:",
        "connect-src": "ipc: http://ipc.localhost",
        "script-src": "'self' 'unsafe-inline'",
        "style-src": "'unsafe-inline' 'self'",
        "img-src": "'self' asset: http://asset.localhost blob: data:"
      }
    },
    "windows": [...],
    "withGlobalTauri": true
  }
}
```

**Note:** `'unsafe-inline'` für `script-src` ist notwendig für die inline `<script>` blocks.

### 2. Optional: Add DevTools Feature

Add to `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset", "devtools"] }

[features]
default = ["custom-protocol", "devtools"]
devtools = ["tauri/devtools"]
```

### 3. Alternative: Move Inline Scripts to External Files

**Sicherere Option:** Inline Scripts in separate `.js` Dateien verschieben und in der CSP nur `'self'` erlauben:

```json
{
  "csp": {
    "script-src": "'self'",
    "style-src": "'self'"
  }
}
```

## Files Comparison with Tauri v2 Starter

### Missing Files: None ✅

Alle Standard-Tauri-v2-Dateien sind vorhanden:
- ✅ `src-tauri/capabilities/default.json`
- ✅ `src-tauri/gen/schemas/`  
- ✅ `src-tauri/Cargo.toml`
- ✅ `src-tauri/tauri.conf.json`

### Missing Configuration: CSP ❌

Die einzige fehlende Konfiguration ist die CSP-Sektion in `tauri.conf.json`.

## Testing Plan

After implementing CSP fix:

1. **Development Test:**
   ```bash
   cd /root/.openclaw/workspace/oxidian
   cargo tauri dev
   ```

2. **JavaScript Verification:**
   - Open browser DevTools
   - Check console for CSP violations
   - Test inline script execution
   - Verify module loading

3. **Production Build Test:**
   ```bash
   cargo tauri build
   ```

## Conclusion

**Primary Issue:** Missing CSP configuration in `tauri.conf.json`
**Severity:** Critical - Complete JavaScript blocking
**Fix Complexity:** Low - Single configuration addition
**Estimated Fix Time:** 5 minutes

The Oxidian project has all necessary Tauri v2 files and permissions, but lacks the CSP configuration required for JavaScript execution. Adding the recommended CSP configuration will immediately resolve the JavaScript execution issue.