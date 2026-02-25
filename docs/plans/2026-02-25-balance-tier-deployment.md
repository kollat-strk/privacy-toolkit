# Balance Tier ZK Proof Deployment Plan

> **For Claude:** This plan is for manual execution in GitHub Codespaces.

**Goal:** Build Noir circuit, deploy verifier to Starknet Sepolia testnet, and verify end-to-end.

**Architecture:** Build balance_tier circuit → Generate proof → Deploy verifier → Verify on-chain

**Tech Stack:** Noir 1.0.0-beta.1, Barretenberg 0.67.0, Garaga 0.15.5, Scarb, Starkli, Starknet Sepolia

---

## Task 1: Set Up Codespaces Environment

**Step 1: Open in Codespaces**

Go to: https://github.com/kollat-strk/privacy-toolkit/tree/feature/balance-tier-zk-proof

Click "Code" → "Create codespace on feature/balance-tier-zk-proof"

**Step 2: Run setup script**

```bash
chmod +x setup-codespace.sh && ./setup-codespace.sh
```

Expected: All tools installed (Noir, Barretenberg, Garaga, Bun)

**Step 3: Verify tools**

```bash
nargo --version  # should say 1.0.0-beta.1
bb --version     # should say 0.67.0
source garaga-env/bin/activate && garaga --version
```

---

## Task 2: Build Noir Circuit

**Files:**
- `zk-badges/balance_tier/src/main.nr`
- `zk-badges/balance_tier/Nargo.toml`

**Step 1: Navigate to circuit**

```bash
cd zk-badges/balance_tier
```

**Step 2: Build circuit**

```bash
nargo build
```

Expected: Creates `target/balance_tier.json`

**Step 3: Run tests**

```bash
nargo test
```

Expected: All 5 tests pass (plankton, fish, shrimp, dolphin, whale)

**Step 4: Commit**

```bash
git add zk-badges/balance_tier/target/
git commit -m "build: compile balance_tier circuit"
```

---

## Task 3: Install Scarb & Starkli

**Step 1: Install Scarb**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://docs.scarb.sh/install.sh | sh
source ~/.bashrc
scarb --version
```

**Step 2: Install Starkli**

```bash
curl https://get.starkli.sh | sh
source ~/.bashrc
starkli --version
```

**Step 3: Set up Starknet account**

```bash
starkli account new deployer
# Follow prompts to create/import wallet
```

---

## Task 4: Deploy Verifier Contract

**Files:**
- `balance_tier_verifier/Scarb.toml`
- `balance_tier_verifier/src/lib.cairo`

**Step 1: Build contract**

```bash
cd balance_tier_verifier
scarb build
```

Expected: Creates `target/dev/balance_tier_verifier_BalanceTierVerifier.json`

**Step 2: Declare contract**

```bash
starkli declare target/dev/balance_tier_verifier_BalanceTierVerifier.json --network sepolia
```

Expected: Outputs a CLASS_HASH (e.g., `0x1234...`)

**Step 3: Deploy contract**

```bash
# Replace CLASS_HASH with output from declare
starkli deploy <CLASS_HASH> 0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669 --network sepolia
```

Expected: Outputs DEPLOYED_ADDRESS (e.g., `0x5678...`)

**Step 4: Update deployments**

Edit `deployments/sepolia.json`:

```json
"BalanceTierVerifier": {
  "class_hash": "<CLASS_HASH_FROM_DECLARE>",
  "address": "<DEPLOYED_ADDRESS>",
  "declaration_tx": "<TX_HASH>",
  "deployment_tx": "<TX_HASH>",
  "artifact": "balance_tier_verifier/target/dev/balance_tier_verifier_BalanceTierVerifier.compiled_contract_class.json"
}
```

**Step 5: Commit**

```bash
git add deployments/sepolia.json
git commit -m "deploy: add BalanceTierVerifier to Sepolia"
```

---

## Task 5: Test Proof Generation

**Step 1: Start API server**

```bash
source garaga-env/bin/activate
bun run api
```

**Step 2: Generate proof**

In another terminal:

```bash
curl -X POST http://localhost:3001/api/generate-balance-proof \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "48c0122b-294c-4df8-bf73-a96881228344",
    "value": 50000,
    "datetime": 1700000000
  }'
```

Expected: Returns `{ "calldata": [...], "success": true }`

---

## Task 6: Verify On-Chain

**Step 1: Get deployed address**

From Task 4 step 3 output

**Step 2: Check verification**

```bash
starkli call <DEPLOYED_ADDRESS> get_verified_category 0x1234... --network sepolia
```

---

## Summary

| Task | Command | Expected |
|------|---------|----------|
| 1 | `./setup-codespace.sh` | All tools installed |
| 2 | `nargo build && nargo test` | 5/5 tests pass |
| 3 | `scarb build && starkli declare && starkli deploy` | Contract deployed |
| 4 | Update `deployments/sepolia.json` | Addresses recorded |
| 5 | `bun run api` + curl | Proof generated |
| 6 | `starkli call` | On-chain verification |

---

**Plan complete. Execute in GitHub Codespaces.**
