#!/usr/bin/env node
// Deep compatibility checker - maps API usage to current obsidian-api.js shim

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('Oxidian Plugin Compatibility Deep Check');
console.log('='.repeat(80));

// Read our current obsidian-api.js shim
const shimPath = './src/js/obsidian-api.js';
const shimContent = fs.readFileSync(shimPath, 'utf8');

// Extract available classes and methods from the shim
function parseObsidianShim(shimContent) {
    const available = {
        classes: new Set(),
        methods: new Set(),
        properties: new Set(),
        stubs: new Set()
    };
    
    // Find class definitions
    const classMatches = shimContent.match(/class\s+(\w+)/g);
    if (classMatches) {
        classMatches.forEach(match => {
            const className = match.replace('class ', '');
            available.classes.add(className);
        });
    }
    
    // Find method definitions inside classes
    const methodMatches = shimContent.match(/(\w+)\s*\([^)]*\)\s*{/g);
    if (methodMatches) {
        methodMatches.forEach(match => {
            const methodName = match.split('(')[0].trim();
            if (methodName !== 'if' && methodName !== 'for' && methodName !== 'while') {
                available.methods.add(methodName);
            }
        });
    }
    
    // Find async method definitions
    const asyncMethodMatches = shimContent.match(/async\s+(\w+)\s*\(/g);
    if (asyncMethodMatches) {
        asyncMethodMatches.forEach(match => {
            const methodName = match.replace('async ', '').split('(')[0].trim();
            available.methods.add(methodName);
        });
    }
    
    // Find stub warnings (incomplete implementations)
    const stubMatches = shimContent.match(/_stubWarn\([^,]+,\s*['"]([^'"]+)['"]\)/g);
    if (stubMatches) {
        stubMatches.forEach(match => {
            const stubMatch = match.match(/_stubWarn\([^,]+,\s*['"]([^'"]+)['"]\)/);
            if (stubMatch) {
                available.stubs.add(stubMatch[1]);
            }
        });
    }
    
    return available;
}

const shimAPIs = parseObsidianShim(shimContent);

console.log(`Found ${shimAPIs.classes.size} classes in obsidian-api.js:`);
Array.from(shimAPIs.classes).sort().forEach(cls => console.log(`  - ${cls}`));

console.log(`\nFound ${shimAPIs.methods.size} methods in obsidian-api.js`);
console.log(`Found ${shimAPIs.stubs.size} stub methods (incomplete)`);

// Critical API requirements per plugin type
const pluginRequirements = {
    'dataview': {
        critical: [
            'Plugin', 'Component', 'MarkdownView', 'TFile', 'TFolder',
            'registerMarkdownPostProcessor', 'app.vault.read', 'app.vault.getMarkdownFiles',
            'app.metadataCache.getFileCache', 'app.workspace.getActiveViewOfType'
        ],
        description: 'Query engine needs to read all files and parse metadata'
    },
    'templater': {
        critical: [
            'Plugin', 'Modal', 'TFile', 'TFolder', 'Notice',
            'app.vault.read', 'app.vault.write', 'app.vault.create', 'app.vault.modify',
            'app.workspace.getActiveViewOfType', 'registerEditorExtension'
        ],
        description: 'Template system needs full file operations and editor integration'
    },
    'calendar': {
        critical: [
            'Plugin', 'Modal', 'Setting', 'TFile', 'ItemView',
            'registerView', 'app.vault.create', 'app.workspace.getLeaf'
        ],
        description: 'Calendar needs custom view registration and daily note creation'
    },
    'kanban': {
        critical: [
            'Plugin', 'Component', 'MarkdownView', 'Modal', 'TFile',
            'registerView', 'registerHoverLinkSource', 'app.vault.read', 'app.vault.modify'
        ],
        description: 'Kanban needs custom view and drag-drop file modification'
    },
    'excalidraw': {
        critical: [
            'Plugin', 'TFile', 'FileManager', 'Modal', 'Workspace',
            'registerView', 'registerMarkdownPostProcessor', 'app.vault.read', 
            'app.vault.write', 'app.vault.cachedRead'
        ],
        description: 'Drawing tool needs binary file handling and custom view'
    },
    'admonition': {
        critical: [
            'Plugin', 'Component', 'MarkdownView', 'Modal',
            'registerMarkdownPostProcessor', 'app.vault.read'
        ],
        description: 'Callout enhancement needs markdown post-processing'
    },
    'outliner': {
        critical: [
            'Plugin', 'MarkdownView', 'Setting',
            'registerEditorExtension', 'app.workspace.getActiveViewOfType'
        ],
        description: 'List editor needs editor extensions and view access'
    }
};

// Check compatibility for each plugin
const plugins = ['dataview', 'templater', 'calendar', 'kanban', 'excalidraw', 'admonition', 'outliner'];
const compatibilityResults = {};

plugins.forEach(pluginName => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`CHECKING: ${pluginName.toUpperCase()}`);
    console.log(`${'='.repeat(50)}`);
    
    const requirements = pluginRequirements[pluginName];
    console.log(`Purpose: ${requirements.description}`);
    
    const missing = [];
    const available = [];
    const stubbed = [];
    
    requirements.critical.forEach(api => {
        // Check if it's a class
        if (shimAPIs.classes.has(api)) {
            available.push(api);
        }
        // Check if it's a method
        else if (shimAPIs.methods.has(api) || shimAPIs.methods.has(api.split('.').pop())) {
            available.push(api);
        }
        // Check if it's stubbed
        else if (shimAPIs.stubs.has(api)) {
            stubbed.push(api);
        }
        // Check for common app.* patterns
        else if (api.startsWith('app.')) {
            const parts = api.split('.');
            const lastPart = parts[parts.length - 1];
            
            // Look for the method in shimContent directly
            if (shimContent.includes(lastPart)) {
                available.push(api);
            } else {
                missing.push(api);
            }
        }
        // Check for this.* patterns (Plugin methods)
        else if (api.startsWith('this.')) {
            const methodName = api.replace('this.', '');
            if (shimContent.includes(methodName)) {
                available.push(api);
            } else {
                missing.push(api);
            }
        }
        // Check for register* methods
        else if (api.startsWith('register')) {
            if (shimContent.includes(api)) {
                available.push(api);
            } else {
                missing.push(api);
            }
        }
        else {
            missing.push(api);
        }
    });
    
    console.log(`\n✅ AVAILABLE (${available.length}/${requirements.critical.length}):`);
    available.forEach(api => console.log(`  + ${api}`));
    
    if (stubbed.length > 0) {
        console.log(`\n⚠️  STUBBED (incomplete - ${stubbed.length}):`);
        stubbed.forEach(api => console.log(`  ~ ${api}`));
    }
    
    if (missing.length > 0) {
        console.log(`\n❌ MISSING (${missing.length}):`);
        missing.forEach(api => console.log(`  - ${api}`));
    }
    
    // Calculate compatibility score
    const totalRequired = requirements.critical.length;
    const fullyImplemented = available.length;
    const partiallyImplemented = stubbed.length;
    const score = Math.round(((fullyImplemented + partiallyImplemented * 0.5) / totalRequired) * 100);
    
    let status;
    if (score >= 90) status = '✅ WORKS';
    else if (score >= 70) status = '⚠️ PARTIAL';
    else status = '❌ BROKEN';
    
    console.log(`\nCOMPATIBILITY: ${status} (${score}%)`);
    
    compatibilityResults[pluginName] = {
        status: status,
        score: score,
        available: available.length,
        stubbed: stubbed.length,
        missing: missing.length,
        total: totalRequired,
        missingAPIs: missing,
        stubbedAPIs: stubbed
    };
});

// Summary matrix
console.log('\n' + '='.repeat(80));
console.log('COMPATIBILITY MATRIX');
console.log('='.repeat(80));

plugins.forEach(plugin => {
    const result = compatibilityResults[plugin];
    console.log(`${plugin.padEnd(12)} ${result.status} (${result.score}%) - ${result.available}/${result.total} APIs available`);
});

console.log('\n' + '='.repeat(80));
console.log('CRITICAL MISSING APIs (needed for multiple plugins)');
console.log('='.repeat(80));

// Find APIs missing across multiple plugins
const missingCount = {};
Object.values(compatibilityResults).forEach(result => {
    result.missingAPIs.forEach(api => {
        missingCount[api] = (missingCount[api] || 0) + 1;
    });
});

const criticalMissing = Object.entries(missingCount)
    .filter(([api, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

criticalMissing.forEach(([api, count]) => {
    console.log(`${api.padEnd(40)} (needed by ${count} plugins)`);
});

// Save compatibility report
const report = {
    timestamp: new Date().toISOString(),
    shimAnalysis: {
        classes: Array.from(shimAPIs.classes).sort(),
        methods: Array.from(shimAPIs.methods).sort(),
        stubs: Array.from(shimAPIs.stubs).sort()
    },
    pluginResults: compatibilityResults,
    criticalMissing
};

fs.writeFileSync('./test-plugins/compatibility-report.json', JSON.stringify(report, null, 2));
console.log('\nDetailed compatibility report saved to ./test-plugins/compatibility-report.json');