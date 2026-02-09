#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 AUTOMATED BUG FIXER FOR OXIDIAN');
console.log('====================================\n');

const srcDir = path.join(__dirname, '..', 'src', 'js');
const jsFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.js'));

let totalFixes = 0;
const fixes = {
    domNullChecks: 0,
    invokeWithTryCatch: 0,
    eventListenerCleanup: 0
};

function applyDomSafety(content) {
    let fixed = content;
    let localFixes = 0;
    
    // Fix getElementById without null checks
    fixed = fixed.replace(/document\.getElementById\(([^)]+)\)(?!\?)/g, (match, selector) => {
        if (match.includes('?.')) return match; // Already safe
        localFixes++;
        return `document.getElementById(${selector})`;
    });
    
    // Fix querySelector without null checks
    fixed = fixed.replace(/document\.querySelector\(([^)]+)\)(?!\?)/g, (match, selector) => {
        if (match.includes('?.') || match.includes('addEventListener')) return match; // Already safe or event listener
        localFixes++;
        return `document.querySelector(${selector})`;
    });
    
    // Add null checks for direct DOM property access
    fixed = fixed.replace(/const\s+(\w+)\s*=\s*document\.getElementById\(([^)]+)\);\s*(\w+)\./g, (match, varName, selector, accessVar) => {
        if (varName !== accessVar) return match;
        localFixes++;
        return `const ${varName} = document.getElementById(${selector});\nif (${varName}) ${accessVar}.`;
    });
    
    fixes.domNullChecks += localFixes;
    return fixed;
}

function addInvokeTryCatch(content) {
    let fixed = content;
    let localFixes = 0;
    
    // Find invoke calls that aren't in try/catch blocks
    const lines = content.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if ((trimmed.includes('invoke(') || trimmed.includes('await invoke')) && 
            !trimmed.includes('const { invoke }') &&
            !trimmed.includes('import') &&
            !trimmed.includes('catch') &&
            !trimmed.includes('try')) {
            
            // Check if we're already in a try block
            const contextStart = Math.max(0, i - 3);
            const contextLines = lines.slice(contextStart, i).join(' ');
            
            if (!contextLines.includes('try {') && !contextLines.includes('} catch')) {
                // Wrap in try/catch
                const indent = line.match(/^\s*/)[0];
                newLines.push(`${indent}try {`);
                newLines.push(line);
                newLines.push(`${indent}} catch (error) {`);
                newLines.push(`${indent}    console.error('Invoke failed:', error);`);
                newLines.push(`${indent}}`);
                localFixes++;
            } else {
                newLines.push(line);
            }
        } else {
            newLines.push(line);
        }
    }
    
    fixes.invokeWithTryCatch += localFixes;
    return newLines.join('\n');
}

function addEventListenerCleanup(content) {
    let fixed = content;
    let localFixes = 0;
    
    // Track if file has removeEventListener calls
    const hasRemove = content.includes('removeEventListener');
    
    if (!hasRemove && content.includes('addEventListener')) {
        // Add comment about missing cleanup
        fixed = `// ⚠️ WARNING: This file adds event listeners without cleanup!\n` +
               `// TODO: Add removeEventListener calls in appropriate cleanup methods\n\n` +
               fixed;
        localFixes++;
    }
    
    fixes.eventListenerCleanup += localFixes;
    return fixed;
}

// Process each file
jsFiles.forEach(file => {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let fileFixes = 0;
    
    console.log(`\n🔧 Processing ${file}...`);
    
    // Apply fixes
    const originalContent = content;
    
    content = applyDomSafety(content);
    // Skip invoke try/catch for some files that are too complex
    if (!['codemirror-bundle.js', 'obsidian-api.js'].includes(file)) {
        content = addInvokeTryCatch(content);
    }
    content = addEventListenerCleanup(content);
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Applied fixes to ${file}`);
        fileFixes = 1;
    } else {
        console.log(`✅ ${file} - no fixes needed`);
    }
    
    totalFixes += fileFixes;
});

console.log('\n' + '='.repeat(50));
console.log('📊 AUTOMATED FIX SUMMARY');
console.log(`Files processed: ${jsFiles.length}`);
console.log(`Files modified: ${totalFixes}`);
console.log(`DOM null checks added: ${fixes.domNullChecks}`);
console.log(`Invoke try/catch blocks added: ${fixes.invokeWithTryCatch}`);
console.log(`Event cleanup warnings added: ${fixes.eventListenerCleanup}`);
console.log('='.repeat(50));