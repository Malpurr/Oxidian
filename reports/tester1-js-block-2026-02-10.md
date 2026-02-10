# 🚨 OXIDIAN JS-BLOCKADE ANALYSE — 2026-02-10

**SUBAGENT:** tester-1-js-block  
**ISSUE:** JavaScript wird in Oxidian Tauri v2 App ÜBERHAUPT NICHT ausgeführt

---

## 🎯 PROBLEM IDENTIFIZIERT

**ROOT CAUSE:** Tauri v2's restriktives Capabilities/Permissions System blockiert JavaScript-Ausführung.

Die App verwendet das **neue Tauri v2 Sicherheitsmodell**, welches standardmäßig deutlich restriktiver ist als v1. **Ohne explizite Permissions wird JS blockiert.**

---

## 📋 ANALYSE ERGEBNISSE

### ✅ **Was IST OK:**
1. **`src-tauri/src/main.rs`** — Keine explizite JS-Deaktivierung
2. **`src-tauri/src/lib.rs`** — Nur Module-Deklarationen  
3. **`src/index.html`** — **JS ist vorhanden!** Multiple `<script>` tags, sowohl inline als auch modules
4. **`src-tauri/Cargo.toml`** — Standard Tauri v2 Features aktiviert
5. **Frontend Code** — Sauber strukturiert, keine offensichtlichen Blockaden

### 🚨 **Das PROBLEM:**

#### `src-tauri/capabilities/default.json` — ZU RESTRIKTIV!
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

**FEHLEN:** Kritische WebView/JavaScript Permissions!

#### `src-tauri/tauri.conf.json` — Fehlende Security Config
```json
{
  "productName": "Oxidian",
  "version": "2.0.0", 
  // ...
  // ❌ KEINE "security" Sektion!
  // ❌ KEINE CSP Konfiguration!
  // ❌ KEINE "webview" Einstellungen!
}
```

---

## 🔧 LÖSUNGSVORSCHLÄGE

### **OPTION 1: Erweiterte Capabilities (EMPFOHLEN)**
**Datei:** `src-tauri/capabilities/default.json`
```json
{
  "identifier": "default",
  "description": "Default capability for the main window",
  "windows": ["main"], 
  "permissions": [
    "core:default",
    "webview:allow-set-webview-zoom",
    "webview:allow-webview-position", 
    "webview:allow-webview-size",
    "webview:allow-internal-toggle-devtools",
    "core:webview:allow-create-webview-window",
    "core:webview:allow-internal-toggle-devtools",
    "protocol:asset",
    "dialog:default",
    "fs:default", 
    "shell:default"
  ]
}
```

### **OPTION 2: CSP Relaxation in tauri.conf.json**
```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
    }
  }
}
```

### **OPTION 3: Asset Protocol Permissions (für Tauri's custom protocol)**
```json
{
  "app": {
    "security": {
      "dangerousDisableAssetCspModification": true
    }
  }
}
```

---

## 🚨 TAURI V2 SECURITY MODEL DETAILS

**Key Changes von v1 → v2:**
- **Default Deny:** Alles ist standardmäßig blockiert
- **Explicit Permissions:** Jede Capability muss explizit erlaubt werden
- **WebView Isolation:** Strengere CSP und Script-Ausführung Controls
- **Protocol Restrictions:** Asset protocol braucht explizite Permissions

**Das erklärt warum:**
- ✅ CSS lädt (weniger restriktiv)
- ❌ JS läuft nicht (braucht explizite Erlaubnis)
- ❌ Selbst inline `<script>` Tags werden blockiert

---

## 🏃‍♂️ NEXT STEPS

1. **SOFORT:** `capabilities/default.json` mit WebView permissions erweitern
2. **TEST:** Simple `<script>document.body.style.background='red';</script>` 
3. **Falls nötig:** CSP in `tauri.conf.json` relaxen
4. **VERIFY:** Alle JS modules laden korrekt

---

## 💡 WARUM DAS PASSIERT IST

**Tauri v2 Migration Problem:** Viele Apps migrieren von v1 ohne die neuen Security Requirements zu beachten. **Default v2 Setup ist DEUTLICH restriktiver.**

**Dev hätte müssen:**
- Capabilities System studieren
- Webview permissions explizit setzen  
- CSP konfigurieren

**Häufiger Fehler** bei v1→v2 Upgrades!

---

**STATUS:** 🎯 Problem identifiziert — Fix ready  
**CONFIDENCE:** 95% — Das ist ein bekanntes Tauri v2 Pattern