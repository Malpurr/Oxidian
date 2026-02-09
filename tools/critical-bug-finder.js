#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 CRITICAL BUG FINDER FOR OXIDIAN');
console.log('===================================\n');

const srcDir = path.join(__dirname, '..', 'src', 'js');
const jsFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.js'));

let totalBugs = 0;
let totalFiles = 0;

const bugs = {
    domNullChecks: [],
    invokeWithoutTryCatch: [],
    realAsyncAwaitProblems: [],
    eventListenerLeaks: []
};

jsFiles.forEach(file => {
    const filePath = path.join(srcDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    totalFiles++;
    console.log(`\n📁 ${file}`);
    console.log('─'.repeat(50));
    
    let fileBugs = 0;
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();
        
        // Real DOM access without null checks
        if (trimmed.match(/document\.(getElementById|querySelector|getElementsBy)/)) {
            // Look for null checks nearby
            const contextLines = lines.slice(Math.max(0, index-2), index+3).join(' ');
            if (!contextLines.includes('null') && 
                !contextLines.includes('undefined') && 
                !contextLines.includes('?.') &&
                !contextLines.includes('&&') &&
                !trimmed.includes('addEventListener')) {
                
                bugs.domNullChecks.push({file, line: lineNum, code: trimmed});
                console.log(`❌ DOM ACCESS: Line ${lineNum}: ${trimmed}`);
                fileBugs++;
            }
        }
        
        // Real invoke calls without try/catch (skip imports)
        if ((trimmed.includes('invoke(') || trimmed.includes('await invoke')) && 
            !trimmed.includes('const { invoke }') &&
            !trimmed.includes('import')) {
            
            // Look for try/catch in surrounding context
            const contextStart = Math.max(0, index - 5);
            const contextEnd = Math.min(lines.length, index + 5);
            const context = lines.slice(contextStart, contextEnd).join(' ');
            
            if (!context.includes('try') && !context.includes('catch')) {
                bugs.invokeWithoutTryCatch.push({file, line: lineNum, code: trimmed});
                console.log(`❌ INVOKE: Line ${lineNum}: ${trimmed}`);
                fileBugs++;
            }
        }
        
        // Event listeners without cleanup
        if (trimmed.includes('addEventListener') && !content.includes('removeEventListener')) {
            bugs.eventListenerLeaks.push({file, line: lineNum, code: trimmed});
            console.log(`⚠️  EVENT LEAK: Line ${lineNum}: ${trimmed}`);
            fileBugs++;
        }
        
        // Check for getContent() calls that could fail
        if (trimmed.includes('getContent()') && file === 'editor.js') {
            console.log(`⚠️  EDITOR CONTENT: Line ${lineNum}: ${trimmed}`);
            fileBugs++;
        }
    });
    
    totalBugs += fileBugs;
    if (fileBugs === 0) {
        console.log('✅ No critical issues found');
    } else {
        console.log(`\n🔥 ${fileBugs} critical issues found`);
    }
});

console.log('\n' + '='.repeat(50));
console.log(`📊 CRITICAL BUG SUMMARY`);
console.log(`Files checked: ${totalFiles}`);
console.log(`Total critical bugs: ${totalBugs}`);
console.log(`DOM null checks needed: ${bugs.domNullChecks.length}`);
console.log(`Invoke calls without try/catch: ${bugs.invokeWithoutTryCatch.length}`);
console.log(`Event listener leaks: ${bugs.eventListenerLeaks.length}`);
console.log('='.repeat(50));

// Save detailed report
const reportData = {
    summary: {
        totalFiles,
        totalBugs,
        timestamp: new Date().toISOString()
    },
    bugs
};

fs.writeFileSync(
    path.join(__dirname, '..', 'reports', 'critical-bugs.json'), 
    JSON.stringify(reportData, null, 2)
);

console.log('\n💾 Detailed report saved to reports/critical-bugs.json');