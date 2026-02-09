#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 ASYNC/AWAIT BUG CHECKER');
console.log('==========================\n');

const srcDir = path.join(__dirname, '..', 'src', 'js');
const jsFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.js'));

let totalIssues = 0;
let totalFiles = 0;

jsFiles.forEach(file => {
    const filePath = path.join(srcDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    totalFiles++;
    console.log(`\n📁 ${file}`);
    console.log('─'.repeat(50));
    
    let fileIssues = 0;
    
    // Split content into lines for line numbers
    const lines = content.split('\n');
    
    // Find all function declarations and expressions
    const functionRegex = /(function\s+\w+\s*\(|const\s+\w+\s*=\s*\(|let\s+\w+\s*=\s*\(|var\s+\w+\s*=\s*\(|\w+\s*:\s*function\s*\(|\w+\s*\([^)]*\)\s*{)/g;
    
    // Find methods that use await but aren't async
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check if line contains await
        if (line.includes('await ')) {
            // Look backwards to find the function declaration
            let functionStart = -1;
            let braceCount = 0;
            
            for (let i = index; i >= 0; i--) {
                const checkLine = lines[i];
                
                // Count braces to track scope
                const openBraces = (checkLine.match(/{/g) || []).length;
                const closeBraces = (checkLine.match(/}/g) || []).length;
                braceCount += closeBraces - openBraces;
                
                // If we're back to the same level or higher, check for function
                if (braceCount <= 0) {
                    // Check various function patterns
                    if (checkLine.match(/(function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|\w+\s*:\s*function|\w+\s*\([^)]*\)\s*{)/)) {
                        functionStart = i;
                        break;
                    }
                }
            }
            
            if (functionStart >= 0) {
                const funcLine = lines[functionStart];
                
                // Check if function is NOT async
                if (!funcLine.includes('async ')) {
                    console.log(`❌ Line ${lineNum}: await used in non-async function`);
                    console.log(`   Function: ${funcLine.trim()}`);
                    console.log(`   Await: ${line.trim()}`);
                    fileIssues++;
                }
            }
        }
        
        // Check for other common issues while we're at it
        
        // DOM access without null check
        if (line.match(/document\.(getElementById|querySelector|getElementsBy)/)) {
            if (!lines.slice(Math.max(0, index-2), index+3).some(l => 
                l.includes('null') || l.includes('undefined') || l.includes('&&') || l.includes('?.')
            )) {
                console.log(`⚠️  Line ${lineNum}: DOM access without null check`);
                console.log(`   Code: ${line.trim()}`);
                fileIssues++;
            }
        }
        
        // Event listeners without cleanup (simplified check)
        if (line.includes('addEventListener') && !content.includes('removeEventListener')) {
            console.log(`⚠️  Line ${lineNum}: addEventListener without removeEventListener in file`);
            console.log(`   Code: ${line.trim()}`);
            fileIssues++;
        }
        
        // invoke without try/catch
        if (line.includes('invoke(') || line.includes('invoke ')) {
            if (!lines.slice(Math.max(0, index-3), index+3).some(l => 
                l.includes('try') || l.includes('catch')
            )) {
                console.log(`❌ Line ${lineNum}: invoke call without try/catch`);
                console.log(`   Code: ${line.trim()}`);
                fileIssues++;
            }
        }
    });
    
    totalIssues += fileIssues;
    
    if (fileIssues === 0) {
        console.log('✅ No issues found');
    } else {
        console.log(`\n🔥 ${fileIssues} issues found`);
    }
});

console.log('\n');
console.log('='.repeat(50));
console.log(`📊 SUMMARY`);
console.log(`Files checked: ${totalFiles}`);
console.log(`Total issues: ${totalIssues}`);
if (totalIssues > 0) {
    console.log('🚨 CRITICAL: Fix these issues immediately!');
} else {
    console.log('✅ All files look clean!');
}
console.log('='.repeat(50));