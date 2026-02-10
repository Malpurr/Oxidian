#!/usr/bin/env node
// Plugin loading simulation test - test if plugins can be instantiated with our API shim

const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Mock Tauri invoke function for testing
const mockTauriInvoke = (command, args) => {
    switch (command) {
        case 'read_note':
            return Promise.resolve(`# Test Note\nThis is test content for ${args.path}`);
        case 'save_note':
            return Promise.resolve();
        case 'get_vault_path':
            return Promise.resolve('/test/vault');
        case 'list_files':
            return Promise.resolve([
                { path: 'note1.md', is_dir: false, children: [] },
                { path: 'folder1/', is_dir: true, children: [
                    { path: 'folder1/note2.md', is_dir: false, children: [] }
                ]}
            ]);
        default:
            return Promise.reject(`Mock: Unknown command ${command}`);
    }
};

// Create a sandbox environment to test plugin loading
function createPluginTestEnvironment() {
    // Create a mock window/global environment
    const mockGlobal = {
        window: {},
        document: {
            createElement: (tag) => ({ 
                tagName: tag.toUpperCase(),
                className: '',
                setAttribute: () => {},
                addEventListener: () => {},
                appendChild: () => {},
                remove: () => {},
                querySelector: () => null,
                querySelectorAll: () => [],
                textContent: ''
            }),
            querySelector: () => null,
            querySelectorAll: () => [],
            createTextNode: (text) => ({ textContent: text })
        },
        console,
        setInterval: (fn, ms) => setTimeout(fn, ms),
        clearInterval: () => {},
        setTimeout,
        clearTimeout
    };
    
    // Add Tauri mock
    mockGlobal.window.__TAURI__ = {
        core: {
            invoke: mockTauriInvoke
        }
    };
    
    return mockGlobal;
}

// Test plugin loading
async function testPluginLoading(pluginName) {
    console.log(`\n🧪 Testing ${pluginName} plugin instantiation...`);
    
    const pluginDir = path.join('./test-plugins', pluginName);
    const manifestPath = path.join(pluginDir, 'manifest.json');
    const mainJsPath = path.join(pluginDir, 'main.js');
    
    try {
        // Read manifest and main.js
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
        const apiShimContent = fs.readFileSync('./src/js/obsidian-api.js', 'utf8');
        
        // Create test environment
        const testEnv = createPluginTestEnvironment();
        
        // Create the test script combining API shim + plugin code
        const testScript = `
            ${apiShimContent}
            
            // Export obsidian module objects to global scope
            const obsidianExports = { 
                Plugin, Component, TFile, TFolder, MarkdownView, Modal, Setting, Notice,
                Vault, App, Workspace, ItemView, PluginSettingTab, MarkdownRenderChild,
                FileManager, MetadataCache, Events
            };
            
            // Mock require function for obsidian
            function require(moduleName) {
                if (moduleName === 'obsidian') {
                    return obsidianExports;
                }
                throw new Error('Module not found: ' + moduleName);
            }
            
            // Create mock app
            const mockApp = new App();
            
            ${mainJsContent}
            
            // Try to find and instantiate the plugin class
            let PluginClass = null;
            if (typeof module !== 'undefined' && module.exports) {
                PluginClass = module.exports.default || module.exports;
            } else {
                // Look for plugin class in global scope
                const globalNames = Object.getOwnPropertyNames(this);
                for (const name of globalNames) {
                    const obj = this[name];
                    if (obj && typeof obj === 'function' && obj.prototype && obj.prototype.onload) {
                        PluginClass = obj;
                        break;
                    }
                }
            }
            
            if (PluginClass) {
                try {
                    const pluginInstance = new PluginClass(mockApp, manifest);
                    if (pluginInstance.onload) {
                        // Don't actually call onload as it might do unsafe things
                        // just check it exists
                        testResult = {
                            success: true,
                            plugin: pluginInstance,
                            className: PluginClass.name,
                            hasOnload: typeof pluginInstance.onload === 'function',
                            hasOnunload: typeof pluginInstance.onunload === 'function'
                        };
                    } else {
                        testResult = { success: false, error: 'No onload method found' };
                    }
                } catch (e) {
                    testResult = { success: false, error: 'Failed to instantiate: ' + e.message };
                }
            } else {
                testResult = { success: false, error: 'No plugin class found' };
            }
            
            testResult;
        `;
        
        // Execute in sandbox
        const context = vm.createContext({...testEnv, testResult: null, manifest, module: {exports: {}} });
        const result = vm.runInContext(testScript, context, { timeout: 5000 });
        
        if (result.success) {
            console.log(`  ✅ SUCCESS`);
            console.log(`     Class: ${result.className}`);
            console.log(`     Has onload: ${result.hasOnload}`);
            console.log(`     Has onunload: ${result.hasOnunload}`);
            
            // Check for common plugin methods
            const pluginMethods = ['addCommand', 'addRibbonIcon', 'addSettingTab', 'registerView'];
            const availableMethods = pluginMethods.filter(method => 
                result.plugin[method] && typeof result.plugin[method] === 'function'
            );
            console.log(`     Available methods: ${availableMethods.join(', ')}`);
            
            return { status: 'success', plugin: pluginName, details: result };
        } else {
            console.log(`  ❌ FAILED: ${result.error}`);
            return { status: 'failed', plugin: pluginName, error: result.error };
        }
        
    } catch (error) {
        console.log(`  💥 ERROR: ${error.message}`);
        return { status: 'error', plugin: pluginName, error: error.message };
    }
}

// Main test suite
async function runPluginTestSuite() {
    console.log('='.repeat(80));
    console.log('Oxidian Plugin Loading Test Suite');
    console.log('='.repeat(80));
    
    const plugins = ['dataview', 'templater', 'calendar', 'kanban', 'excalidraw', 'admonition', 'outliner'];
    const results = [];
    
    for (const plugin of plugins) {
        const result = await testPluginLoading(plugin);
        results.push(result);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    const errored = results.filter(r => r.status === 'error');
    
    console.log(`✅ Successful: ${successful.length}/${plugins.length}`);
    successful.forEach(r => console.log(`   ${r.plugin}`));
    
    if (failed.length > 0) {
        console.log(`\n❌ Failed: ${failed.length}`);
        failed.forEach(r => console.log(`   ${r.plugin}: ${r.error}`));
    }
    
    if (errored.length > 0) {
        console.log(`\n💥 Errors: ${errored.length}`);
        errored.forEach(r => console.log(`   ${r.plugin}: ${r.error}`));
    }
    
    return results;
}

// Run if called directly
if (require.main === module) {
    runPluginTestSuite().then(results => {
        fs.writeFileSync('./test-plugins/loading-test-results.json', JSON.stringify(results, null, 2));
        console.log('\nDetailed results saved to ./test-plugins/loading-test-results.json');
    }).catch(console.error);
}

module.exports = { runPluginTestSuite, testPluginLoading };