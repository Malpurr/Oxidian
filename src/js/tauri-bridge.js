// Tauri IPC Bridge — waits for Tauri to be ready before exposing invoke
// Fixes race condition on NixOS where ES modules load before Tauri injects window.__TAURI__

let _invoke = null;
let _ready = false;
const _waiters = [];

function _checkReady() {
    if (window.__TAURI__?.core?.invoke) {
        _invoke = window.__TAURI__.core.invoke;
        _ready = true;
        _waiters.forEach(resolve => resolve(_invoke));
        _waiters.length = 0;
        return true;
    }
    return false;
}

// Try immediately
_checkReady();

// If not ready, poll
if (!_ready) {
    const poll = setInterval(() => {
        if (_checkReady()) clearInterval(poll);
    }, 5);
    // Safety timeout
    setTimeout(() => {
        if (!_ready) {
            console.error('[Oxidian] Tauri IPC bridge not available after 5s');
            clearInterval(poll);
        }
    }, 5000);
}

// Proxy invoke that waits for readiness
export async function invoke(cmd, args) {
    if (_ready) return _invoke(cmd, args);
    return new Promise((resolve, reject) => {
        _waiters.push((inv) => {
            inv(cmd, args).then(resolve).catch(reject);
        });
    });
}

export function whenReady() {
    if (_ready) return Promise.resolve();
    return new Promise(resolve => _waiters.push(() => resolve()));
}
