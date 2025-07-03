'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWalletClient, useAccount } from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';
import { HUB_CONTRACT_ABI } from '../../../contracts/hubABI';
import { countryCodes } from '@selfxyz/core';

interface VerificationConfigV2 {
  olderThanEnabled: boolean;
  olderThan: bigint;
  forbiddenCountriesEnabled: boolean;
  forbiddenCountriesListPacked: [bigint, bigint, bigint, bigint];
  ofacEnabled: [boolean, boolean, boolean];
}

interface VerificationConfigManagerProps {
  selectedCountries: string[];
  setSelectedCountries: (countries: string[]) => void;
  setShowCountryModal: (show: boolean) => void;
}

const MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

function formatCountriesList(countries: string[]) {
  if (countries.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    throw new Error(
      `Countries list must be inferior or equals to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`
    );
  }

  for (const country of countries) {
    if (!country || country.length !== 3) {
      throw new Error(
        `Invalid country code: "${country}". Country codes must be exactly 3 characters long.`
      );
    }
  }

  const paddedCountries = countries.concat(
    Array(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH - countries.length).fill('')
  );
  const result = paddedCountries.flatMap((country) => {
    const chars = country
      .padEnd(3, '\0')
      .split('')
      .map((char) => char.charCodeAt(0));
    return chars;
  });
  return result;
}

export default function VerificationConfigManager({ 
  showToast, 
  selectedCountries, 
  setSelectedCountries, 
  setShowCountryModal 
}: VerificationConfigManagerProps) {
  const { data: walletClient } = useWalletClient();
  const { isConnected, chain: currentChain } = useAccount();

  // Verification config state
  const [olderThanEnabled, setOlderThanEnabled] = useState(false);
  const [olderThan, setOlderThan] = useState('0');
  const [forbiddenCountriesEnabled, setForbiddenCountriesEnabled] = useState(false);
  const [forbiddenCountriesPacked, setForbiddenCountriesPacked] = useState<[string, string, string, string]>(['0', '0', '0', '0']);
  const [ofacEnabled, setOfacEnabled] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [generatedConfigId, setGeneratedConfigId] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [isConfigDeploying, setIsConfigDeploying] = useState(false);

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

  const isNetworkSupported = () => getCurrentNetwork() !== null;

  const getCeloscanUrl = (txHash: string) => {
    const network = getCurrentNetwork();
    if (!network) return null;
    
    const baseUrl = network.key === 'celo' 
      ? 'https://celoscan.io/tx/' 
      : 'https://alfajores.celoscan.io/tx/';
    
    return baseUrl + txHash;
  };

  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars + 3) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  const generateConfigIdFromContract = async (config: VerificationConfigV2) => {
    try {
      const currentNetwork = getCurrentNetwork();
      if (!currentNetwork) {
        throw new Error('No supported network detected');
      }

      const readProvider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
      const contract = new ethers.Contract(currentNetwork.hubAddress, HUB_CONTRACT_ABI, readProvider);

      const configId = await contract.generateConfigId(config);
      return configId;
    } catch (error) {
      console.error('Error generating config ID from contract:', error);
      return ethers.solidityPackedKeccak256(
        ['bool', 'uint256', 'bool', 'uint256[4]', 'bool[3]'],
        [
          config.olderThanEnabled,
          config.olderThan,
          config.forbiddenCountriesEnabled,
          config.forbiddenCountriesListPacked,
          config.ofacEnabled
        ]
      );
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = parseInt(e.target.value);
    setOlderThan(newAge.toString());
  };




  const setVerificationConfig = async () => {
    if (!walletClient) {
      setConfigError('Please connect wallet first');
      return;
    }

    setIsConfigDeploying(true);
    try {
      setConfigError('');
      setConfigSuccess('');
      setGeneratedConfigId('');
      setTransactionHash('');
      setTransactionStatus('idle');

      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();

      const currentNetwork = getCurrentNetwork();
      if (!currentNetwork) {
        throw new Error(`Unsupported network. Please switch to Celo Mainnet or Testnet in your wallet.`);
      }

      const contract = new ethers.Contract(currentNetwork.hubAddress, HUB_CONTRACT_ABI, signer);

      const config = {
        olderThanEnabled: olderThanEnabled,
        olderThan: BigInt(olderThan),
        forbiddenCountriesEnabled: forbiddenCountriesEnabled,
        forbiddenCountriesListPacked: [
          BigInt(forbiddenCountriesPacked[0]),
          BigInt(forbiddenCountriesPacked[1]),
          BigInt(forbiddenCountriesPacked[2]),
          BigInt(forbiddenCountriesPacked[3])
        ] as [bigint, bigint, bigint, bigint],
        ofacEnabled: ofacEnabled
      };

      const localConfigId = await generateConfigIdFromContract(config);
      const configExists = await contract.verificationConfigV2Exists(localConfigId);

      if (configExists) {
        setGeneratedConfigId(localConfigId);
        setTransactionStatus('idle');
        setConfigSuccess('✅ Configuration already exists on-chain! No transaction needed (gas saved).');
        setTimeout(() => setConfigSuccess(''), 7000);
        return;
      }

      const tx = await contract.setVerificationConfigV2(config);
      setTransactionHash(tx.hash);
      setTransactionStatus('pending');
      setConfigSuccess('🕐 Transaction sent! Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      setTransactionStatus('confirmed');
      setGeneratedConfigId(localConfigId);
      setConfigSuccess('✅ Verification config deployed successfully!');
      setTimeout(() => {
        setConfigSuccess('');
        setTransactionHash('');
        setTransactionStatus('idle');
      }, 10000);

    } catch (error: unknown) {
      console.error('Error setting verification config:', error);
      let errorMessage = (error as Error).message;

      if (errorMessage.includes('could not decode result data') && errorMessage.includes('value="0x"')) {
        const network = getCurrentNetwork();
        errorMessage = `Contract not found or invalid at address ${network?.hubAddress || 'unknown'} on ${network?.name || 'current'} network.`;
      } else if (errorMessage.includes('CALL_EXCEPTION') || errorMessage.includes('execution reverted')) {
        errorMessage = 'Transaction reverted. This is likely because you are not the contract owner.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to pay for transaction.';
      } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        errorMessage = 'Transaction was rejected by the user.';
      }

      setConfigError('Failed to set verification config: ' + errorMessage);
      setTransactionStatus('failed');
    } finally {
      setIsConfigDeploying(false);
    }
  };

  return (
    <div className="mb-12">
      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-black mb-2">⚙️ Set Verification Config</h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Configure what verification requirements users must meet
            </p>
          </div>
          <button
            onClick={() => {
              setOlderThanEnabled(false);
              setOlderThan('0');
              setForbiddenCountriesEnabled(false);
              setForbiddenCountriesPacked(['0', '0', '0', '0']);
              setSelectedCountries([]);
              setOfacEnabled([false, false, false]);
            }}
            className="px-6 py-3 text-sm sm:text-base bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all font-semibold transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
          >
            📋 Load Example Config
          </button>
        </div>

        {/* Example Config Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-8 shadow-sm">
          <h4 className="text-blue-800 font-bold mb-3 text-base sm:text-lg">💡 Example Configuration</h4>
          <p className="text-blue-700 mb-4 text-sm sm:text-base leading-relaxed">
            Try the &ldquo;Load Example Config&rdquo; button to see a sample setup with <strong>no verification requirements</strong>:
          </p>
          <ul className="text-blue-600 text-sm sm:text-base space-y-2 ml-4">
            <li>• Age verification: <strong>Disabled</strong> (allows all ages)</li>
            <li>• Forbidden countries: <strong>Disabled</strong> (allows all countries)</li>
            <li>• OFAC compliance: <strong>Disabled</strong> (no OFAC checks)</li>
          </ul>
          <p className="text-blue-700 mt-4 text-sm sm:text-base leading-relaxed">
            This creates an <em>open configuration</em> where all users can verify without restrictions.
          </p>
          <div className="mt-3 p-2 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-600">
              <span className="font-semibold">Expected Config ID:</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-xs text-blue-600 font-mono overflow-hidden flex-1">
                <div className="break-all">
                  <span className="sm:hidden">{truncateAddress('0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61', 8, 8)}</span>
                  <span className="hidden sm:inline">{truncateAddress('0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61', 12, 12)}</span>
                </div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText('0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61')}
                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-200 transition-colors text-xs"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column - Age Verification and Forbidden Countries */}
          <div className="space-y-6">
            {/* Age Verification */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={olderThanEnabled}
                  onChange={(e) => setOlderThanEnabled(e.target.checked)}
                  className="mr-4 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm sm:text-base font-semibold text-black">Enable Age Verification</span>
              </label>
              {olderThanEnabled && (
                <div className="mt-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Minimum Age: {olderThan || '0'}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="99"
                    value={olderThan}
                    onChange={handleAgeChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>99</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Set to 0 to disable age requirement
                  </div>
                </div>
              )}
            </div>

            {/* Forbidden Countries */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={forbiddenCountriesEnabled}
                  onChange={(e) => setForbiddenCountriesEnabled(e.target.checked)}
                  className="mr-4 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm sm:text-base font-semibold text-black">Enable Forbidden Countries</span>
              </label>
              {forbiddenCountriesEnabled && (
                <div className="mt-6 space-y-4">
                  <button
                    onClick={() => setShowCountryModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm sm:text-base font-semibold transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                  >
                    Configure Excluded Countries
                  </button>
                  <div className="text-sm sm:text-base text-gray-700 font-medium">
                    {selectedCountries.length > 0 
                      ? `${selectedCountries.length} countries excluded` 
                      : "No countries excluded"}
                  </div>
                  {selectedCountries.length > 0 && (
                    <div className="max-h-24 overflow-y-auto bg-gray-50 rounded-lg p-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedCountries.slice(0, 10).map((code) => (
                          <span key={code} className="inline-block bg-blue-100 text-blue-800 text-xs sm:text-sm px-3 py-1.5 rounded-lg font-medium">
                            {countryCodes[code as keyof typeof countryCodes] || code}
                          </span>
                        ))}
                        {selectedCountries.length > 10 && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs sm:text-sm px-3 py-1.5 rounded-lg font-medium">
                            +{selectedCountries.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - OFAC Settings */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <label className="block text-sm sm:text-base font-semibold text-black mb-6">OFAC Compliance Settings</label>
            <div className="space-y-4">
              {[
                { 
                  label: 'OFAC 1', 
                  description: 'Basic OFAC screening against Specially Designated Nationals (SDN) list'
                },
                { 
                  label: 'OFAC 2', 
                  description: 'Enhanced screening including consolidated sanctions list'
                },
                { 
                  label: 'OFAC 3', 
                  description: 'Comprehensive screening with additional risk factors and enhanced due diligence'
                }
              ].map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={ofacEnabled[index]}
                      onChange={(e) => {
                        const newOfac = [...ofacEnabled] as [boolean, boolean, boolean];
                        newOfac[index] = e.target.checked;
                        setOfacEnabled(newOfac);
                      }}
                      className="mr-4 mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm sm:text-base font-semibold text-black">{item.label}</span>
                      <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">{item.description}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <p className="text-xs sm:text-sm text-yellow-800 leading-relaxed">
                <strong>Note:</strong> OFAC (Office of Foreign Assets Control) compliance helps prevent transactions with sanctioned individuals and entities.
              </p>
            </div>
          </div>
        </div>

        {/* Deploy Button */}
        <div className="pt-8 mt-8 border-t-2 border-gray-200 text-center">
          <button
            onClick={setVerificationConfig}
            disabled={!isConnected || isConfigDeploying}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-xl hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:text-gray-600 transition-all font-semibold text-base transform hover:scale-105 active:scale-95 hover:shadow-xl min-w-[250px]"
          >
            {isConfigDeploying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2 inline-block"></div>
                {transactionStatus === 'pending' ? 'Confirming Transaction...' : 'Deploying Config...'}
              </>
            ) : !isConnected ? (
              'Connect Wallet First'
            ) : !isNetworkSupported() ? (
              'Switch Network First'
            ) : (
              'Set Verification Config'
            )}
          </button>
        </div>

        {/* Status Messages */}
        {configError && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {configError}
          </div>
        )}
        {configSuccess && (
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded text-green-700">
            {configSuccess}
          </div>
        )}

        {/* Transaction Status */}
        {transactionHash && (
          <div className={`mt-6 p-4 border rounded-lg ${
            transactionStatus === 'pending' ? 'bg-yellow-50 border-yellow-200' :
            transactionStatus === 'confirmed' ? 'bg-green-50 border-green-200' :
            transactionStatus === 'failed' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold ${
                transactionStatus === 'pending' ? 'text-yellow-800' :
                transactionStatus === 'confirmed' ? 'text-green-800' :
                transactionStatus === 'failed' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {transactionStatus === 'pending' ? '🕐 Transaction Pending' :
                 transactionStatus === 'confirmed' ? '✅ Transaction Confirmed' :
                 transactionStatus === 'failed' ? '❌ Transaction Failed' :
                 'Transaction'}
              </h3>
              <button
                onClick={() => {
                  setTransactionHash('');
                  setTransactionStatus('idle');
                }}
                className={`text-sm hover:opacity-75 ${
                  transactionStatus === 'pending' ? 'text-yellow-600' :
                  transactionStatus === 'confirmed' ? 'text-green-600' :
                  transactionStatus === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}
              >
                ✕ Close
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className={`text-xs font-medium mb-1 ${
                  transactionStatus === 'pending' ? 'text-yellow-700' :
                  transactionStatus === 'confirmed' ? 'text-green-700' :
                  transactionStatus === 'failed' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  Transaction Hash:
                </p>
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-mono px-2 py-1 rounded flex-1 mr-3 overflow-hidden ${
                    transactionStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    transactionStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                    transactionStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    <div className="break-all">
                      <span className="sm:hidden">{truncateAddress(transactionHash, 8, 8)}</span>
                      <span className="hidden sm:inline">{truncateAddress(transactionHash, 12, 12)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(transactionHash)}
                    className={`px-3 py-1 text-xs rounded transition-colors shrink-0 ${
                      transactionStatus === 'pending' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                      transactionStatus === 'confirmed' ? 'bg-green-600 text-white hover:bg-green-700' :
                      transactionStatus === 'failed' ? 'bg-red-600 text-white hover:bg-red-700' :
                      'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {getCeloscanUrl(transactionHash) && (
                <div>
                  <a
                    href={getCeloscanUrl(transactionHash)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      transactionStatus === 'pending' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                      transactionStatus === 'confirmed' ? 'bg-green-600 text-white hover:bg-green-700' :
                      transactionStatus === 'failed' ? 'bg-red-600 text-white hover:bg-red-700' :
                      'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <span className="mr-2">🔗</span>
                    View on Celoscan
                    <span className="ml-2">↗</span>
                  </a>
                </div>
              )}

              {transactionStatus === 'pending' && (
                <div className="flex items-center text-yellow-700 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent mr-2"></div>
                  Waiting for network confirmation...
                </div>
              )}
            </div>
          </div>
        )}

        {generatedConfigId && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-800">Generated Config ID:</h3>
              <button
                onClick={() => setGeneratedConfigId('')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ✕ Clear
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-700 font-mono bg-blue-100 px-2 py-1 rounded flex-1 mr-3 overflow-hidden">
                <div className="break-all">
                  <span className="sm:hidden">{truncateAddress(generatedConfigId, 8, 8)}</span>
                  <span className="hidden sm:inline">{truncateAddress(generatedConfigId, 12, 12)}</span>
                </div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(generatedConfigId)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Use this ID to read the configuration or reference it in other contracts
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 