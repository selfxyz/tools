'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { HUB_CONTRACT_ABI } from '../../../contracts/hubABI';
import CopyButton from '../ui/CopyButton';

interface ConfigReaderProps {
  selectedNetwork: 'celo' | 'alfajores';
}

export default function ConfigReader({ selectedNetwork }: ConfigReaderProps) {
  const [configId, setConfigId] = useState('');
  const [configData, setConfigData] = useState<{
    olderThanEnabled: boolean;
    olderThan: string;
    forbiddenCountriesEnabled: boolean;
    forbiddenCountriesListPacked: string[];
    ofacEnabled: boolean[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Network configuration
  const NETWORKS = {
    celo: {
      name: 'Celo Mainnet',
      hubAddress: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF',
      rpcUrl: 'https://forno.celo.org'
    },
    alfajores: {
      name: 'Celo Testnet (Alfajores)', 
      hubAddress: '0x68c931C9a534D37aa78094877F46fE46a49F1A51',
      rpcUrl: 'https://alfajores-forno.celo-testnet.org'
    }
  };

  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars + 3) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  const readConfig = async () => {
    if (!configId.trim()) {
      setError('Please enter a config ID');
      return;
    }

    setIsLoading(true);
    setError('');
    setConfigData(null);

    try {
      const currentNetwork = NETWORKS[selectedNetwork];
      const readProvider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
      const contract = new ethers.Contract(currentNetwork.hubAddress, HUB_CONTRACT_ABI, readProvider);

      // Check if config exists
      const configExists = await contract.verificationConfigV2Exists(configId);
      
      if (!configExists) {
        setError('Configuration not found for this ID');
        return;
      }

      // Read the configuration
      const config = await contract.getVerificationConfigV2(configId);
      
      setConfigData({
        olderThanEnabled: config.olderThanEnabled,
        olderThan: config.olderThan.toString(),
        forbiddenCountriesEnabled: config.forbiddenCountriesEnabled,
        forbiddenCountriesListPacked: config.forbiddenCountriesListPacked.map((x: bigint) => x.toString()),
        ofacEnabled: config.ofacEnabled
      });

    } catch (error: unknown) {
      console.error('Error reading config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to read config: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6">
        <h3 className="text-xl sm:text-2xl font-semibold text-black mb-2">📖 Read Verification Config</h3>
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
          Read existing verification configurations by their config ID
        </p>
      </div>

      {/* Config ID Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Configuration ID
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={configId}
            onChange={(e) => setConfigId(e.target.value)}
            placeholder="0x..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BFFB6] focus:border-transparent text-gray-900"
          />
          <button
            onClick={readConfig}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Reading...
              </div>
            ) : (
              'Read Config'
            )}
          </button>
        </div>
      </div>

      {/* Network Info */}
      <div className="mb-6 p-3 bg-blue-50 rounded-lg">
        <p className="text-blue-700 text-sm">
          Reading from: <strong>{NETWORKS[selectedNetwork].name}</strong>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Config Data */}
      {configData && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 mb-4">Configuration Details:</h4>
          
          {/* Age Verification */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h5 className="font-medium text-gray-800 mb-2">Age Verification</h5>
            <p className="text-gray-600 text-sm">
              {configData.olderThanEnabled 
                ? `Enabled: Minimum age ${configData.olderThan} years`
                : 'Disabled: All ages allowed'
              }
            </p>
          </div>

          {/* Country Restrictions */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h5 className="font-medium text-gray-800 mb-2">Country Restrictions</h5>
            <p className="text-gray-600 text-sm">
              {configData.forbiddenCountriesEnabled 
                ? 'Enabled: Some countries are restricted'
                : 'Disabled: All countries allowed'
              }
            </p>
            {configData.forbiddenCountriesEnabled && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">Packed country data:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {configData.forbiddenCountriesListPacked.map((packed: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12">#{index + 1}:</span>
                      <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded flex-1 overflow-hidden">
                        {truncateAddress(packed, 8, 8)}
                      </div>
                      <CopyButton 
                        text={packed}
                        variant="secondary"
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OFAC Settings */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h5 className="font-medium text-gray-800 mb-2">OFAC Compliance</h5>
            <div className="space-y-1">
              {configData.ofacEnabled.map((enabled: boolean, index: number) => (
                <p key={index} className="text-gray-600 text-sm">
                  OFAC Level {index + 1}: {enabled ? '✅ Enabled' : '❌ Disabled'}
                </p>
              ))}
            </div>
          </div>

          {/* Raw Data */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <details>
              <summary className="font-medium text-gray-800 cursor-pointer">Raw Configuration Data</summary>
              <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(configData, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
} 