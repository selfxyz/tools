export interface TransactionRequest {
  functionName: string;
  args: unknown[];
  network?: 'celo' | 'alfajores';
  value?: string;
}

export interface TransactionResponse {
  success: boolean;
  hash?: string;
  network?: string;
  address?: string;
  error?: string;
  details?: unknown;
}

export interface ServerWalletStatus {
  configured: boolean;
  address?: string;
  networks?: string[];
  error?: string;
}

export class TransactionService {
  private static baseUrl = '/api/transactions';

  /**
   * Execute a contract transaction server-side
   */
  static async executeTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transaction failed');
      }

      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check server wallet configuration status
   */
  static async getWalletStatus(): Promise<ServerWalletStatus> {
    try {
      const response = await fetch(this.baseUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check wallet status');
      }

      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return {
        configured: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Set verification config transaction
   */
  static async setVerificationConfig(params: {
    allowedCountries: string[];
    allowedAgeAbove: number;
    allowedAgeBelow: number;
    network?: 'celo' | 'alfajores';
  }) {
    return this.executeTransaction({
      functionName: 'setVerificationConfig',
      args: [
        params.allowedCountries,
        params.allowedAgeAbove,
        params.allowedAgeBelow
      ],
      network: params.network || 'alfajores'
    });
  }

  /**
   * Register user transaction
   */
  static async registerUser(params: {
    proof: unknown[];
    network?: 'celo' | 'alfajores';
  }) {
    return this.executeTransaction({
      functionName: 'register',
      args: params.proof,
      network: params.network || 'alfajores'
    });
  }

  /**
   * Get block explorer URL for transaction
   */
  static getExplorerUrl(hash: string, network: 'celo' | 'alfajores'): string {
    if (network === 'celo') {
      return `https://celoscan.io/tx/${hash}`;
    }
    return `https://alfajores.celoscan.io/tx/${hash}`;
  }
} 