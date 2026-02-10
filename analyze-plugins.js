#!/usr/bin/env node
// Plugin analyzer for Oxidian compatibility testing
// Analyzes Obsidian community plugins to identify API surface usage

const fs = require('fs');
const path = require('path');

const pluginDir = './test-plugins';
const plugins = ['dataview', 'templater', 'calendar', 'kanban', 'excalidraw', 'admonition', 'outliner'];

console.log('='.repeat(80));
console.log('Oxidian Plugin Compatibility Analysis');
console.log('='.repeat(80));

const analysis = {};

// Common Obsidian API patterns to search for
const apiPatterns = [
    // Core imports and requires
    /require\(['"]obsidian['"]\)/g,
    /from ['"]obsidian['"]$/gm,
    
    // Classes and objects from Obsidian API
    /\b(?:Plugin|TFile|TFolder|Vault|App|Workspace|MarkdownView|FileManager|MetadataCache|Component|Setting|Modal|Notice|addRibbonIcon|addCommand|registerView|registerHoverLinkSource|registerMarkdownPostProcessor|registerEditorExtension|registerInterval|registerDomEvent|loadData|saveData|manifest)\b/g,
    
    // Event handlers
    /this\.app\.(?:vault|workspace|metadataCache)\.on\(/g,
    
    // Workspace methods
    /this\.app\.workspace\.(?:getActiveViewOfType|getLeavesOfType|getRootSplit|getLeaf|activeLeaf|rightSplit|leftSplit)/g,
    
    // Vault operations
    /this\.app\.vault\.(?:read|write|create|delete|rename|exists|getMarkdownFiles|getFiles|cachedRead|modify|process)/g,
    
    // Plugin lifecycle
    /(?:onload|onunload|addRibbonIcon|addCommand|addSettingTab)/g,
    
    // UI components
    /new (?:Modal|Setting|PluginSettingTab|ItemView)/g,
];

// Extract used APIs from plugin code
function analyzePlugin(pluginName) {
    const pluginPath = path.join(pluginDir, pluginName);
    
    try {
        // Read manifest
        const manifestPath = path.join(pluginPath, 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Read main.js
        const mainJsPath = path.join(pluginPath, 'main.js');
        const mainJs = fs.readFileSync(mainJsPath, 'utf8');
        
        console.log(`\n--- ${pluginName.toUpperCase()} ---`);
        console.log(`Version: ${manifest.version}`);
        console.log(`Description: ${manifest.description}`);
        console.log(`Main.js size: ${Math.round(mainJs.length / 1024)}KB`);
        
        const usedApis = new Set();
        
        // Find all API usage patterns
        apiPatterns.forEach(pattern => {
            const matches = mainJs.match(pattern);
            if (matches) {
                matches.forEach(match => usedApis.add(match));
            }
        });
        
        // Find specific class instantiations
        const classPatterns = [
            'new Plugin(',
            'new Modal(',
            'new Setting(',
            'new PluginSettingTab(',
            'new ItemView(',
            'new MarkdownRenderChild(',
            'new Component(',
            'extends Plugin',
            'extends Modal',
            'extends PluginSettingTab',
            'extends ItemView'
        ];
        
        classPatterns.forEach(pattern => {
            if (mainJs.includes(pattern)) {
                usedApis.add(pattern);
            }
        });
        
        // Common method calls
        const methodPatterns = [
            'this.addRibbonIcon',
            'this.addCommand',
            'this.addSettingTab',
            'this.registerView',
            'this.registerHoverLinkSource',
            'this.registerMarkdownPostProcessor',
            'this.registerEditorExtension',
            'this.registerInterval',
            'this.registerDomEvent',
            'this.loadData',
            'this.saveData',
            'app.vault.read',
            'app.vault.write',
            'app.vault.create',
            'app.vault.delete',
            'app.vault.modify',
            'app.vault.cachedRead',
            'app.workspace.getActiveViewOfType',
            'app.workspace.getLeavesOfType',
            'app.workspace.getLeaf',
            'app.workspace.activeLeaf',
            'app.metadataCache.getFileCache',
            'app.metadataCache.getBacklinksForFile',
        ];
        
        methodPatterns.forEach(pattern => {
            if (mainJs.includes(pattern)) {
                usedApis.add(pattern);
            }
        });
        
        // Look for imports/requires of obsidian module
        const obsidianImports = [];
        const requireMatches = mainJs.match(/(?:require\(['"]obsidian['"]\)|import\s+\{([^}]+)\}\s+from\s+['"]obsidian['"])/g);
        if (requireMatches) {
            obsidianImports.push(...requireMatches);
        }
        
        console.log(`\nAPI Usage Found: ${usedApis.size} patterns`);
        Array.from(usedApis).sort().forEach(api => {
            console.log(`  - ${api}`);
        });
        
        if (obsidianImports.length > 0) {
            console.log('\nObsidian imports/requires:');
            obsidianImports.forEach(imp => console.log(`  ${imp}`));
        }
        
        // Store analysis results
        analysis[pluginName] = {
            manifest,
            size: mainJs.length,
            apis: Array.from(usedApis).sort(),
            imports: obsidianImports
        };
        
    } catch (error) {
        console.error(`Error analyzing ${pluginName}:`, error.message);
        analysis[pluginName] = { error: error.message };
    }
}

// Analyze all plugins
plugins.forEach(analyzePlugin);

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

// Create summary of all used APIs across plugins
const allApis = new Set();
Object.values(analysis).forEach(plugin => {
    if (plugin.apis) {
        plugin.apis.forEach(api => allApis.add(api));
    }
});

console.log(`\nTotal unique API patterns found: ${allApis.size}`);
console.log('\nAll APIs used across plugins:');
Array.from(allApis).sort().forEach(api => {
    console.log(`  - ${api}`);
});

// Save analysis to JSON file
fs.writeFileSync('./test-plugins/analysis.json', JSON.stringify(analysis, null, 2));
console.log('\nDetailed analysis saved to ./test-plugins/analysis.json');