'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TransactionService } from '@/utils/transactionService';
import { HUB_CONTRACT_ABI } from '../../../contracts/hubABI';
import { countryCodes } from '@selfxyz/core';
import CopyButton from '../ui/CopyButton';

interface VerificationConfigV2 {
  olderThanEnabled: boolean;
  olderThan: bigint;
  forbiddenCountriesEnabled: boolean;
  forbiddenCountriesListPacked: [bigint, bigint, bigint, bigint];
  ofacEnabled: [boolean, boolean, boolean];
}

interface VerificationConfigManagerProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  selectedCountries: string[];
  setSelectedCountries: (countries: string[]) => void;
  setShowCountryModal: (show: boolean) => void;
  selectedNetwork: 'celo' | 'alfajores';
}

// Constants
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
  setShowCountryModal,
  selectedNetwork
}: VerificationConfigManagerProps) {
  // Server wallet status
  const [serverWalletConfigured, setServerWalletConfigured] = useState(false);

  // Verification config state
  const [olderThan, setOlderThan] = useState('0');
  const [forbiddenCountriesPacked, setForbiddenCountriesPacked] = useState<[string, string, string, string]>(['0', '0', '0', '0']);
  const [ofacEnabled, setOfacEnabled] = useState<[boolean, boolean, boolean]>([false, false, false]);
  
  // Deployment state
  const [isConfigDeploying, setIsConfigDeploying] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [configProgress, setConfigProgress] = useState('');
  const [generatedConfigId, setGeneratedConfigId] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');

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
    if (selectedNetwork === 'celo') {
      return {
        key: 'celo' as const,
        name: 'Celo Mainnet',
        hubAddress: DEFAULT_HUB_ADDRESSES.celo,
        rpcUrl: RPC_URLS.celo
      };
    } else {
      return {
        key: 'alfajores' as const,
        name: 'Celo Testnet (Alfajores)',
        hubAddress: DEFAULT_HUB_ADDRESSES.alfajores,
        rpcUrl: RPC_URLS.alfajores
      };
    }
  };

  const getCeloscanUrl = (txHash: string) => {
    return TransactionService.getExplorerUrl(txHash, selectedNetwork);
  };

  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars + 3) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  const generateConfigIdFromContract = async (config: VerificationConfigV2) => {
    try {
      const currentNetwork = getCurrentNetwork();
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

  // Check server wallet status on mount
  useEffect(() => {
    const checkServerWallet = async () => {
      const status = await TransactionService.getWalletStatus();
      setServerWalletConfigured(status.configured);
    };
    checkServerWallet();
  }, []);

  // Process countries when they change
  useEffect(() => {
    if (selectedCountries.length > 0) {
      try {
        const formattedList = formatCountriesList(selectedCountries);
        
        const packed: [string, string, string, string] = ['0', '0', '0', '0'];
        
        for (let i = 0; i < 4; i++) {
          let value = BigInt(0);
          for (let j = 0; j < 30 && (i * 30 + j) < formattedList.length; j++) {
            value += BigInt(formattedList[i * 30 + j]) * (BigInt(256) ** BigInt(j));
          }
          packed[i] = value.toString();
        }
        
        setForbiddenCountriesPacked(packed);
        showToast(`Processed ${selectedCountries.length} countries for exclusion`, 'success');
      } catch (error) {
        showToast((error as Error).message, 'error');
      }
    } else {
      // Reset to empty when no countries selected
      setForbiddenCountriesPacked(['0', '0', '0', '0']);
    }
  }, [selectedCountries, showToast]);

  const setVerificationConfig = async () => {
    // For testnet: Check server wallet, for mainnet: We'll use user's wallet
    if (selectedNetwork === 'alfajores' && !serverWalletConfigured) {
      setConfigError('Server wallet not configured. Please set PRIVATE_KEY in environment variables.');
      showToast('Server wallet not configured', 'error');
      return;
    }

    setIsConfigDeploying(true);
    try {
      setConfigError('');
      setConfigSuccess('');
      setConfigProgress('');
      setGeneratedConfigId('');
      setTransactionHash('');
      setTransactionStatus('idle');

      const config = {
        olderThanEnabled: parseInt(olderThan) > 0,
        olderThan: olderThan,
        forbiddenCountriesEnabled: selectedCountries.length > 0,
        forbiddenCountriesListPacked: [
          forbiddenCountriesPacked[0],
          forbiddenCountriesPacked[1],
          forbiddenCountriesPacked[2],
          forbiddenCountriesPacked[3]
        ],
        ofacEnabled: ofacEnabled
      };

      // Check if config already exists (convert to BigInt for contract call)
      const configForContractCheck = {
        olderThanEnabled: config.olderThanEnabled,
        olderThan: BigInt(config.olderThan),
        forbiddenCountriesEnabled: config.forbiddenCountriesEnabled,
        forbiddenCountriesListPacked: [
          BigInt(config.forbiddenCountriesListPacked[0]),
          BigInt(config.forbiddenCountriesListPacked[1]),
          BigInt(config.forbiddenCountriesListPacked[2]),
          BigInt(config.forbiddenCountriesListPacked[3])
        ] as [bigint, bigint, bigint, bigint],
        ofacEnabled: config.ofacEnabled
      };
      const localConfigId = await generateConfigIdFromContract(configForContractCheck);
      const currentNetwork = getCurrentNetwork();
      const readProvider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
      const contract = new ethers.Contract(currentNetwork.hubAddress, HUB_CONTRACT_ABI, readProvider);
      const configExists = await contract.verificationConfigV2Exists(localConfigId);

      if (configExists) {
        setGeneratedConfigId(localConfigId);
        setTransactionStatus('idle');
        setConfigSuccess('✅ Configuration already exists on-chain! No transaction needed (gas saved).');
        return;
      }

      if (selectedNetwork === 'alfajores') {
        // Testnet: Use server relayer
        setTransactionStatus('pending');
        setConfigProgress('🕐 Sending transaction via server relayer...');

        const result = await TransactionService.executeTransaction({
          functionName: 'setVerificationConfigV2',
          args: [config],
          network: selectedNetwork
        });

        if (result.success) {
          setTransactionHash(result.hash || '');
          setTransactionStatus('confirmed');
          setGeneratedConfigId(localConfigId);
          setConfigProgress('');
          setConfigSuccess('✅ Verification config deployed successfully via server!');
          showToast(`Config set! Tx: ${result.hash?.slice(0, 10)}...`, 'success');
        } else {
          throw new Error(result.error || 'Transaction failed');
        }
      } else {
        // Mainnet: Use user's wallet
        setTransactionStatus('pending');
        setConfigProgress('🔐 Please connect your wallet and confirm the transaction...');

        // Check if MetaMask or similar wallet is available
        if (!window.ethereum) {
          throw new Error('No crypto wallet found. Please install MetaMask or another Ethereum wallet.');
        }

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create ethers provider from browser wallet
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Check if user is on the correct network
        const network = await provider.getNetwork();
        const celoChainId = 42220; // Celo mainnet chain ID
        
        if (Number(network.chainId) !== celoChainId) {
          // Try to switch to Celo network
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${celoChainId.toString(16)}` }],
            });
          } catch (switchError: unknown) {
            // If the chain is not added, add it
            if ((switchError as { code?: number }).code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${celoChainId.toString(16)}`,
                  chainName: 'Celo Mainnet',
                  rpcUrls: ['https://forno.celo.org'],
                  blockExplorerUrls: ['https://celoscan.io'],
                  nativeCurrency: {
                    name: 'CELO',
                    symbol: 'CELO',
                    decimals: 18,
                  },
                }],
              });
            } else {
              throw switchError;
            }
          }
        }

        // Create contract instance with signer
        const contractWithSigner = new ethers.Contract(currentNetwork.hubAddress, HUB_CONTRACT_ABI, signer);

        // Build transaction config
        const configForContract = {
          olderThanEnabled: config.olderThanEnabled,
          olderThan: BigInt(config.olderThan),
          forbiddenCountriesEnabled: config.forbiddenCountriesEnabled,
          forbiddenCountriesListPacked: [
            BigInt(config.forbiddenCountriesListPacked[0]),
            BigInt(config.forbiddenCountriesListPacked[1]),
            BigInt(config.forbiddenCountriesListPacked[2]),
            BigInt(config.forbiddenCountriesListPacked[3])
          ] as [bigint, bigint, bigint, bigint],
          ofacEnabled: config.ofacEnabled
        };

        // Execute transaction
        setConfigProgress('🔐 Transaction sent! Please wait for confirmation...');
        const tx = await contractWithSigner.setVerificationConfigV2(configForContract);
      setTransactionHash(tx.hash);
      
        // Wait for confirmation
        setConfigProgress('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();

        if (receipt && receipt.status === 1) {
      setTransactionStatus('confirmed');
      setGeneratedConfigId(localConfigId);
          setConfigProgress('');
          setConfigSuccess('✅ Verification config deployed successfully via your wallet!');
          showToast(`Config set! Tx: ${tx.hash.slice(0, 10)}...`, 'success');
        } else {
          throw new Error('Transaction failed or was reverted');
        }
      }

    } catch (error: unknown) {
      console.error('Error setting verification config:', error);
      
      // Parse error for better user experience
      const parseError = (error: unknown): { message: string; isUserRejection: boolean } => {
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          const errorString = error.toString().toLowerCase();
          
          // Check for user rejection patterns
          if (errorString.includes('user rejected') || 
              errorString.includes('user denied') || 
              errorString.includes('action_rejected') ||
              errorString.includes('code": 4001') ||
              errorMessage.includes('user rejected the request')) {
            return {
              message: 'Transaction was cancelled by user',
              isUserRejection: true
            };
          }
          
          // Check for network/connection errors
          if (errorMessage.includes('network') || 
              errorMessage.includes('connection') || 
              errorMessage.includes('timeout')) {
            return {
              message: 'Network connection issue. Please check your internet connection and try again.',
              isUserRejection: false
            };
          }
          
          // Check for insufficient funds
          if (errorMessage.includes('insufficient funds') || 
              errorMessage.includes('insufficient balance')) {
            return {
              message: 'Insufficient funds to pay for gas fees. Please add more CELO to your wallet.',
              isUserRejection: false
            };
          }
          
          // Check for gas estimation errors
          if (errorMessage.includes('gas') && errorMessage.includes('estimation')) {
            return {
              message: 'Transaction simulation failed. Please check your configuration and try again.',
              isUserRejection: false
            };
          }
          
          // Check for wallet connection errors
          if (errorMessage.includes('no crypto wallet') || 
              errorMessage.includes('wallet not found') || 
              errorMessage.includes('ethereum not found')) {
            return {
              message: 'Crypto wallet not detected. Please install MetaMask or another Ethereum wallet.',
              isUserRejection: false
            };
          }
          
          // For long technical errors, provide a clean message
          if (error.message.length > 200) {
            return {
              message: 'Transaction failed due to a technical error. Please try again or contact support.',
              isUserRejection: false
            };
          }
          
          return {
            message: error.message,
            isUserRejection: false
          };
        }
        
        return {
          message: 'An unexpected error occurred',
          isUserRejection: false
        };
      };

      const { message, isUserRejection } = parseError(error);
      
      setConfigError(message);
      setTransactionStatus('failed');
      
      if (isUserRejection) {
        showToast('Transaction cancelled by user', 'info');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setIsConfigDeploying(false);
    }
  };

  return (
    <div className="mb-12">
      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
        {/* Network-specific info banner */}
        <div className={`mb-6 p-5 rounded-xl border-2 ${
          selectedNetwork === 'alfajores' 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
              selectedNetwork === 'alfajores' 
                ? 'bg-blue-100' 
                : 'bg-purple-100'
            }`}>
              {selectedNetwork === 'alfajores' ? '🧪' : '🏛️'}
            </div>
            <div className="flex-1">
              <h4 className={`font-bold text-base sm:text-lg mb-3 ${
                selectedNetwork === 'alfajores' ? 'text-blue-800' : 'text-purple-800'
              }`}>
                {selectedNetwork === 'alfajores' 
                  ? 'Testnet Mode - Server Relayed (Free)' 
                  : 'Mainnet Mode - Your Wallet Required'
                }
              </h4>
              
              {selectedNetwork === 'alfajores' ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg bg-blue-100 border border-blue-300`}>
                    <p className="text-blue-800 text-sm font-medium mb-1">💡 What happens when you click deploy:</p>
                    <ul className="text-blue-700 text-xs sm:text-sm space-y-1 ml-4">
                      <li>• 🤖 Our server automatically signs the transaction</li>
                      <li>• 💰 Server pays all gas fees (completely free for you)</li>
                      <li>• ⚡ Transaction submits immediately - no wallet popups</li>
                      <li>• 🧪 Perfect for testing and development</li>
                    </ul>
                  </div>
                  <p className="text-blue-600 text-xs">
                    <strong>Use Case:</strong> Test your verification configs without spending real money or setting up wallets.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg bg-purple-100 border border-purple-300`}>
                    <p className="text-purple-800 text-sm font-medium mb-1">🔐 What happens when you click deploy:</p>
                    <ul className="text-purple-700 text-xs sm:text-sm space-y-1 ml-4">
                      <li>• 👤 You&apos;ll be prompted to connect your crypto wallet</li>
                      <li>• 🌐 Wallet will switch to Celo Mainnet automatically</li>
                      <li>• ✍️ You review and approve the transaction</li>
                      <li>• 💰 You pay gas fees with real CELO tokens (~$0.01-0.05)</li>
                      <li>• 🏛️ Transaction goes live on production network</li>
                    </ul>
                  </div>
                  <p className="text-purple-600 text-xs">
                    <strong>Use Case:</strong> Deploy production verification configs that real users will interact with.
                  </p>
                </div>
              )}
              
              <div className={`mt-3 p-2 rounded-lg text-xs ${
                selectedNetwork === 'alfajores' 
                  ? 'bg-blue-200 text-blue-800' 
                  : 'bg-purple-200 text-purple-800'
              }`}>
                <span className="font-medium">Supported Wallets:</span> {
                  selectedNetwork === 'alfajores' 
                    ? 'No wallet needed - server handles everything' 
                    : 'MetaMask, Valora, WalletConnect, Coinbase Wallet'
                }
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-black mb-2">⚙️ Set Verification Config</h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Configure what verification requirements users must meet
            </p>
          </div>
          <button
            onClick={() => {
              setOlderThan('0');
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
              <CopyButton 
                text="0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61"
                variant="secondary"
                size="sm"
                className="p-1 text-xs"
              >
                Copy
              </CopyButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column - Age Verification and Forbidden Countries */}
          <div className="space-y-6">
            {/* Age Verification */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <h4 className="text-sm sm:text-base font-semibold text-black mb-2">Age Verification</h4>
                <p className="text-xs sm:text-sm text-gray-600">
                  Set minimum age requirement. Leave at 0 to disable age verification.
                </p>
              </div>
              <div className="mt-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Minimum Age: {olderThan || '0'} {parseInt(olderThan) > 0 ? '(Enabled)' : '(Disabled)'}
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
                  <span>0 (Disabled)</span>
                  <span>50</span>
                  <span>99</span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Move slider to set minimum age requirement
                </div>
              </div>
            </div>

            {/* Forbidden Countries */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <h4 className="text-sm sm:text-base font-semibold text-black mb-2">Country Restrictions</h4>
                <p className="text-xs sm:text-sm text-gray-600">
                  Select countries to exclude from verification. Leave empty to allow all countries.
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <button
                  onClick={() => setShowCountryModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm sm:text-base font-semibold transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                >
                  Select Countries to Exclude
                </button>
                <div className="text-sm sm:text-base text-gray-700 font-medium">
                  {selectedCountries.length > 0 
                    ? `${selectedCountries.length} countries excluded (Enabled)` 
                    : "No countries excluded (Disabled)"}
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
            disabled={(selectedNetwork === 'alfajores' && !serverWalletConfigured) || isConfigDeploying}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-xl hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:text-gray-600 transition-all font-semibold text-base transform hover:scale-105 active:scale-95 hover:shadow-xl min-w-[250px]"
          >
            {isConfigDeploying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2 inline-block"></div>
                {transactionStatus === 'pending' ? 'Processing Transaction...' : 'Setting Config...'}
              </>
            ) : selectedNetwork === 'alfajores' ? (
              !serverWalletConfigured ? 'Server Wallet Not Configured' : '🧪 Deploy via Server (Free)'
            ) : (
              '🔐 Deploy via Your Wallet'
            )}
          </button>
          
          {selectedNetwork === 'alfajores' && !serverWalletConfigured && (
            <p className="mt-4 text-sm text-red-600">
              Configure PRIVATE_KEY in environment variables to enable server-relayed transactions
            </p>
          )}
          
          {selectedNetwork === 'celo' && (
            <p className="mt-4 text-sm text-purple-600">
              You&apos;ll need to connect your wallet and pay gas fees with CELO tokens
            </p>
          )}
        </div>

        {/* Status Messages */}
        {configProgress && (
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-blue-800 mb-1">Transaction in Progress</h4>
                <p className="text-blue-700 text-sm break-words leading-relaxed">
                  {configProgress}
                </p>
              </div>
            </div>
          </div>
        )}
        {configError && (
          <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-red-600 text-lg">❌</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-red-800 mb-1">Deployment Failed</h4>
                <p className="text-red-700 text-sm break-words leading-relaxed">
            {configError}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfigError('')}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {configSuccess && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-green-600 text-lg">✅</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-green-800 mb-1">Deployment Successful</h4>
                <p className="text-green-700 text-sm break-words leading-relaxed">
            {configSuccess}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfigSuccess('')}
                    className="text-xs text-green-600 hover:text-green-800 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
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
                  <CopyButton 
                    text={transactionHash}
                    variant={transactionStatus === 'confirmed' ? 'success' : 'primary'}
                    size="sm"
                    className="shrink-0"
                  >
                    Copy
                  </CopyButton>
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
              <CopyButton 
                text={generatedConfigId}
                variant="primary"
                size="sm"
                className="shrink-0"
              >
                Copy
              </CopyButton>
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