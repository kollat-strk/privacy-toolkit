# Deploy BalanceTierVerifier to Local Starknet

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the compiled BalanceTierVerifier contract to a local Starknet devnet and update deployments config.

**Architecture:** The verifier contract is already compiled. Need to start a local devnet, declare class hash, then deploy using Starkli (or cast).

**Tech Stack:** Scarb 2.8.0, Starkli, Katana (local devnet)

---

### Task 1: Install Local Devnet (Katana)

**Step 1: Install Katana**

```bash
# Using starknet-foundry
curl -L https://github.com/foundry-rs/starknet-foundry/releases/latest/download/starknet-foundry_x86_64-unknown-linux-gnu.tar.gz -o /tmp/snfoundry.tar.gz
tar -xzf /tmp/snfoundry.tar.gz -C ~/.cargo/bin/
```

Or install via cargo:
```bash
cargo install starknet-foundry --locked
```

**Step 2: Verify installation**

```bash
katana --version
```

Expected: `katana x.x.x`

---

### Task 2: Start Local Devnet

**Step 1: Start Katana**

```bash
katana --host 0.0.0.0 --port 5050
```

This starts a local Starknet node on `http://localhost:5050` with pre-funded accounts.

**Step 2: Note the RPC URL and accounts**

Default RPC: `http://localhost:5050/rpc`

Pre-funded account (for deployment):
- Address: `0x03...` (shown in katana output)
- Private key: `0x00...` (shown in katana output)

---

### Task 3: Get Starkli Working (or use cast)

**Option A: Try Starkli again**

```bash
# Try installing starkli without --locked
cargo install starkli
```

If that fails, use Option B.

**Option B: Use starknet-foundry's sncast**

```bash
# Verify sncast works
sncast --version
```

---

### Task 4: Configure Starkli/cast for Local Network

**For Starkli:**

```bash
starkli config set network local
starkli config set rpc http://localhost:5050/rpc
starkli config set account <KATANA_ACCOUNT_ADDRESS>
starkli config set keystore <PATH_TO_KEYSTORE>
```

**For cast:**

```bash
# Set environment variables
export STARKNET_RPC=http://localhost:5050/rpc
export STARKNET_ACCOUNT=<KATANA_ACCOUNT_ADDRESS>
export STARKNET_PRIVATE_KEY=<KATANA_PRIVATE_KEY>
```

---

### Task 5: Declare Contract Class

**Files:**
- Source: `balance_tier_verifier/target/dev/balance_tier_verifier.sierra.json`

**Using sncast:**

```bash
cd balance_tier_verifier
sncast declare --contract target/dev/balance_tier_verifier.sierra.json --network local
```

Expected output: Returns a `class_hash` (starts with `0x`)

---

### Task 6: Deploy the Contract

**Using sncast:**

```bash
sncast deploy <CLASS_HASH> --network local
```

Expected output: Returns contract address (starts with `0x`)

Example output:
```
Deploying contract...
Contract deployed at: 0x0123456789abcdef...
```

---

### Task 7: Update Deployments Config

**Files:**
- Modify: `deployments/local.json` (create new file)

**Step 1: Create local deployments file**

```json
{
  "network": "local",
  "rpc_url": "http://localhost:5050/rpc",
  "deployer_account": "<KATANA_ACCOUNT_ADDRESS>",
  "last_updated": "2026-02-26T00:00:00Z",
  "contracts": {
    "BalanceTierVerifier": {
      "class_hash": "0x<actual_class_hash>",
      "address": "0x<actual_deployed_address>",
      "declaration_tx": "0x<tx_hash_from_declare>",
      "deployment_tx": "0x<tx_hash_from_deploy>",
      "artifact": "balance_tier_verifier/target/dev/balance_tier_verifier_BalanceTierVerifier.compiled_contract_class.json"
    }
  },
  "notes": [
    "Deployed to local Katana devnet",
    "Compiled with Scarb 2.8.0"
  ]
}
```

---

### Task 8: Update API Config

**Files:**
- Modify: `.env` or `src/balance-tier-service.ts`

**Step 1: Update RPC URL to local**

If the API currently uses Sepolia, update it to use local:

```bash
# In .env
STARKNET_RPC_URL=http://localhost:5050/rpc
```

Or update the service file to use local verifier address.

---

### Task 9: Verify Deployment

**Step 1: Check contract is deployed**

```bash
sncast get-class-hash-at <CONTRACT_ADDRESS> --network local
```

**Step 2: Test proof verification**

```bash
# Generate proof
curl -s -X POST http://localhost:3001/api/generate-balance-proof \
  -H "Content-Type: application/json" \
  -d '{"owner_id": "test-uuid", "value": 50000, "datetime": 1700000000}'
```

Then call the verifier contract with the calldata to verify on local devnet.

---

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Katana port in use | Use `--port 5051` or kill existing process |
| No pre-funded account | Katana provides 2 accounts by default |
| sncast not found | Ensure starknet-foundry is in PATH |
| Contract declare fails | Ensure `target/dev/balance_tier_verifier.sierra.json` exists |
| API can't connect | Ensure devnet is running and accessible |
