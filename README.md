# FiveM Asset Exporter

A command-line tool for automatically creating and uploading both escrow and opensource versions of FiveM scripts to cfx.re.

## Features

- Automatically creates escrow and opensource versions
- Handles escrow_ignore settings
- Uploads directly to cfx.re
- Supports multiple scripts configuration

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/fivem-asset-exporter.git
   ```

2. Install dependencies and tool globally:
    ```bash
    npm install
    npm install -g .
    cd fivem-asset-exporter
    ```

## Configuration

1. Create a `.env` file in the tool's directory:
```CFX_JWT=your_cfx_jwt_token_here```

2. Set up your scripts in `config.json`:
    ```json
    {
        "scripts": {
            "pd_mingle": {
                "escrow": "_",
                "opensource": "_"
            }
        }
    }
    ```
## Getting your CFX JWT Token
1.    Login to cfx.re

2.    Open browser developer tools (F12)

3.    Go to Application > Cookies > cfx.re

4.    Copy the 'jwt' cookie value

## Usage
Navigate to your script directory (where `fxmanifest.lua` is located) and use one of these commands:
```bash
# Create and upload escrow version
asset-exporter escrow

# Create and upload opensource version
asset-exporter opensource

# Create and upload both versions
asset-exporter both
```

## Expected Directory Structure
```md
your-script/
├── client/
├── server/
├── shared/
└── fxmanifest.lua
```

- In the escrow version, the `/shared` folder will be ignored.