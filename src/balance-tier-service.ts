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
  ownerId: string;
  value: bigint;
  datetime: number;
}

export interface BalanceTierProof {
  fullProofWithHints: string[];
  ownerId: string;
  category: BalanceCategory;
  datetime: number;
}

export interface ProofGenerationStatus {
  stage: 'idle' | 'generating_proof' | 'complete' | 'error';
  message: string;
  progress?: number;
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
    console.log('[BALANCE_TIER] Service initialized:', { network, proofBackendUrl });
  }

  setProofBackendUrl(url: string): void {
    this.proofBackendUrl = url;
    console.log('[BALANCE_TIER] Proof backend URL updated:', url);
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

  getCategoryThreshold(category: BalanceCategory): { min: number; max: number } {
    return CATEGORY_THRESHOLDS[category];
  }

  async generateProof(
    input: BalanceTierInput,
    onStatusUpdate?: (status: ProofGenerationStatus) => void,
  ): Promise<BalanceTierProof> {
    onStatusUpdate?.({
      stage: 'generating_proof',
      message: 'Generating ZK proof (up to 60 seconds)...',
      progress: 30,
    });

    const payload = {
      owner_id: input.ownerId,
      value: input.value.toString(),
      datetime: input.datetime,
    };

    console.log('[BALANCE_TIER] Calling proof backend:', this.proofBackendUrl);
    console.log('[BALANCE_TIER] Request payload:', payload);

    let response: Response;
    try {
      response = await fetch(this.proofBackendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      console.error('[BALANCE_TIER] Network error:', networkError);
      onStatusUpdate?.({ stage: 'error', message: 'Proof backend unreachable' });
      throw new Error(
        `Proof backend unreachable (${this.proofBackendUrl}). ` +
        `Run locally: bun run api (api/server.ts)`
      );
    }

    if (!response.ok) {
      const error = await response.text();
      onStatusUpdate?.({ stage: 'error', message: error });
      throw new Error(`Proof generation failed: ${error}`);
    }

    const result = await response.json();

    if (!result.calldata) {
      throw new Error('Proof generation response missing calldata');
    }

    const category = this.calculateCategory(input.value);

    onStatusUpdate?.({
      stage: 'complete',
      message: 'Proof generated successfully!',
      progress: 100,
    });

    console.log('[BALANCE_TIER] Proof generated for category:', this.getCategoryName(category));

    return {
      fullProofWithHints: result.calldata,
      ownerId: input.ownerId,
      category,
      datetime: input.datetime,
    };
  }
}
