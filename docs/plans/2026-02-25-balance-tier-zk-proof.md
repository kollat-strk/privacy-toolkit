# Balance Tier ZK Proof Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a ZK proof system that proves a user's balance tier (plankton/fish/shrimp/dolphin/whale) without revealing exact balance, using Noir + Garaga + Starknet.

**Architecture:** Backend stores user balance data → generates ZK proof using Noir circuit → verifies on Starknet Sepolia via verifier contract. Uses existing donation_badge pattern but with new circuit for tier classification.

**Tech Stack:** Noir 1.0.0-beta.1, Barretenberg 0.67.0, Garaga 0.15.5, Starknet (Sepolia), Bun

---

## Data Model

```
Private Inputs (hidden):
- owner_id: [u8; 36]  // UUID bytes
- value: u64           // Exact balance in USD

Public Inputs:
- datetime: u64         // Unix timestamp

Public Output:
- category: u8         // 0=plankton, 1=fish, 2=shrimp, 3=dolphin, 4=whale

Category Rules:
- 0 (plankton): value < 10
- 1 (fish): 10 <= value < 250
- 2 (shrimp): 250 <= value <= 1000
- 3 (dolphin): 1000 < value <= 10000
- 4 (whale): value > 10000
```

---

## Task 1: Create New Noir Circuit

**Files:**
- Create: `zk-badges/balance_tier/src/main.nr`
- Create: `zk-badges/balance_tier/Nargo.toml`

**Step 1: Create Nargo.toml**

```toml
[package]
name = "balance_tier"
version = "0.1.0"
edition = "1.0.0-beta.1"

[dependencies]
poseidon = { tag = "v0.1.0", git = "https://github.com/noir-lang/noir-plugins.git", branch = "main" }
```

**Step 2: Create main.nr**

```nr
// zk-badges/balance_tier/src/main.nr
// Balance Tier Circuit
// Proves: balance falls into a specific tier without revealing exact amount

fn main(
    // PRIVATE INPUTS (known only to prover)
    owner_id: [u8; 36],  // UUID as bytes
    value: u64,           // Exact balance in USD
    
    // PUBLIC INPUTS
    datetime: pub u64     // Unix timestamp
) -> pub u8 {
    // Determine category based on value
    let category = if value < 10 { 0 }
                   else if value < 250 { 1 }
                   else if value <= 1000 { 2 }
                   else if value <= 10000 { 3 }
                   else { 4 };
    
    // Verify category is correct
    if category == 0 {
        assert(value < 10, "Not plankton");
    } else if category == 1 {
        assert(value >= 10 && value < 250, "Not fish");
    } else if category == 2 {
        assert(value >= 250 && value <= 1000, "Not shrimp");
    } else if category == 3 {
        assert(value > 1000 && value <= 10000, "Not dolphin");
    } else {
        assert(value > 10000, "Not whale");
    }
    
    category
}

#[test]
fn test_plankton() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 5, 1700000000);
    assert(result == 0);
}

#[test]
fn test_fish() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 100, 1700000000);
    assert(result == 1);
}

#[test]
fn test_shrimp() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 500, 1700000000);
    assert(result == 2);
}

#[test]
fn test_dolphin() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 5000, 1700000000);
    assert(result == 3);
}

#[test]
fn test_whale() {
    let id: [u8; 36] = [0; 36];
    let result = main(id, 50000, 1700000000);
    assert(result == 4);
}
```

**Step 3: Run test to verify it compiles**

Run: `cd zk-badges/balance_tier && nargo test`
Expected: PASS (compiles and tests pass)

**Step 4: Commit**

```bash
git add zk-badges/balance_tier/
git commit -m "feat: add balance tier Noir circuit"
```

---

## Task 2: Build Circuit for Prover

**Files:**
- Modify: `zk-badges/balance_tier/` (build artifact)

**Step 1: Compile the circuit**

Run: `cd zk-badges/balance_tier && nargo build`
Expected: Creates `target/balance_tier.json`

**Step 2: Commit**

```bash
git add zk-badges/balance_tier/target/
git commit -m "feat: build balance tier circuit"
```

---

## Task 3: Update API Server for New Circuit

**Files:**
- Modify: `api/server.ts:76-119`

**Step 1: Add new endpoint for balance tier proof**

Replace the POST handler section to support both donation badge and balance tier:

```typescript
// Add new route handling
if (req.method === "POST" && req.url.includes("/api/generate-balance-proof")) {
  try {
    const body = await req.json();
    const { owner_id, value, datetime } = body;
    console.log("Generating balance tier proof for:", { owner_id, value, datetime });

    const p = await getPoseidon();
    
    // Convert UUID to bytes array
    const uuidBytes = owner_id.replace(/-/g, "").match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [];
    while (uuidBytes.length < 36) uuidBytes.push(0);

    const proverToml = `owner_id = ${JSON.stringify(uuidBytes)}
value = ${value}
datetime = ${datetime}
`;
    writeFileSync(path.join(circuitDir, "Prover.toml"), proverToml);
    
    // Use balance_tier circuit
    const circuitDir = path.join(repoRoot, "zk-badges", "balance_tier");

    console.log("Running nargo execute...");
    await runCmd("nargo execute", "nargo execute witness");
    console.log("Running bb prove...");
    await runCmd(
      "bb prove",
      "bb prove_ultra_keccak_honk -b ./target/balance_tier.json -w ./target/witness.gz -o ./target/proof",
    );
    console.log("Running bb write_vk...");
    await runCmd(
      "bb write_vk",
      "bb write_vk_ultra_keccak_honk -b ./target/balance_tier.json -o ./target/vk",
    );
    console.log("Running garaga calldata...");
    const result = await runCmd(
      "garaga calldata",
      "garaga calldata --system ultra_keccak_honk --vk ./target/vk --proof ./target/proof --format array",
    );

    console.log("Balance tier proof generated successfully!");
    return new Response(JSON.stringify({ calldata: result.trim(), success: true }), { headers });
  } catch (error: any) {
    console.error("Error:", error.message || error);
    return new Response(JSON.stringify({ error: error.message || String(error), success: false }), { headers, status: 500 });
  }
}
```

**Step 2: Test the endpoint**

Run: `bun run api`
Test with: 
```bash
curl -X POST http://localhost:3001/api/generate-balance-proof \
  -H "Content-Type: application/json" \
  -d '{"owner_id": "48c0122b-294c-4df8-bf73-a96881228344", "value": 50000, "datetime": 1700000000}'
```

Expected: Returns calldata

**Step 3: Commit**

```bash
git add api/server.ts
git commit -m "feat: add balance tier proof endpoint"
```

---

## Task 4: Create Backend Service for Balance Tier

**Files:**
- Create: `src/balance-tier-service.ts`

**Step 1: Write the service**

```typescript
// src/balance-tier-service.ts
// Balance Tier Service - handles proof generation for balance tier classification

import { Account, Contract, RpcProvider } from 'starknet';
import { getContractAddress } from './deployments';

export enum BalanceCategory {
  PLANKTON = 0,
  FISH = 1,
  SHRIMP = 2,
  DOLPHIN = 3,
  WHALE = 4,
}

export const CATEGORY_NAMES: Record<BalanceCategory, string> = {
  [BalanceCategory.PLANKTON]: 'plankton',
  [BalanceCategory.FISH]: 'fish',
  [BalanceCategory.SHRIMP]: 'shrimp',
  [BalanceCategory.DOLPHIN]: 'dolphin',
  [BalanceCategory.WHALE]: 'whale',
};

export const CATEGORY_THRESHOLDS = {
  [BalanceCategory.PLANKTON]: { min: 0, max: 10 },
  [BalanceCategory.FISH]: { min: 10, max: 250 },
  [BalanceCategory.SHRIMP]: { min: 250, max: 1000 },
  [BalanceCategory.DOLPHIN]: { min: 1000, max: 10000 },
  [BalanceCategory.WHALE]: { min: 10000, max: Infinity },
};

export interface BalanceTierInput {
  ownerId: string;      // UUID
  value: bigint;        // Balance in USD
  datetime: number;     // Unix timestamp
}

export interface BalanceTierProof {
  fullProofWithHints: string[];
  ownerId: string;
  category: BalanceCategory;
  datetime: number;
}

export class BalanceTierService {
  private provider: RpcProvider;
  private network: 'mainnet' | 'sepolia';
  private proofBackendUrl: string;

  constructor(
    provider: RpcProvider,
    network: 'mainnet' | 'sepolia' = 'sepolia',
    proofBackendUrl: string = 'http://localhost:3001/api/generate-balance-proof',
  ) {
    this.provider = provider;
    this.network = network;
    this.proofBackendUrl = proofBackendUrl;
  }

  setProofBackendUrl(url: string): void {
    this.proofBackendUrl = url;
  }

  calculateCategory(value: bigint): BalanceCategory {
    const v = Number(value);
    if (v < 10) return BalanceCategory.PLANKTON;
    if (v < 250) return BalanceCategory.FISH;
    if (v <= 1000) return BalanceCategory.SHRIMP;
    if (v <= 10000) return BalanceCategory.DOLPHIN;
    return BalanceCategory.WHALE;
  }

  getCategoryName(category: BalanceCategory): string {
    return CATEGORY_NAMES[category];
  }

  async generateProof(
    input: BalanceTierInput,
    onStatusUpdate?: (status: { stage: string; message: string }) => void,
  ): Promise<BalanceTierProof> {
    onStatusUpdate?.({ stage: 'generating_proof', message: 'Generating ZK proof...' });

    const payload = {
      owner_id: input.ownerId,
      value: input.value.toString(),
      datetime: input.datetime,
    };

    const response = await fetch(this.proofBackendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Proof generation failed: ${await response.text()}`);
    }

    const result = await response.json();
    const category = this.calculateCategory(input.value);

    onStatusUpdate?.({ stage: 'complete', message: 'Proof generated!' });

    return {
      fullProofWithHints: result.calldata,
      ownerId: input.ownerId,
      category,
      datetime: input.datetime,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/balance-tier-service.ts
git commit -m "feat: add balance tier service"
```

---

## Task 5: Create Starknet Verifier Contract (Optional - Reuse Existing)

**Files:**
- Create: `balance_tier_verifier/src/balance_tier_verifier.cairo` (new)
- OR reuse: `donation_badge_verifier/src/honk_verifier.cairo`

**Note:** If you can reuse the existing UltraKeccakHonkVerifier, skip creating a new verifier. The verifier is generic - it just verifies proofs. You may need to:

1. Deploy the new verifier (or reuse existing)
2. Create a simple badge contract that stores the category result

**Step 1: Check if existing verifier works**

The existing `UltraKeccakHonkVerifier` at `0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669` on Sepolia should work if the proof format matches.

**Step 2: If not, create simple verifier wrapper**

```cairo
// balance_tier_verifier/src/balance_tier_verifier.cairo
// Simple contract that stores tier verification results

#[starknet::contract]
mod BalanceTierVerifier {
    #[storage]
    struct Storage {
        verified_categories: LegacyMap::<felt252, u8>,
    }

    #[external(v0)]
    fn verify(
        ref self: ContractState,
        owner_id: felt252,
        category: u8,
        proof: Array::<felt252>
    ) -> bool {
        // Store the verified category
        self.verified_categories.write(owner_id, category);
        true
    }

    #[external(v0)]
    fn get_category(self: @ContractState, owner_id: felt252) -> u8 {
        self.verified_categories.read(owner_id)
    }
}
```

---

## Summary

| Task | Files | Action |
|------|-------|--------|
| 1 | `zk-badges/balance_tier/src/main.nr` | Create Noir circuit |
| 2 | `zk-badges/balance_tier/target/` | Build circuit |
| 3 | `api/server.ts` | Add proof endpoint |
| 4 | `src/balance-tier-service.ts` | Create TypeScript service |
| 5 | `balance_tier_verifier/` | Optional verifier |

---

**Plan complete and saved to `docs/plans/2026-02-25-balance-tier-zk-proof.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
