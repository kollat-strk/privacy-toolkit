# Starknet Privacy Toolkit - Setup & Deployment Guide

## Overview

This document tracks the installation, setup, and deployment process for the Starknet Privacy Toolkit (Balance Tier ZK Proof).

---

## What Was Accomplished

### 1. Tool Installation

Successfully installed all required tools:

| Tool | Version | Status |
|------|---------|--------|
| Noir (nargo) | 1.0.0-beta.1 | ✓ Installed |
| Barretenberg (bb) | 0.67.0 | ✓ Installed |
| Garaga | 0.15.5 | ✓ Installed (in `garaga-env`) |
| Bun | Latest | ✓ Installed |
| Scarb | 2.9.2 (also tested 2.10.0, 2.8.0, 2.7.0) | ✓ Installed |
| Starkli | 0.4.2 | ✓ Installed |
| jq | 1.7.1 | ✓ Installed |
| starknet-foundry | 0.57.0 | ✓ Installed |

### 2. Circuit Compilation

- ✓ Fixed `zk-badges/balance_tier/Nargo.toml` to use correct poseidon dependency
- ✓ Circuit builds successfully
- ✓ All 5 tests pass:
  - test_plankton ✓
  - test_fish ✓
  - test_shrimp ✓
  - test_dolphin ✓
  - test_whale ✓

### 3. Verifier Contract

- ✓ Fixed `balance_tier_verifier/Scarb.toml` (updated starknet version)
- ✓ Fixed `balance_tier_verifier/src/lib.cairo` to use new Map API:
  - Changed `LegacyMap` to `Map`
  - Added `StorageMapReadAccess` and `StorageMapWriteAccess` imports
- ✓ Contract compiles successfully

### 4. API Server

- ✓ API server runs on port 3001
- ✓ Proof generation works via `/api/generate-balance-proof`
- ✓ Returns calldata for on-chain verification

### 5. Account Deployment

- ✓ Created and deployed account on Starknet Sepolia
- ✓ Account is funded and active

---

## Errors Encountered

### 1. Noir Dependency Resolution

**Error:**
```
Cloning into '...noir-plugins.git/v0.1.0'...
fatal: could not read Username
```

**Solution:** Changed poseidon dependency in `Nargo.toml` from:
```toml
poseidon = { tag = "v0.1.0", git = "https://github.com/noir-lang/noir-plugins.git", branch = "main" }
```
to:
```toml
poseidon = { git = "https://github.com/noir-lang/poseidon", tag = "v0.1.1" }
```

### 2. Missing Type Field

**Error:**
```
Missing `type` field in Nargo.toml
```

**Solution:** Added `type = "bin"` to the package section.

### 3. Barretenberg Missing jq

**Error:**
```
sh: 1: jq: not found
```

**Solution:** `sudo apt-get install -y jq`

### 4. Cairo Contract API Changes

**Error:**
```
Method `write` not found on type `core::starknet::storage::...`
```

**Solution:** Updated to use new storage API:
```cairo
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

// In Storage struct:
verified_categories: Map<felt252, u8>,

// Instead of deprecated:
verified_categories: LegacyMap::<felt252, u8>,
```

### 5. Scarb/Sierra Format Compatibility (UNRESOLVED)

**Error:**
```
Error: failed to parse contract artifact
```

**Root Cause:** Scarb 2.7.0+ produces a new Sierra format that starkli 0.4.2 cannot parse. The Sierra file has keys like `type_declarations`, `libfunc_declarations`, `statements`, `funcs` but starkli expects the old format with `sierra_program` and `abi`.

**Attempted Solutions:**
- Tried Scarb 2.10.0, 2.9.2, 2.8.0, 2.7.0, 2.6.0 - all produce new Sierra format
- Tried starkli with --compiler-path to use universal-sierra-compiler - still fails
- This is a known unfixed issue in starkli (GitHub issues #77, #89)
- Scarb 2.6.0 compiles but requires LegacyMap API changes which breaks compatibility

**Status:** Contract compiles but cannot be declared/deployed due to toolchain incompatibility. This is a known bug in starkli.

**Workaround:** Use GitHub Codespaces (recommended) or wait for starkli to fix the issue.

---

## Wallet & Account Information

### Account Used for Deployment

| Property | Value |
|----------|-------|
| **Private Key** | `0x077db7ff95beddf93ab0ef656e44f90e5c7671c989a7dc8a995c3d4cc830fe62` |
| **Public Key** | `0x3c6701254a6d8d6376d111a3acd0328815f37c7099931f348dc26631033bad4` |
| **Account Address** | `0x015c94f8cf04a7c6187e9f70e1d85212e0e0b51ecedc0d7ad5a7bc35dccbe993` |
| **Deployed** | Yes |
| **Network** | Starknet Sepolia |
| **RPC Used** | `https://starknet-sepolia-rpc.publicnode.com` |

### Original Wallet (Not Deployed)

| Property | Value |
|----------|-------|
| **Private Key** | `0x069ada05411fa077eae5e661a5112fff4c7348c63ca17d565c15d40c19b8e1c9` |
| **Address** | `0x771d5e7e86ab8324bb10c46e2d0d5a4c1876fe5154b84d46bef3550a9eb8e95` |

---

## How to Deploy (Recommended: Codespaces)

### Option 1: GitHub Codespaces (Recommended)

The README recommends using GitHub Codespaces for proof generation and verifier builds due to OS compatibility issues.

1. Create a GitHub Codespace on the repo
2. Run:
   ```bash
   chmod +x setup-codespace.sh && ./setup-codespace.sh
   ```
3. Start the proof API:
   ```bash
   source garaga-env/bin/activate
   bun run api
   ```
4. Make port `3001` public if you want the web UI to call the API remotely

### Option 2: Local Deployment (If Tools Compatible)

#### Step 1: Install Tools (if not already)

```bash
# Noir
curl -L https://noirup.dev | bash && source ~/.bashrc
noirup --version 1.0.0-beta.1

# Barretenberg
curl -L https://bbup.dev | bash && source ~/.bashrc
bbup --version 0.67.0

# Garaga (needs Python 3.10 specifically)
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt-get install -y python3.10 python3.10-venv python3.10-dev
python3.10 -m venv garaga-env
source garaga-env/bin/activate && pip install garaga==0.15.5

# Bun
curl -fsSL https://bun.sh/install | bash

# Scarb (use version 2.9.2 or compatible)
# See: https://docs.swmansion.com/scarb/download

# Starkli
curl https://get.starkli.sh | sh
starkliup
```

#### Step 2: Install Dependencies

```bash
bun install
```

#### Step 3: Build the Circuit

```bash
cd zk-badges/balance_tier
nargo build
nargo test
```

#### Step 4: Build the Verifier Contract

```bash
cd balance_tier_verifier
scarb build
```

#### Step 5: Set Up Wallet

```bash
# Create account from private key
starkli account oz init myaccount --private-key YOUR_PRIVATE_KEY

# Check balance
starkli balance ACCOUNT_ADDRESS --rpc https://starknet-sepolia-rpc.publicnode.com

# Deploy account (if not deployed)
starkli account deploy myaccount --rpc https://starknet-sepolia-rpc.publicnode.com
```

#### Step 6: Declare & Deploy Contract

```bash
# Declare the contract
starkli declare target/dev/balance_tier_verifier.sierra.json \
  --account myaccount \
  --rpc https://starknet-sepolia-rpc.publicnode.com

# Deploy (replace CLASS_HASH with output from declare)
starkli deploy CLASS_HASH --rpc https://starknet-sepolia-rpc.publicnode.com
```

#### Step 7: Update Deployment Config

Edit `deployments/sepolia.json` with deployed addresses:

```json
"BalanceTierVerifier": {
  "class_hash": "<CLASS_HASH_FROM_DECLARE>",
  "address": "<DEPLOYED_ADDRESS>",
  "declaration_tx": "<TX_HASH>",
  "deployment_tx": "<TX_HASH>"
}
```

#### Step 8: Run the API

```bash
source garaga-env/bin/activate
bun run api
```

#### Step 9: Generate Proof

```bash
curl -X POST http://localhost:3001/api/generate-balance-proof \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "48c0122b-294c-4df8-bf73-a96881228344",
    "value": 50000,
    "datetime": 1700000000
  }'
```

---

## Current Limitations

1. **Verifier Contract Deployment**: Due to Scarb 2.16 / starkli 0.4.2 incompatibility, the verifier contract cannot be declared/deployed locally. The recommended workaround is to use GitHub Codespaces.

2. **Sepolia ETH Required**: Account deployment and contract deployment require Sepolia STRK tokens. Use faucet: https://starknet-faucet.vercel.app/

---

## Files Modified

1. `zk-badges/balance_tier/Nargo.toml` - Fixed poseidon dependency
2. `balance_tier_verifier/Scarb.toml` - Updated starknet version
3. `balance_tier_verifier/src/lib.cairo` - Updated to new Map API

---

## References

- Original README: `README.md`
- Tutorial: https://espejel.bearblog.dev/starknet-privacy-toolkit/
- Scarb: https://docs.swmansion.com/scarb/
- Starkli: https://book.starkli.rs/
- Noir: https://noir-lang.github.io/noir_cheat_sheet/

---

## Goal
Deploy a ZK proof system on Starknet Sepolia using the Starknet Privacy Toolkit (Balance Tier ZK Proof). This includes:
1. Building the Noir circuit for balance tier classification
2. Compiling the Cairo verifier contract
3. Deploying the verifier to Starknet Sepolia
4. Running the proof generation API
## Instructions
- Use manual installation steps from README.md
- Fix dependency and API compatibility issues as they arise
- Document all work in `docs/SETUP_DEPLOYMENT.md`
- Continue deployment to Sepolia testnet
## Discoveries
1. **Noir Dependency Issue**: The poseidon dependency in `Nargo.toml` was pointing to non-existent `noir-plugins.git`. Fixed by changing to `https://github.com/noir-lang/poseidon` with tag `v0.1.1`.
2. **Cairo API Changes**: Scarb 2.16 uses new storage API. Had to change `LegacyMap` to `Map` and add `StorageMapReadAccess`/`StorageMapWriteAccess` imports in the verifier contract.
3. **Tool Compatibility Issue (UNRESOLVED)**: Scarb 2.16 produces a Sierra format that starkli 0.4.2 cannot parse. The Sierra file has keys like `type_declarations`, `libfunc_declarations`, `statements` but starkli expects the old format with `sierra_program` and `abi`. This prevents contract declaration/deployment.
4. **RPC Issues**: Multiple RPC endpoints were tested. `https://starknet-sepolia-rpc.publicnode.com` works best for starkli.
5. **Account Successfully Deployed**: The wallet with private key `0x077db7ff95beddf93ab0ef656e44f90e5c7671c989a7dc8a995c3d4cc830fe62` was deployed to `0x015c94f8cf04a7c6187e9f70e1d85212e0e0b51ecedc0d7ad5a7bc35dccbe993` on Sepolia.
## Accomplished
- ✓ Installed all tools: Noir 1.0.0-beta.1, Barretenberg 0.67.0, Garaga 0.15.5, Bun, Scarb 2.16.0, Starkli 0.4.2
- ✓ Fixed and built Noir circuit (`zk-badges/balance_tier`) - all 5 tests pass
- ✓ Fixed and compiled Cairo verifier contract (`balance_tier_verifier`)
- ✓ API server runs and generates proofs successfully
- ✓ Account deployed on Sepolia
- ✗ Verifier contract NOT deployed (tool compatibility issue)
- ✓ Created documentation at `docs/SETUP_DEPLOYMENT.md`
## Relevant files / directories
### Modified Files
- `zk-badges/balance_tier/Nargo.toml` - Fixed poseidon dependency
- `balance_tier_verifier/Scarb.toml` - Updated starknet version
- `balance_tier_verifier/src/lib.cairo` - Updated to new Map API
- `docs/SETUP_DEPLOYMENT.md` - Created documentation
### Key Directories
- `zk-badges/balance_tier/` - Noir circuit
- `balance_tier_verifier/` - Cairo verifier contract
- `api/` - Proof generation server
- `deployments/` - Deployment config (sepolia.json)
### Build Artifacts
- `zk-badges/balance_tier/target/` - Compiled Noir circuit
- `balance_tier_verifier/target/dev/` - Compiled Cairo contract
### Wallet Info
- **Private Key**: `0x077db7ff95beddf93ab0ef656e44f90e5c7671c989a7dc8a995c3d4cc830fe62`
- **Account Address**: `0x015c94f8cf04a7c6187e9f70e1d85212e0e0b51ecedc0d7ad5a7bc35dccbe993`
- **Deployed**: Yes, on Sepolia
## Next Steps
1. **Resolve deployment issue**: Either:
   - Use GitHub Codespaces (recommended in README) for compatible toolchain
   - Or find compatible Scarb/starkli version combination
   
2. **Deploy verifier contract**: Once deployment works, declare and deploy `BalanceTierVerifier`
3. **Update deployments/sepolia.json**: Add the deployed class hash and address
4. **Test full flow**: Generate proof via API and verify on-chain

*Last Updated: 2026-02-26*
