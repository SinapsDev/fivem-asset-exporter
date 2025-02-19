const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const readline = require('readline');

function shortenPath(fullPath) {
    const scriptName = path.basename(fullPath);
    return `.../${scriptName}`;
}

async function modifyFxmanifest(originalPath, version) {
    const fxmanifestPath = path.join(originalPath, 'fxmanifest.lua');
    
    if (!await fs.pathExists(fxmanifestPath)) {
        console.error('fxmanifest.lua not found.');
        throw new Error('fxmanifest.lua not found.');
    }

    let data = await fs.readFile(fxmanifestPath, 'utf8');

    const escrowIgnoreEscrow = `escrow_ignore {
    'shared/**/*'
}`;
    const escrowIgnoreOpensource = `escrow_ignore {
    'shared/**/*',
    'client/**/*',
    'server/**/*',
}`;

    const escrowIgnoreRegex = /escrow_ignore\s*\{[^}]*\}/i;

    let replacement;
    if (version === 'escrow') {
        replacement = escrowIgnoreEscrow;
    } else if (version === 'opensource') {
        replacement = escrowIgnoreOpensource;
    } else {
        throw new Error('Invalid version type.');
    }

    if (escrowIgnoreRegex.test(data)) {
        data = data.replace(escrowIgnoreRegex, replacement);
        console.log(`✓ Modified escrow_ignore for ${version} version`);
    } else {
        console.log(`+ Adding escrow_ignore for ${version} version`);
        data += `\n${replacement}`;
    }

    return data;
}

function zipDirectory(source, out) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 }});
        const stream = fs.createWriteStream(out);

        archive
            .on('error', err => reject(err))
            .pipe(stream);

        stream.on('close', () => resolve());
        stream.on('error', err => reject(err));

        archive.directory(source, false);
        archive.finalize();
    });
}

async function createZipVersion(originalPath, version, outputZip) {
    const parentDir = path.dirname(originalPath);
    const tempDir = path.join(parentDir, `${path.basename(originalPath)}_${version}`);
    const finalZipPath = path.join(parentDir, `${path.basename(originalPath)}_${version}.zip`);
    
    try {
        // Clean up any existing temp directory and zip
        if (await fs.pathExists(tempDir)) {
            await fs.remove(tempDir);
        }
        if (await fs.pathExists(finalZipPath)) {
            await fs.remove(finalZipPath);
        }

        console.log(`\n[${version.toUpperCase()}]`);
        console.log('→ Copying files...');
        await fs.copy(originalPath, tempDir);

        const modifiedFxmanifest = await modifyFxmanifest(originalPath, version);
        const fxmanifestPath = path.join(tempDir, 'fxmanifest.lua');
        await fs.writeFile(fxmanifestPath, modifiedFxmanifest, 'utf8');

        console.log('→ Creating zip file...');
        
        // Create zip file in parent directory
        await zipDirectory(tempDir, finalZipPath);
        
        // Verify zip was created
        if (!await fs.pathExists(finalZipPath)) {
            throw new Error('Failed to create zip file');
        }

        console.log(`✓ Created ${version} version at ${finalZipPath}`);
        return finalZipPath;
    } finally {
        // Clean up temp directory
        if (await fs.pathExists(tempDir)) {
            await fs.remove(tempDir);
        }
    }
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    const scriptPath = await question('Enter the path to the FiveM script: ');
    rl.close();

    const originalPath = path.resolve(scriptPath.trim());

    if (!await fs.pathExists(originalPath) || !(await fs.stat(originalPath)).isDirectory()) {
        console.error('Invalid script path.');
        return;
    }

    const shortPath = shortenPath(originalPath);
    console.log(`\nProcessing: ${shortPath}`);

    const scriptName = path.basename(originalPath);
    const parentDir = path.dirname(originalPath);
    const escrowZip = path.join(parentDir, `${scriptName}_escrow.zip`);
    const opensourceZip = path.join(parentDir, `${scriptName}_opensource.zip`);

    try {
        console.log('\nStarting parallel processing...');

        await Promise.all([
            createZipVersion(originalPath, 'escrow', escrowZip),
            createZipVersion(originalPath, 'opensource', opensourceZip)
        ]);

        console.log('\n✓ Successfully created both versions:');
        console.log(`  • Escrow: .../${scriptName}_escrow.zip`);
        console.log(`  • Open Source: .../${scriptName}_opensource.zip`);
    } catch (error) {
        console.error('\n✗ Error:', error.message);
    }
}

main();

module.exports = {
    createZipVersion
};