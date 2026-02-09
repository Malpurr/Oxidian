#!/usr/bin/env node

const esbuild = require('esbuild');
const path = require('path');

// esbuild configuration for bundling CodeMirror dependencies
const buildConfig = {
  entryPoints: [path.join(__dirname, 'src/js/codemirror-entry.js')],
  bundle: true,
  minify: false, // Keep readable for debugging
  format: 'esm',
  target: 'es2020',
  outfile: path.join(__dirname, 'src/js/codemirror-bundle.js'),
  external: [], // Bundle everything
  logLevel: 'info',
  sourcemap: 'inline', // For debugging
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

async function build() {
  try {
    console.log('🔧 Building CodeMirror bundle...');
    const result = await esbuild.build(buildConfig);
    
    if (result.errors.length > 0) {
      console.error('❌ Build failed with errors:', result.errors);
      process.exit(1);
    }
    
    if (result.warnings.length > 0) {
      console.warn('⚠️  Build warnings:', result.warnings);
    }
    
    console.log('✅ CodeMirror bundle built successfully!');
    console.log(`📁 Output: ${buildConfig.outfile}`);
    
  } catch (error) {
    console.error('❌ Build error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  build();
}

module.exports = { build, buildConfig };