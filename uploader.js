const fs = require('fs-extra');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from the root directory of the tool
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const config = require('./config.json');

async function uploadFile(filePath, assetId) {
  if (!filePath) {
    throw new Error('File path must be specified');
  }

  const token = process.env.CFX_JWT;
  if (!token) {
    console.error('Environment variables:', process.env);
    console.error('ENV Path:', envPath);
    throw new Error(`Please add your CFX JWT token to .env file at ${envPath} as CFX_JWT=your_token_here`);
  }

  const fileName = path.basename(filePath);
  const uploadUrl = `https://portal-api.cfx.re/v1/assets/${assetId}/re-upload`;
  const uploadChunkUrl = `https://portal-api.cfx.re/v1/assets/${assetId}/upload-chunk`;

  try {
    // Calculate chunk count based on max chunk size of 1376280
    const maxChunkSize = 1376280;
    const fileSize = fs.statSync(filePath).size;
    const chunkCount = Math.ceil(fileSize / maxChunkSize);

    // Step 1: Send initial upload request
    const initialResponse = await axios.post(
      uploadUrl,
      {
        name: fileName.replace('.zip', ''),
        chunk_count: chunkCount,
        chunk_size: maxChunkSize,
        total_size: fileSize,
        original_file_name: fileName,
      },
      {
        headers: {
          'Cookie': `jwt=${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        },
      }
    );

    console.log('Initial upload response:', initialResponse.data);

    // Step 2: Split file into chunks and upload each chunk
    const fileBuffer = fs.readFileSync(filePath);
    const chunkSize = maxChunkSize; // Use the maximum chunk size
    let offset = 0;
    let chunkIndex = 0;

    const cookie = `jwt=${token}`
    while (offset < fileBuffer.length) {
      const chunk = fileBuffer.slice(offset, offset + chunkSize);

      // Create form data for the chunk
      const formData = new FormData();
      formData.append('chunk', chunk, {
        filename: fileName,
        contentType: 'application/zip'
      });
      formData.append('chunk_id', chunkIndex ); // Ensure correct chunk ID format
      formData.append('chunk_index', chunkIndex);
      const chunkResponse = await axios.post(uploadChunkUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          Cookie: cookie,
        },
      });

      console.log(`Chunk ${chunkIndex} uploaded:`, chunkResponse.data);

      offset += chunkSize;
      chunkIndex++;
    }

    console.log('File upload completed successfully!');
    // Step 3: Send complete-upload request
    try {
      const completeUploadResponse = await axios.post(
        'https://portal-api.cfx.re/v1/assets/' + assetId + '/complete-upload',
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            Cookie: cookie,
          },
        }
      );
      console.log('Complete upload response:', completeUploadResponse.data);
    } catch (error) {
      console.error('Error during complete upload:', error.response?.data || error.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  const scriptName = process.argv[2];
  const type = process.argv[3];  // 'escrow' or 'opensource'
  const filePath = process.argv[4]?.replace(/^["']|["']$/g, '');

  if (!scriptName || !type || !filePath) {
    console.error('Please provide all required arguments');
    console.error('Usage: node uploader.js <script-name> <escrow|opensource> "path/to/file.zip"');
    process.exit(1);
  }

  if (!config.scripts[scriptName]) {
    console.error(`Script "${scriptName}" not found in config`);
    console.error('Available scripts:', Object.keys(config.scripts).join(', '));
    process.exit(1);
  }

  if (!['escrow', 'opensource'].includes(type)) {
    console.error('Type must be either "escrow" or "opensource"');
    process.exit(1);
  }

  const assetId = config.scripts[scriptName][type];
  
  try {
    await uploadFile(filePath, assetId);
    console.log(`Successfully uploaded ${filePath} to ${scriptName} ${type}`);
  } catch (error) {
    console.error('Upload failed:', error.message);
    process.exit(1);
  }
}

main();
