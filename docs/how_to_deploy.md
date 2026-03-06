# How to Deploy - Starknet Privacy Toolkit

This guide documents the complete deployment process for the BalanceTierVerifier contract to Starknet Sepolia, based on the actual deployment workflow.

## Prerequisites

- GitHub Codespace (recommended)
- Alchemy API key for Starknet Sepolia
- Existing deployed account (or create new)

## Account Setup

### Using Existing Account

The project has a pre-deployed account:

| Property | Value |
|----------|-------|
| Private Key | `0x077db7ff95beddf93ab0ef656e44f90e5c7671c989a7dc8a995c3d4cc830fe62` |
| Public Key | `0x3c6701254a6d8d6376d111a3acd0328815f37c7099931f348dc26631033bad4` |
| Account Address | `0x015c94f8cf04a7c6187e9f70e1d85212e0e0b51ecedc0d7ad5a7bc35dccbe993` |

### Creating Accounts File

Create the accounts JSON file at `~/.starknet_accounts/starknet_open_zeppelin_accounts.json`:

```bash
mkdir -p ~/.starknet_accounts

cat > ~/.starknet_accounts/starknet_open_zeppelin_accounts.json << 'EOF'
{
  "alpha-sepolia": {
    "myaccount": {
      "version": 1,
      "private_key": "0x077db7ff95beddf93ab0ef656e44f90e5c7671c989a7dc8a995c3d4cc830fe62",
      "public_key": "0x3c6701254a6d8d6376d111a3acd0328815f37c7099931f348dc26631033bad4",
      "address": "0x015c94f8cf04a7c6187e9f70e1d85212e0e0b51ecedc0d7ad5a7bc35dccbe993"
    }
  }
}
EOF
```

## Installation

### 1. Codespace Setup

Create a GitHub Codespace, then run:

```bash
chmod +x setup-codespace.sh && ./setup-codespace.sh
```

This installs:
- Noir 1.0.0-beta.1
- Barretenberg 0.67.0
- Garaga 0.15.5 (Python 3.10)
- Bun
- Project dependencies

### 2. Install Additional Tools

```bash
# Install Scarb
curl -sSf https://docs.swmansion.com/scarb/install.sh | sh
source ~/.bashrc

# Install Starknet Foundry
curl -sL https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh

# Install Starkli
curl https://get.starkli.sh | sh
starkliup
source ~/.bashrc
```

Verify installations:

```bash
scarb --version
sncast --version
starkli --version
```

## Project Configuration

### 1. Configure snfoundry.toml

Create `snfoundry.toml` in the project root:

```bash
cat > snfoundry.toml << 'EOF'
[sncast]
[sncast.sepolia]
url = "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/YOUR_ALCHEMY_API_KEY"
account = "myaccount"
accounts_file = "/home/codespace/.starknet_accounts/starknet_open_zeppelin_accounts.json"
EOF
```

Replace `YOUR_ALCHEMY_API_KEY` with your actual Alchemy API key.

### 2. Update Scarb.toml

The contract's `Scarb.toml` needs the starknet-contract target. Update it:

```bash
cat > balance_tier_verifier/Scarb.toml << 'EOF'
[package]
name = "balance_tier_verifier"
version = "0.1.0"
edition = "2024_07"

[dependencies]
starknet = "2.5"

[lib]
sierra = true
casm = true

[[target.starknet-contract]]

[cairo]
sierra-replace-ids = true
EOF
```

## Build the Contract

```bash
cd balance_tier_verifier
scarb build
```

Expected output shows warnings but should finish successfully.

## Declare the Contract

```bash
cd balance_tier_verifier

sncast -a myaccount -f ~/.starknet_accounts/starknet_open_zeppelin_accounts.json \
  declare --contract-name BalanceTierVerifier \
  --url https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/YOUR_ALCHEMY_API_KEY
```

**Success output:**
```
Success: Declaration completed

Class Hash:       0x2fd86ac67d694a1a3b70502ec7f0a1866d537c01f7e64a2cd3d573bd487e797
Transaction Hash: 0x4e4a7be6630c1c79457726315c0d58995c7d832149d45b0e118783ce1597a5c
```

Save the class hash - you'll need it for deployment.

## Deploy the Contract

```bash
sncast -a myaccount -f ~/.starknet_accounts/starknet_open_zeppelin_accounts.json \
  deploy --class-hash 0x2fd86ac67d694a1a3b70502ec7f0a1866d537c01f7e64a2cd3d573bd487e797 \
  --constructor-args 0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669 \
  --url https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/YOUR_ALCHEMY_API_KEY
```

**Note:** The constructor requires the UltraKeccakHonkVerifier address as argument:
- UltraKeccakHonkVerifier: `0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669`

**Success output:**
```
Success: Deployment completed

Contract Address: 0x01eb1ec37365fd0ec6d95e9ed4a2e8a361f3734e7693ed8ebc5e7eae21324b25
Transaction Hash: 0x07127454a2bf9903406d6471841d608a21adff4318b8607df69e33d4ed98bcc4
```

## Update Deployment Config

Update `deployments/sepolia.json` with the deployed contract details:

```json
{
  "Network": "sepolia",
  "ChainId": "0x534e5",
  "BlockscanUrl": "https://sepolia.voyager.online",
  "RPC": "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/YOUR_ALCHEMY_API_KEY",
  "Contracts": {
    "DonationBadge": {
      "address": "0x077ca6f2ee4624e51ed6ea6d5ca292889ca7437a0c887bf0d63f055f42ad7010",
      "class_hash": "TODO"
    },
    "UltraKeccakHonkVerifier": {
      "address": "0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669",
      "class_hash": "TODO"
    },
    "BalanceTierVerifier": {
      "address": "0x01eb1ec37365fd0ec6d95e9ed4a2e8a361f3734e7693ed8ebc5e7eae21324b25",
      "class_hash": "0x2fd86ac67d694a1a3b70502ec7f0a1866d537c01f7e64a2cd3d573bd487e797",
      "declaration_tx": "0x4e4a7be6630c1c79457726315c0d58995c7d832149d45b0e118783ce1597a5c",
      "deployment_tx": "0x07127454a2bf9903406d6471841d608a21adff4318b8607df69e33d4ed98bcc4"
    }
  }
}
```

## Start the API Server

```bash
source garaga-env/bin/activate
bun run api
```

The API runs on port 3001. Make sure to set port visibility to **Public** in the Codespace Ports tab.

## Test the Proof Generation

Generate a balance tier proof:

```bash
curl -X POST http://localhost:3001/api/generate-balance-proof \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "48c0122b-294c-4df8-bf73-a96881228344",
    "value": 50000,
    "datetime": 1700000000
  }'
```

**Response:**
```json
{
  "calldata": ["0x1234...", ...],
  "success": true
}
```

## Verify On-Chain

Query the verifier contract:

```bash
sncast -a myaccount -f ~/.starknet_accounts/starknet_open_zeppelin_accounts.json \
  call --contract-address 0x01eb1ec37365fd0ec6d95e9ed4a2e8a361f3734e7693ed8ebc5e7eae21324b25 \
  --function get_verified_category \
  --args 0x48c0122b294c4df8bf73a96881228344 \
  --url https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/YOUR_ALCHEMY_API_KEY
```

## Balance Tier Categories

| Category | Name | Balance Range |
|----------|------|---------------|
| 0 | plankton | < $10 |
| 1 | fish | $10 - $249 |
| 2 | shrimp | $250 - $1,000 |
| 3 | dolphin | $1,001 - $10,000 |
| 4 | whale | > $10,000 |

## Troubleshooting

### RPC Version Warning

If you see:
```
[WARNING] RPC node uses incompatible version 0.8.1. Expected version: 0.10.0
```

Use an Alchemy RPC endpoint with v0_10 support.

### Account Not Found

Ensure the accounts file path is correct and the network name matches:
- File uses `alpha-sepolia`
- sncast uses `--url` directly or network from snfoundry.toml

### Scarb Build Warnings

The warnings about unused imports are harmless. The contract compiles successfully.

### Garaga Import Error

Ensure Python 3.10 venv is activated:
```bash
source garaga-env/bin/activate
```

## Deployed Contract Summary

| Property | Value |
|----------|-------|
| Contract Address | `0x01eb1ec37365fd0ec6d95e9ed4a2e8a361f3734e7693ed8ebc5e7eae21324b25` |
| Class Hash | `0x2fd86ac67d694a1a3b70502ec7f0a1866d537c01f7e64a2cd3d573bd487e797` |
| Declaration Tx | `0x4e4a7be6630c1c79457726315c0d58995c7d832149d45b0e118783ce1597a5c` |
| Deployment Tx | `0x07127454a2bf9903406d6471841d608a21adff4318b8607df69e33d4ed98bcc4` |
| Network | Starknet Sepolia |
| Voyager | https://sepolia.voyager.online/contract/0x01eb1ec37365fd0ec6d95e9ed4a2e8a361f3734e7693ed8ebc5e7eae21324b25 |
