# Starknet Privacy Toolkit (Tongo + Garaga/Noir)

End-to-end reference implementation for private transfers (Tongo) and ZK proofs powered by Noir + Garaga. The donation badge is a use case demo of the ZK stack, not the core product.

---

## Overview

The Starknet Privacy Toolkit implements a **Balance Tier ZK Proof System** that allows users to prove their token balance tier (e.g., plankton, fish, shrimp, dolphin, whale) without revealing their exact balance. This is useful for:
- Airdrop eligibility verification
- Tier-based access control
- Privacy-preserving credit scoring
- Anonymous balance verification

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   User Wallet   │────▶│  Proof API   │────▶│  Verifier Contract  │
│                 │     │  (Bun/Node)  │     │  (Starknet Sepolia) │
└─────────────────┘     └──────────────┘     └─────────────────────┘
                               │                       │
                               ▼                       ▼
                        ┌──────────────┐     ┌─────────────────────┐
                        │    Noir      │     │    On-Chain         │
                        │  Circuit     │     │    Verification     │
                        │(Barretenberg)│     │                     │
                        └──────────────┘     └─────────────────────┘
```

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Noir Circuit (balance_tier) | ✅ Working | Compiles, all 5 tests pass |
| Verifier Contract | ✅ Compiles | Compiles with Scarb 2.9.2 |
| Proof API | ✅ Working | Runs on port 3001 |
| Account Deployment | ✅ Deployed | On Starknet Sepolia |
| Verifier Deployment | ❌ Blocked | Known starkli/Scarb compatibility issue |

---

## Installation

### Prerequisites

- **Node.js/Bun**: For running the API server
- **Noir (nargo)**: For compiling ZK circuits
- **Barretenberg (bb)**: For generating proofs
- **Garaga**: For converting proofs to Starknet calldata
- **Scarb**: For compiling Cairo contracts
- **Starkli**: For deploying to Starknet

### Quick Install (Recommended: GitHub Codespaces)

The easiest way to get started is using GitHub Codespaces:

1. Create a GitHub Codespace on this repository
2. Run the setup script:
   ```bash
   chmod +x setup-codespace.sh && ./setup-codespace.sh
   ```
3. Start the API:
   ```bash
   source garaga-env/bin/activate
   bun run api
   ```
4. Make port `3001` public for remote API access

### Manual Installation

#### 1. Install Noir

```bash
curl -L https://noirup.dev | bash
source ~/.bashrc
noirup --version 1.0.0-beta.1
```

#### 2. Install Barretenberg

```bash
curl -L https://bbup.dev | bash
source ~/.bashrc
bbup --version 0.67.0
sudo apt-get install -y libc++-dev libc++abi-dev
```

#### 3. Install Garaga (Python 3.10 required)

```bash
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt-get install -y python3.10 python3.10-venv python3.10-dev
python3.10 -m venv garaga-env
source garaga-env/bin/activate
pip install garaga==0.15.5
```

#### 4. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

#### 5. Install Scarb

```bash
curl -sSf https://docs.swmansion.com/scarb/install.sh | sh
```

#### 6. Install Starkli

```bash
curl https://get.starkli.sh | sh
starkliup
```

#### 7. Install Project Dependencies

```bash
bun install
```

### Verify Installation

```bash
nargo --version   # Should show: 1.0.0-beta.1
bb --version      # Should show: 0.67.0
scarb --version   # Should show: 2.9.x
starkli --version # Should show: 0.4.x
```

---

## Project Structure

```
starknet-privacy-toolkit/
├── api/                      # Proof generation API server
│   └── server.ts             # Bun server with proof endpoints
├── balance_tier_verifier/    # Cairo verifier contract
│   ├── Scarb.toml           # Contract dependencies
│   └── src/lib.cairo        # Verifier contract code
├── zk-badges/
│   ├── balance_tier/        # Noir circuit for balance tiers
│   │   ├── Nargo.toml       # Circuit configuration
│   │   └── src/main.nr      # Circuit source
│   └── donation_badge/      # Legacy donation badge circuit
├── deployments/             # Deployment configs
│   └── sepolia.json         # Sepolia network config
├── docs/                    # Documentation
│   └── SETUP_DEPLOYMENT.md # Setup & deployment guide
└── src/                    # Frontend/UI code
```

---

## Usage

### Running the API Server

```bash
# Activate garaga environment
source garaga-env/bin/activate

# Start the API server
bun run api
```

The API runs on `http://localhost:3001`

### API Endpoints

#### Generate Balance Tier Proof

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
  "calldata": "[...]",
  "success": true
}
```

#### Generate Donation Badge Proof (Legacy)

```bash
curl -X POST http://localhost:3001/api/generate-proof \
  -H "Content-Type: application/json" \
  -d '{
    "donationamount": 1000,
    "threshold": 100,
    "donorsecret": "1234567890",
    "badgetier": 1
  }'
```

---

## Building the Circuit

### Balance Tier Circuit

```bash
cd zk-badges/balance_tier

# Build the circuit
nargo build

# Run tests
nargo test
```

**Test tiers:**
- `test_plankton` - value < 1000
- `test_fish` - value < 5000
- `test_shrimp` - value < 10000
- `test_dolphin` - value < 50000
- `test_whale` - value >= 50000

---

## Building the Verifier Contract

```bash
cd balance_tier_verifier

# Build the contract
scarb build
```

The compiled artifacts will be in `target/dev/`

---

## Deployment

### Account Setup

```bash
# Create account from private key
starkli account oz init myaccount --private-key YOUR_PRIVATE_KEY

# Deploy account (if not already deployed)
starkli account deploy myaccount --rpc https://starknet-sepolia-rpc.publicnode.com
```

### Declare & Deploy Contract

⚠️ **Known Issue**: There's a compatibility issue between starkli and Scarb that prevents contract declaration. See [Known Issues](#known-issues) below.

```bash
# Declare the contract (currently blocked by known issue)
starkli declare target/dev/balance_tier_verifier.sierra.json \
  --account myaccount \
  --rpc https://starknet-sepolia-rpc.publicnode.com

# Deploy (after declaring)
starkli deploy CLASS_HASH --rpc https://starknet-sepolia-rpc.publicnode.com
```

### Update Deployment Config

After deployment, update `deployments/sepolia.json`:

```json
"BalanceTierVerifier": {
  "class_hash": "<CLASS_HASH_FROM_DECLARE>",
  "address": "<DEPLOYED_ADDRESS>",
  "declaration_tx": "<TX_HASH>",
  "deployment_tx": "<TX_HASH>"
}
```

---

## Known Issues

### Scarb/Sierra Format Compatibility Issue

**Issue**: starkli 0.4.2 cannot parse Sierra artifacts produced by Scarb 2.7.0+

**Error**:
```
Error: failed to parse contract artifact
```

**Root Cause**: Scarb 2.7.0+ produces a new Sierra format with keys like:
- `type_declarations`
- `libfunc_declarations`  
- `statements`
- `funcs`

Starkli expects the old format with:
- `sierra_program`
- `abi`

**Sierra Format Difference**:

Old format (expected by starkli):
```json
{
  "sierra_program": [...],
  "abi": [...],
  "entry_points_by_type": {...}
}
```

New format (produced by Scarb 2.7.0+):
```json
{
  "version": 1,
  "type_declarations": [...],
  "libfunc_declarations": [...],
  "statements": [...],
  "funcs": [...]
}
```

**Versions Tested**:
| Scarb Version | Cairo Version | Sierra Version | Works with starkli? |
|---------------|--------------|----------------|---------------------|
| 2.10.0 | 2.10.0 | 1.7.0 | ❌ No |
| 2.9.2 | 2.9.2 | 1.6.0 | ❌ No |
| 2.8.0 | 2.8.0 | 1.6.0 | ❌ No |
| 2.7.0 | 2.7.0 | 1.6.0 | ❌ No |
| 2.6.0 | 2.6.0 | 1.5.0 | ❌ No |

**Status**: This is a known unfixed issue in starkli:
- [GitHub Issue #77](https://github.com/xJonathanLEI/starkli/issues/77) - Open since March 2024
- [GitHub Issue #89](https://github.com/xJonathanLEI/starkli/issues/89) - Open since June 2024

**Attempted Solutions** (all failed):
1. ✅ Tried Scarb 2.10.0, 2.9.2, 2.8.0, 2.7.0, 2.6.0 - all produce new Sierra format
2. ✅ Tried using `--compiler-path` with universal-sierra-compiler from starknet-foundry - still fails
3. ✅ Tried downgrading to Scarb 2.6.0 with LegacyMap API - produces same new format

**Workarounds**:
1. **Use GitHub Codespaces** (recommended) - The codespace environment may have compatible tool versions pre-configured
2. **Wait for starkli fix** - Monitor starkli releases for a fix to Sierra parsing
3. **Use starknet-foundry (sncast)** as an alternative deployment tool:
   ```bash
   # Install starknet-foundry
   curl -sL https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh
   snfoundryup
   
   # Declare using sncast
   sncast --network sepolia declare --class-path target/dev/contract.sierra.json
   ```
4. **Use alternative RPC/deployment** - Some development frameworks may handle the conversion automatically

**Impact**: The BalanceTierVerifier contract compiles successfully but cannot be declared/deployed to Starknet using starkli due to this compatibility issue.

---

## Wallet & Account Information

### Deployed Account (Sepolia)

| Property | Value |
|----------|-------|
| Private Key | `0x077db7ff95beddf93ab0ef656e44f90e5c7671c989a7dc8a995c3d4cc830fe62` |
| Public Key | `0x3c6701254a6d8d6376d111a3acd0328815f37c7099931f348dc26631033bad4` |
| Account Address | `0x015c94f8cf04a7c6187e9f70e1d85212e0e0b51ecedc0d7ad5a7bc35dccbe993` |
| Network | Starknet Sepolia |
| Status | Deployed |

### RPC Endpoints

- **Alchemy**: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/YOUR_API_KEY`
- **PublicNode**: `https://starknet-sepolia-rpc.publicnode.com`

---

## Deployed Contracts

### Sepolia Testnet

| Contract | Address | Description |
|----------|---------|-------------|
| DonationBadge | `0x077ca6f2ee4624e51ed6ea6d5ca292889ca7437a0c887bf0d63f055f42ad7010` | Badge NFT contract |
| UltraKeccakHonkVerifier | `0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669` | Proof verifier |
| BalanceTierVerifier | `TODO` | Not deployed (see Known Issues) |

---

## Development

### Running Tests

```bash
# Type check
bun run type-check

# Health check
bun run check:health

# Test Noir circuit
cd zk-badges/balance_tier && nargo test

# Test Cairo contract
cd balance_tier_verifier && scarb build
```

### Building for Production

```bash
# Install dependencies
bun install

# Build web assets
bun run build:web
```

---

## Troubleshooting

### Noir Installation Issues

If `noirup.dev` fails, use the GitHub mirror:

```bash
curl -fsSL https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
```

### Barretenberg Issues

Ensure libc++ is installed:

```bash
sudo apt-get install -y libc++-dev libc++abi-dev
```

### Garaga Issues

Garaga requires Python 3.10 specifically. If you have multiple Python versions:

```bash
python3.10 -m venv garaga-env
source garaga-env/bin/activate
pip install garaga==0.15.5
```

### Network/DNS Issues in Codespaces

If you see DNS resolution errors in Codespaces:
1. Restart the Codespace
2. Re-run the setup script
3. Wait a few minutes and try again (Codespaces DNS can be flaky)

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| ZK Circuit | Noir | 1.0.0-beta.1 |
| Prover | Barretenberg | 0.67.0 |
| Proof Converter | Garaga | 0.15.5 |
| Contract Language | Cairo | 2.x |
| Package Manager | Scarb | 2.9.2 |
| CLI Tool | Starkli | 0.4.2 |
| Runtime | Bun | Latest |
| RPC | Alchemy/PublicNode | - |

---

## References

- [Full Tutorial](https://espejel.bearblog.dev/starknet-privacy-toolkit/)
- [Noir Documentation](https://noir-lang.github.io/noir_cheat_sheet/)
- [Scarb Documentation](https://docs.swmansion.com/scarb/)
- [Starkli Book](https://book.starkli.rs/)
- [Starknet Documentation](https://docs.starknet.io/)

---

## License

MIT License - see `LICENSE` file for details.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
