'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';
import { HUB_CONTRACT_ABI } from '../../../contracts/hubABI';
import CopyButton from '../ui/CopyButton';

interface VerificationConfigV2 {
  olderThanEnabled: boolean;
  olderThan: bigint;
  forbiddenCountriesEnabled: boolean;
  forbiddenCountriesListPacked: [bigint, bigint, bigint, bigint];
  ofacEnabled: [boolean, boolean, boolean];
}

export default function ConfigReader() {
  const { chain: currentChain } = useAccount();
  
  // Read config state
  const [readConfigId, setReadConfigId] = useState('');
  const [readConfigResult, setReadConfigResult] = useState<VerificationConfigV2 | null>(null);
  const [readConfigError, setReadConfigError] = useState('');
  const [isConfigReading, setIsConfigReading] = useState(false);

  // Network configuration
  const DEFAULT_HUB_ADDRESSES = {
    celo: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF',
    alfajores: '0x68c931C9a534D37aa78094877F46fE46a49F1A51'
  };

  const RPC_URLS = {
    celo: 'https://forno.celo.org',
    alfajores: 'https://alfajores-forno.celo-testnet.org'
  };

  const getCurrentNetwork = () => {
    if (!currentChain) return null;
    
    if (currentChain.id === celo.id) {
      return {
        key: 'celo' as const,
        name: 'Celo Mainnet',
        hubAddress: DEFAULT_HUB_ADDRESSES.celo,
        rpcUrl: RPC_URLS.celo,
        chain: celo
      };
    } else if (currentChain.id === celoAlfajores.id) {
      return {
        key: 'alfajores' as const,
        name: 'Celo Testnet (Alfajores)',
        hubAddress: DEFAULT_HUB_ADDRESSES.alfajores,
        rpcUrl: RPC_URLS.alfajores,
        chain: celoAlfajores
      };
    }
    
    return null;
  };

  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars + 3) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  const readVerificationConfig = async () => {
    // Step 1: Input validation - Check Config ID format
    if (!readConfigId.trim()) {
      setReadConfigError('Please enter a config ID');
      return;
    }

    // Validate config ID format (should be a 32-byte hex string)
    if (!readConfigId.match(/^0x[a-fA-F0-9]{64}$/)) {
      setReadConfigError('Config ID must be a valid 32-byte hex string (0x followed by 64 hex characters)');
      return;
    }

    setIsConfigReading(true);
    try {
      setReadConfigError('');
      setReadConfigResult(null);

      // Get network info from wallet or default to Celo mainnet for reading
      const currentNetwork = getCurrentNetwork();
      const networkToUse = currentNetwork || {
        name: 'Celo Mainnet (default)',
        hubAddress: DEFAULT_HUB_ADDRESSES.celo,
        rpcUrl: RPC_URLS.celo
      };

      console.log('🌐 Reading from network:', {
        name: networkToUse.name,
        hubAddress: networkToUse.hubAddress,
        rpcUrl: networkToUse.rpcUrl
      });

      // Create a provider for reading (no wallet connection needed for view functions)
      const readProvider = new ethers.JsonRpcProvider(networkToUse.rpcUrl);
      const hubContractAddress = networkToUse.hubAddress;
      const contract = new ethers.Contract(hubContractAddress, HUB_CONTRACT_ABI, readProvider);

      // Step 2: Check existence - Use verificationConfigV2Exists to confirm configuration exists
      console.log('Checking if configuration exists...');
      const exists = await contract.verificationConfigV2Exists(readConfigId);
      
      if (!exists) {
        setReadConfigError(
          `Configuration with this ID does not exist on the contract.\n\n` +
          `Please check:\n` +
          `• Config ID is correct\n` +
          `• Hub contract address is correct\n` +
          `• Connected to the correct network\n` +
          `• The configuration was successfully deployed`
        );
        return;
      }

      // Step 3: Read configuration - Only call getVerificationConfigV2 when configuration exists
      console.log('Configuration exists, reading details...');
      const config = await contract.getVerificationConfigV2(readConfigId);

      // Check if this is an empty configuration (user wants to verify nothing - this is valid)
      const isEmpty = !config.olderThanEnabled && 
                     !config.forbiddenCountriesEnabled && 
                     !config.ofacEnabled.some((enabled: boolean) => enabled);

      setReadConfigResult({
        olderThanEnabled: config.olderThanEnabled,
        olderThan: config.olderThan,
        forbiddenCountriesEnabled: config.forbiddenCountriesEnabled,
        forbiddenCountriesListPacked: [
          config.forbiddenCountriesListPacked[0],
          config.forbiddenCountriesListPacked[1],
          config.forbiddenCountriesListPacked[2],
          config.forbiddenCountriesListPacked[3]
        ] as [bigint, bigint, bigint, bigint],
        ofacEnabled: config.ofacEnabled
      });

      if (isEmpty) {
        console.log('✅ Configuration found - No verification requirements (user wants to verify nothing)');
      } else {
        console.log('✅ Configuration found with verification requirements');
      }

    } catch (error: unknown) {
      console.error('Error reading verification config:', error);
      const errorObj = error as Error;
      let errorMessage = errorObj.message;

      // Step 4: Detailed error reporting - Provide specific error reasons and suggestions
      if (errorMessage.includes('could not decode result data') && errorMessage.includes('value="0x"')) {
        errorMessage = 
          `Function returned empty data. Possible reasons:\n\n` +
          `• Incorrect hub contract address\n` +
          `• Connected to wrong network\n` +
          `• Contract does not exist at this address\n` +
          `• Contract version mismatch\n\n` +
          `Suggestions:\n` +
          `• Check official docs for correct address\n` +
          `• Verify network settings`;
      } else if (errorMessage.includes('missing revert data') || errorMessage.includes('CALL_EXCEPTION')) {
        errorMessage = 
          `Contract call failed. Possible reasons:\n\n` +
          `• Wrong hub contract address\n` +
          `• Network mismatch\n` +
          `• Contract does not exist\n` +
          `• RPC node issues\n\n` +
          `Suggestions:\n` +
          `• Verify the address is correct\n` +
          `• Ensure you're on Celo network\n` +
          `• Try refreshing the page`;
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 
          `Network connection error.\n\n` +
          `Possible causes:\n` +
          `• Unstable internet connection\n` +
          `• RPC node temporarily unavailable\n` +
          `• Firewall blocking requests\n\n` +
          `Suggestions:\n` +
          `• Check internet connection\n` +
          `• Try again later\n` +
          `• Try using VPN`;
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 
          `Request timed out.\n\n` +
          `Suggestions:\n` +
          `• Network may be slow, please try again later\n` +
          `• Check network connection\n` +
          `• Try refreshing the page`;
      } else {
        // Generic error with additional context
        errorMessage = 
          `Error reading configuration:\n${errorMessage}\n\n` +
          `If the problem persists, please:\n` +
          `• Verify all inputs are correct\n` +
          `• Check network connection\n` +
          `• Contact technical support`;
      }

      setReadConfigError(errorMessage);
    } finally {
      setIsConfigReading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-8">
        <h3 className="text-xl sm:text-2xl font-semibold text-black mb-2">📖 Read Verification Config</h3>
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
          Read verification configuration by config ID (no wallet connection required)
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="readConfigId" className="block text-sm sm:text-base font-medium text-black">
                Config ID
              </label>
            </div>
            <button
              onClick={() => setReadConfigId('0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61')}
              className="w-full sm:w-auto mb-4 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold text-sm sm:text-base transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              📋 Use Example Config ID
            </button>
          </div>
          <div>
            <input
              id="readConfigId"
              type="text"
              value={readConfigId}
              onChange={(e) => setReadConfigId(e.target.value)}
              placeholder="Enter config ID to read or use example above"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black font-mono text-sm sm:text-base transition-all hover:border-gray-300"
              style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
            />
            {readConfigId && (
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded flex-1 mr-3 overflow-hidden">
                  <div className="break-all">
                    <span className="sm:hidden">{truncateAddress(readConfigId, 8, 8)}</span>
                    <span className="hidden sm:inline">{truncateAddress(readConfigId, 12, 12)}</span>
                  </div>
                </div>
                <CopyButton 
                  text={readConfigId}
                  variant="neutral"
                  size="sm"
                  className="shrink-0"
                >
                  Copy
                </CopyButton>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={readVerificationConfig}
          disabled={isConfigReading}
          className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-semibold text-base hover:shadow-lg transform hover:scale-105 active:scale-95 hover:shadow-xl"
        >
          {isConfigReading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
              Reading Config...
            </>
          ) : (
            'Read Config'
          )}
        </button>

        {/* Read Config Status Messages */}
        {readConfigError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
            <p className="text-red-600 text-sm sm:text-base font-medium">{readConfigError}</p>
          </div>
        )}

        {readConfigResult && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-blue-800 font-medium mb-3">Configuration Found:</h4>
            
            {/* Check if configuration is empty (no verification requirements) */}
            {!readConfigResult.olderThanEnabled && 
             !readConfigResult.forbiddenCountriesEnabled && 
             !readConfigResult.ofacEnabled.some(enabled => enabled) ? (
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                <p className="text-green-700 font-medium">✅ No Verification Requirements</p>
                <p className="text-green-600 text-sm mt-1">
                  This configuration allows all users to verify without any restrictions. 
                  The user has chosen to verify nothing - this is a valid configuration.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                <p className="text-blue-700 font-medium">📋 Configuration Details</p>
                <p className="text-blue-600 text-sm mt-1">
                  This configuration has specific verification settings. Review the details below to understand what&apos;s required.
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">Older Than Enabled:</span>
                <span className="text-blue-600">{readConfigResult.olderThanEnabled ? 'Yes' : 'No'}</span>
              </div>
              {readConfigResult.olderThanEnabled && (
                <div className="flex justify-between">
                  <span className="text-blue-700 font-medium">Minimum Age:</span>
                  <span className="text-blue-600">{readConfigResult.olderThan.toString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">Forbidden Countries Enabled:</span>
                <span className="text-blue-600">{readConfigResult.forbiddenCountriesEnabled ? 'Yes' : 'No'}</span>
              </div>
              {readConfigResult.forbiddenCountriesEnabled && (
                <div className="flex justify-between">
                  <span className="text-blue-700 font-medium">Forbidden Countries:</span>
                  <span className="text-blue-600 font-mono">[{readConfigResult.forbiddenCountriesListPacked.map(n => n.toString()).join(', ')}]</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">OFAC Enabled:</span>
                <span className="text-blue-600">[{readConfigResult.ofacEnabled.map(b => b ? 'Yes' : 'No').join(', ')}]</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 