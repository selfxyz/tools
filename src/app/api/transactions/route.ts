import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseEther, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo, celoAlfajores } from 'viem/chains';
import { HUB_CONTRACT_ABI } from '@/contracts/hubABI';

// Default hub addresses
const DEFAULT_HUB_ADDRESSES = {
  celo: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF' as Address,
  alfajores: '0x68c931C9a534D37aa78094877F46fE46a49F1A51' as Address
};

// Network configuration
const NETWORKS = {
  celo: {
    chain: celo,
    rpcUrl: process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org',
    hubAddress: DEFAULT_HUB_ADDRESSES.celo
  },
  alfajores: {
    chain: celoAlfajores,
    rpcUrl: process.env.NEXT_PUBLIC_ALFAJORES_RPC_URL || 'https://alfajores-forno.celo-testnet.org',
    hubAddress: DEFAULT_HUB_ADDRESSES.alfajores
  }
};

export async function POST(request: NextRequest) {
  try {
    const { functionName, args, network = 'alfajores', value = '0' } = await request.json();

    // Validate inputs
    if (!functionName || !args) {
      return NextResponse.json({ error: 'Missing functionName or args' }, { status: 400 });
    }

    if (!process.env.PRIVATE_KEY) {
      return NextResponse.json({ error: 'PRIVATE_KEY not configured' }, { status: 500 });
    }

    // Get network configuration
    const networkConfig = NETWORKS[network as keyof typeof NETWORKS];
    if (!networkConfig) {
      return NextResponse.json({ error: 'Unsupported network' }, { status: 400 });
    }

    // Create account from private key
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

    // Create wallet client
    const client = createWalletClient({
      account,
      chain: networkConfig.chain,
      transport: http(networkConfig.rpcUrl)
    });

    // Convert BigInt strings for verification config
    let processedArgs = args;
    if (functionName === 'setVerificationConfigV2' && args[0]) {
      const config = args[0] as Record<string, unknown>;
      processedArgs = [{
        olderThanEnabled: config.olderThanEnabled,
        olderThan: BigInt(config.olderThan as string || '0'),
        forbiddenCountriesEnabled: config.forbiddenCountriesEnabled,
        forbiddenCountriesListPacked: [
          BigInt((config.forbiddenCountriesListPacked as string[])[0] || '0'),
          BigInt((config.forbiddenCountriesListPacked as string[])[1] || '0'),
          BigInt((config.forbiddenCountriesListPacked as string[])[2] || '0'),
          BigInt((config.forbiddenCountriesListPacked as string[])[3] || '0')
        ],
        ofacEnabled: config.ofacEnabled
      }];
    }

    // Execute contract function
    const contractParams = {
      address: networkConfig.hubAddress,
      abi: HUB_CONTRACT_ABI,
      functionName,
      args: processedArgs
    };

    // Add value only if it's not '0'
    if (value !== '0') {
      (contractParams as typeof contractParams & { value: bigint }).value = parseEther(value);
    }
    
    const hash = await client.writeContract(contractParams);

    return NextResponse.json({
      success: true,
      hash,
      network,
      address: account.address
    });

  } catch (error: unknown) {
    console.error('Transaction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error && 'details' in error ? (error as Record<string, unknown>).details : null
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!process.env.PRIVATE_KEY) {
      return NextResponse.json({ configured: false });
    }

    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`);
    
    return NextResponse.json({
      configured: true,
      address: account.address,
      networks: Object.keys(NETWORKS)
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      configured: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 