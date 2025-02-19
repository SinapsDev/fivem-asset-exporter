#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { createZipVersion } = require('./zipper');

async function detectScript(currentPath) {
    const manifestPath = path.join(currentPath, 'fxmanifest.lua');
    if (!fs.existsSync(manifestPath)) {
        console.error('No fxmanifest.lua found in current directory');
        throw new Error('Script must be run from a FiveM resource directory');
    }

    return {
        scriptPath: currentPath,
        scriptName: path.basename(currentPath)
    };
}

async function processVersion(scriptPath, scriptName, type, config) {
    console.log(`\nProcessing ${type} version...`);
    const zipPath = await createZipVersion(scriptPath, type);
    
    console.log(`\nUploading ${type} version...`);
    const uploaderPath = path.join(__dirname, 'uploader.js');
    execSync(`node "${uploaderPath}" ${scriptName} ${type} "${zipPath}"`, { stdio: 'inherit' });
}

async function main() {
    const type = process.argv[2];  // 'escrow', 'opensource', or 'both'

    if (!type) {
        console.error('Please provide the type argument');
        console.error('Usage: asset-exporter <escrow|opensource|both>');
        process.exit(1);
    }

    if (!['escrow', 'opensource', 'both'].includes(type)) {
        console.error('Type must be either "escrow", "opensource", or "both"');
        process.exit(1);
    }

    try {
        const { scriptPath, scriptName } = await detectScript(process.cwd());

        const config = require('./config.json');
        if (!config.scripts[scriptName]) {
            console.error(`Script "${scriptName}" not found in config`);
            console.error('Available scripts:', Object.keys(config.scripts).join(', '));
            console.error('Please add the script to your config.json first');
            process.exit(1);
        }

        if (type === 'both') {
            await processVersion(scriptPath, scriptName, 'escrow', config);
            await processVersion(scriptPath, scriptName, 'opensource', config);
            console.log('\nBoth versions completed successfully!');
        } else {
            await processVersion(scriptPath, scriptName, type, config);
            console.log('\nBuild completed successfully!');
        }
    } catch (error) {
        console.error('Build failed:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);
