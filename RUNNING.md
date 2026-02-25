# Balance Tier ZK Proof - How to Run

This guide explains how to generate and verify ZK proofs for balance tier classification on Starknet Sepolia.

## Prerequisites

- [ ] Noir 1.0.0-beta.1 installed
- [ ] Barretenberg 0.67.0 installed
- [ ] Garaga 0.15.5 installed (Python 3.10)
- [ ] Bun installed
- [ ] Scarb installed
- [ ] Starkli installed and configured

## Quick Start

### 1. Build the Circuit

```bash
cd zk-badges/balance_tier
nargo build
nargo test
```

Expected output: All 5 tests pass (plankton, fish, shrimp, dolphin, whale)

### 2. Deploy the Verifier Contract

```bash
cd balance_tier_verifier
scarb build

# Declare the contract
starkli declare target/dev/balance_tier_verifier_BalanceTierVerifier.json --network sepolia

# Deploy (replace CLASS_HASH with the output from declare)
# The second argument is the UltraKeccakHonkVerifier address
starkli deploy <CLASS_HASH> 0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669 --network sepolia
```

### 3. Update Deployment Addresses

Edit `deployments/sepolia.json` with the deployed contract addresses:

```json
"BalanceTierVerifier": {
  "class_hash": "<CLASS_HASH_FROM_DECLARE>",
  "address": "<DEPLOYED_ADDRESS>",
  "declaration_tx": "<TX_HASH>",
  "deployment_tx": "<TX_HASH>"
}
```

### 4. Start the API Server

```bash
source garaga-env/bin/activate
bun run api
```

The API runs on `http://localhost:3001`

### 5. Generate a Proof

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

### 6. Verify On-Chain

```bash
starkli call <DEPLOYED_ADDRESS> get_verified_category <OWNER_ID> --network sepolia
```

## Balance Tier Categories

| Category | Name | Balance Range |
|----------|------|---------------|
| 0 | plankton | < $10 |
| 1 | fish | $10 - $249 |
| 2 | shrimp | $250 - $1,000 |
| 3 | dolphin | $1,001 - $10,000 |
| 4 | whale | > $10,000 |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-balance-proof` | POST | Generate ZK proof for balance tier |
| `/api/generate-proof` | POST | Generate proof for donation badge (existing) |

## Troubleshooting

### nargo: command not found
```bash
source ~/.bashrc
export PATH="$HOME/.nargo/bin:$PATH"
```

### bb: command not found
```bash
source ~/.bashrc
export PATH="$HOME/.bb:$PATH"
```

### Garaga import error
Ensure Python 3.10 venv is activated:
```bash
source garaga-env/bin/activate
```

### Starkli not found
```bash
source ~/.bashrc
export PATH="$HOME/.starkli/bin:$PATH"
```

## Files Overview

| File | Description |
|------|-------------|
| `zk-badges/balance_tier/src/main.nr` | Noir circuit for tier classification |
| `balance_tier_verifier/src/lib.cairo` | Starknet verifier contract |
| `src/balance-tier-service.ts` | TypeScript service for proof generation |
| `api/server.ts` | Bun API server with proof generation endpoint |
