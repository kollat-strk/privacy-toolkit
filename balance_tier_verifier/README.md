# Balance Tier Verifier

ZK-powered balance tier verification system for Starknet Sepolia.

## Contracts

| Network | Contract | Address |
|---------|----------|---------|
| Sepolia | BalanceTierVerifier | `TODO: deploy` |
| Sepolia | UltraKeccakHonkVerifier | `0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669` |

## Deployment

### Prerequisites

```bash
# Install Scarb
curl --proto '=https' --tlsv1.2 -sSf https://docs.scarb.sh/install.sh | sh

# Or via cargo
cargo install scarb
```

### Build

```bash
cd balance_tier_verifier
scarb build
```

### Deploy to Sepolia

Using Starkli:

```bash
# Set up environment
export STARKNET_ACCOUNT=~/.starknet_accounts/deployer.json
export STARKNET_KEY_PASSWORD=your_password

# Declare contract
starkli declare target/dev/balance_tier_verifier_BalanceTierVerifier.json --network sepolia

# Deploy (replace CLASS_HASH with output from declare)
starkli deploy <CLASS_HASH> <VERIFIER_ADDRESS> --network sepolia
```

Replace `<VERIFIER_ADDRESS>` with the existing UltraKeccakHonkVerifier address:
`0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669`

## Usage

### Generate Proof

```bash
# Start the API
bun run api

# Generate balance tier proof
curl -X POST http://localhost:3001/api/generate-balance-proof \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "48c0122b-294c-4df8-bf73-a96881228344",
    "value": 50000,
    "datetime": 1700000000
  }'
```

### Verify On-Chain

```typescript
import { Account, Contract } from 'starknet';

// After getting proof from API
const verifier = new Contract(abi, VERIFIER_ADDRESS, account);
await verifier.verify_and_claim(proof, ownerId, category);
```

## Categories

| Category | Name | Balance Range |
|----------|------|---------------|
| 0 | plankton | < $10 |
| 1 | fish | $10 - $249 |
| 2 | shrimp | $250 - $1,000 |
| 3 | dolphin | $1,001 - $10,000 |
| 4 | whale | > $10,000 |
