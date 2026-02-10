# QA Report: Audio Recorder Error Handling Fix

**Date:** 2026-02-11
**Tester:** QA #4
**File:** `src/js/audio-recorder.js`

## Bug

Raw error shown when no audio device available: "Audio capture was requested but no device was found amongst 0 devices"

## Fixes Applied

1. **Device enumeration pre-check** — `_checkMicAvailability()` runs at construction, calls `enumerateDevices()` to detect audioinput devices before user ever clicks record
2. **Secure context guard** — If `navigator.mediaDevices` is undefined (non-HTTPS), shows: "Audio recording requires a secure context."
3. **Pre-record device check** — `start()` enumerates devices again before calling `getUserMedia()`, shows friendly "No microphone found. Please connect a microphone and try again." if none
4. **Graceful getUserMedia error handling** — Catch block maps error names to user-friendly messages:
   - `NotFoundError` → "No microphone found..."
   - `NotAllowedError` → "Microphone access was denied..."
   - `NotReadableError` → "Microphone is in use by another application..."
   - Fallback → "Could not start audio recording..."
5. **Ribbon button disabling** — `_setRibbonDisabled()` grays out button (opacity 0.4, `cursor: not-allowed`, `disabled=true`) with tooltip "No microphone detected" when no mic available

## Bundle

✅ `app.bundle.js` rebuilt successfully (828.0kb)

## Status

✅ **Complete** — All 6 requirements addressed. No raw errors will be shown to users.
