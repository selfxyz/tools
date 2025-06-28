'use client';

import { useState, useEffect } from 'react';
import { hashEndpointWithScope } from '@selfxyz/core';
import { ethers } from 'ethers';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { HUB_CONTRACT_ABI } from '../contracts/hubABI';

// Types
interface VerificationConfigV2 {
  olderThanEnabled: boolean;
  olderThan: bigint;
  forbiddenCountriesEnabled: boolean;
  forbiddenCountriesListPacked: [bigint, bigint, bigint, bigint];
  ofacEnabled: [boolean, boolean, boolean];
}

// Network configurations
const NETWORKS = {
  celo: {
    chainId: '0xa4ec', // 42220 in hex
    chainName: 'Celo Mainnet',
    nativeCurrency: {
      name: 'CELO',
      symbol: 'CELO',
      decimals: 18,
    },
    rpcUrls: ['https://forno.celo.org'],
    blockExplorerUrls: ['https://celoscan.io/'],
  },
  alfajores: {
    chainId: '0xaef3', // 44787 in hex
    chainName: 'Celo Alfajores Testnet',
    nativeCurrency: {
      name: 'CELO',
      symbol: 'CELO',
      decimals: 18,
    },
    rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
    blockExplorerUrls: ['https://alfajores.celoscan.io/'],
  },
};

export default function Home() {
  const [address, setAddress] = useState('');
  const [scope, setScope] = useState('');
  const [addressError, setAddressError] = useState('');
  const [scopeError, setScopeError] = useState('');
  const [hashedEndpoint, setHashedEndpoint] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Wallet state
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Default hub addresses and RPC URLs
  const DEFAULT_HUB_ADDRESSES = {
    celo: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF',
    alfajores: '0x68c931C9a534D37aa78094877F46fE46a49F1A51'
  };

  const RPC_URLS = {
    celo: 'https://forno.celo.org',
    alfajores: 'https://alfajores-forno.celo-testnet.org'
  };

  // Network selection for both operations
  const [selectedNetwork, setSelectedNetwork] = useState<'celo' | 'alfajores'>('celo');

  // Verification config state
  const [olderThanEnabled, setOlderThanEnabled] = useState(false);
  const [olderThan, setOlderThan] = useState('0');
  const [forbiddenCountriesEnabled, setForbiddenCountriesEnabled] = useState(false);
  const [forbiddenCountriesPacked, setForbiddenCountriesPacked] = useState<[string, string, string, string]>(['0', '0', '0', '0']);
  const [ofacEnabled, setOfacEnabled] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [generatedConfigId, setGeneratedConfigId] = useState('');

  // Read config state
  const [readConfigId, setReadConfigId] = useState('');
  const [readConfigResult, setReadConfigResult] = useState<VerificationConfigV2 | null>(null);
  const [readConfigError, setReadConfigError] = useState('');

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  }>({ message: '', type: 'info', show: false });

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000); // Auto-hide after 5 seconds
  };

  // Ethereum address validation (0x followed by 40 hex characters)
  const validateEthereumAddress = (addr: string): boolean => {
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethRegex.test(addr);
  };

  // HTTPS URL validation
  const validateHttpsUrl = (url: string): boolean => {
    return url.startsWith('https://') && url.length > 8; // More than just "https://"
  };

  // Combined address validation (either Ethereum address or HTTPS URL)
  const validateAddress = (addr: string): boolean => {
    return validateEthereumAddress(addr) || validateHttpsUrl(addr);
  };

  // Scope validation (small caps ASCII, max 20 chars)
  const validateScope = (scopeValue: string): boolean => {
    const scopeRegex = /^[a-z0-9\s\-_.,!?]*$/;
    return scopeRegex.test(scopeValue) && scopeValue.length <= 20;
  };

  // Check if address is valid (not empty and passes validation)
  const isAddressValid = address && !addressError && validateAddress(address);

  // Check if scope is valid (not empty and passes validation)
  const isScopeValid = scope && !scopeError && validateScope(scope);

  // Check if both fields are valid
  const areBothValid = isAddressValid && isScopeValid;

  // Generate hash automatically when both fields have values
  useEffect(() => {
    if (address && scope) {
      try {
        const hash = hashEndpointWithScope(address, scope);
        setHashedEndpoint(hash);
      } catch (error) {
        console.error('Error generating hash:', error);
        setHashedEndpoint('Error generating hash');
      }
    } else {
      setHashedEndpoint('');
    }
  }, [address, scope]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);

    if (value === '') {
      setAddressError('');
    } else if (!validateAddress(value)) {
      setAddressError('Please enter a valid Ethereum address (0x...) or HTTPS URL (https://...)');
    } else {
      setAddressError('');
    }
  };

  const handleScopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow lowercase ASCII characters and limit to 20 chars
    if (validateScope(value) && value.length <= 20) {
      setScope(value);
      setScopeError('');
    } else if (value.length > 20) {
      setScopeError('Scope must be 20 characters or less');
    } else {
      setScopeError('Scope must contain only lowercase ASCII characters');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hashedEndpoint);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // New wallet functions
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.send("eth_requestAccounts", []);
        const signer = await browserProvider.getSigner();
        const address = await signer.getAddress();

        setProvider(browserProvider);
        setSigner(signer);
        setWalletAddress(address);
        setIsConnected(true);
      } else {
        showToast('Please install MetaMask to connect your wallet', 'error');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      showToast('Failed to connect wallet', 'error');
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setWalletAddress('');
    setIsConnected(false);
  };

  const addNetworkToMetaMask = async (networkKey: 'celo' | 'alfajores') => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // First try to switch to the network if it already exists
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NETWORKS[networkKey].chainId }],
          });
          showToast(`Successfully switched to ${NETWORKS[networkKey].chainName}`, 'success');
        } catch (switchError: unknown) {
          const error = switchError as { code?: number; message?: string };
          console.log('Switch error:', error);
          
          // Handle user rejection specifically
          if (error.code === 4001) {
            showToast('Network switch request was rejected', 'info');
            return;
          }
          
          // For any other error (network doesn't exist, unrecognized chain, etc.), try to add the network
          // This includes error code 4902 (network not found) and other similar errors
          if (error.code === 4902 || 
              (error.message && error.message.toLowerCase().includes('unrecognized')) ||
              (error.message && error.message.toLowerCase().includes('does not exist')) ||
              (error.message && error.message.toLowerCase().includes('not found'))) {
            
            try {
              console.log('Attempting to add network:', NETWORKS[networkKey]);
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [NETWORKS[networkKey]],
              });
              showToast(`Successfully added and switched to ${NETWORKS[networkKey].chainName}`, 'success');
            } catch (addError: unknown) {
              const addErr = addError as Error;
              console.error('Error adding network:', addErr);
              if (addErr.message.includes('4001') || addErr.message.includes('rejected')) {
                showToast('Network addition was rejected by user', 'info');
              } else {
                showToast(`Failed to add network: ${addErr.message}. Please add the network manually in MetaMask.`, 'error');
              }
            }
          } else {
            // Unexpected error
            console.error('Unexpected error switching network:', error);
            showToast(`Failed to switch network: ${error.message || 'Unknown error'}. You may need to add the network manually.`, 'error');
          }
        }
      } else {
        showToast('Please install MetaMask to add networks', 'error');
      }
    } catch (error: unknown) {
      console.error('Error with network operation:', error);
      const err = error as Error;
      showToast(`Network operation failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  // Verification config functions
  const setVerificationConfig = async () => {
    if (!signer) {
      setConfigError('Please connect wallet first');
      return;
    }

    try {
      setConfigError('');
      setConfigSuccess('');
      setGeneratedConfigId('');

      const hubContractAddress = DEFAULT_HUB_ADDRESSES[selectedNetwork];
      const contract = new ethers.Contract(hubContractAddress, HUB_CONTRACT_ABI, signer);

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

      // First, get the config ID that will be generated
      const configId = await contract.generateConfigId(config);

      // Then set the verification config
      const tx = await contract.setVerificationConfigV2(config);
      await tx.wait();

      setGeneratedConfigId(configId);
      setConfigSuccess('Verification config set successfully!');
      setTimeout(() => setConfigSuccess(''), 5000); // Only clear success message, keep config ID
    } catch (error: unknown) {
      console.error('Error setting verification config:', error);
      let errorMessage = (error as Error).message;

      // Check for common permission errors
      if (errorMessage.includes('CALL_EXCEPTION') || errorMessage.includes('execution reverted')) {
        errorMessage = 'Transaction reverted. This is likely because you are not the contract owner. Only the contract owner can set verification configs.';
      }

      setConfigError('Failed to set verification config: ' + errorMessage);
    }
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

    try {
      setReadConfigError('');
      setReadConfigResult(null);

      // Create a provider for reading (no wallet connection needed for view functions)
      const readProvider = new ethers.JsonRpcProvider(RPC_URLS[selectedNetwork]);
      const hubContractAddress = DEFAULT_HUB_ADDRESSES[selectedNetwork];
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
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Image src="/self_logo.svg" alt="Self Logo" width={40} height={40} className="h-10 w-10 mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-black">Self Developer Tools</h1>
                <p className="text-sm text-gray-600 mt-1">Privacy-preserving identity verification</p>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              <a
                href="https://docs.self.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-black transition-colors font-medium text-sm"
              >
                Documentation
              </a>
              <a
                href="https://github.com/selfxyz/self"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-6 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-semibold"
              >
                <Image src="/github.png" alt="GitHub" width={16} height={16} className="h-4 w-4 mr-2 rounded-full" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-12 py-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-black mb-4 leading-tight">
              Everything you need to build with <span className="text-black">Self Protocol</span>
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
              Generate scopes, configure verification requirements, and test your integration with our comprehensive developer tools
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold shadow-lg">
              <span className="w-3 h-3 bg-[#5BFFB6] rounded-full mr-3 animate-pulse"></span>
              Ready to build
            </div>
          </div>
        </div>

        {/* Quick Start Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          {/* App Install Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-[#5BFFB6] transition-all hover:shadow-lg group">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-105 transition-transform">
                <span className="text-xl">📱</span>
              </div>
              <h3 className="text-lg font-bold text-black mb-3">Install Self App</h3>
              <p className="text-gray-600 mb-4 leading-relaxed text-sm">Get started by installing the Self mobile app to create your digital identity</p>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3 inline-block">
                <QRCodeSVG
                  value="https://redirect.self.xyz"
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-gray-500 font-medium">Scan to download the app</p>
            </div>
          </div>

          {/* Mock Passport Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-[#5BFFB6] transition-all hover:shadow-lg group">
            <div className="text-center">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-105 transition-transform">
                <span className="text-xl text-white">🆔</span>
              </div>
              <h3 className="text-lg font-bold text-black mb-3">Need a Mock Passport?</h3>
              <p className="text-gray-600 mb-4 leading-relaxed text-sm">Don&apos;t have a biometric passport? Generate a mock one for testing</p>
              <a
                href="https://docs.self.xyz/use-self/using-mock-passports"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
              >
                Learn How →
              </a>
            </div>
          </div>
        </div>

        {/* Wallet Connection Section */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-12 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-lg flex items-center justify-center mr-3">
              <span className="text-lg">🔗</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">Wallet Connection</h2>
              <p className="text-gray-600 text-sm">Connect your wallet to interact with Self contracts</p>
            </div>
          </div>

          {/* Wallet Status */}
          <div className="mb-6">
            {!isConnected ? (
              <div className="text-center bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">👤</span>
                </div>
                <h3 className="text-base font-semibold text-black mb-2">No Wallet Connected</h3>
                <p className="text-gray-600 mb-4 text-sm">Connect your wallet to deploy verification configurations</p>
                <button
                  onClick={connectWallet}
                  className="inline-flex items-center px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-semibold text-sm shadow-lg"
                >
                  🔗 Connect Wallet
                </button>
              </div>
            ) : (
              <div className="text-center bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="w-12 h-12 bg-[#5BFFB6] rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">✅</span>
                </div>
                <h3 className="text-base font-semibold text-black mb-2">Wallet Connected</h3>
                <p className="font-mono text-xs text-gray-600 bg-white px-3 py-1.5 rounded-lg inline-block mb-4 shadow-sm break-all max-w-full">
                  {walletAddress}
                </p>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Network Options */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 These buttons will switch to the network if it&apos;s already in your wallet, or add it first if it&apos;s not.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mainnet */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-[#5BFFB6] transition-all">
              <div className="flex items-center mb-4">
                <Image src="/celo.webp" alt="Celo" width={32} height={32} className="h-8 w-8 mr-3 rounded-full" />
                <div>
                  <h3 className="text-lg font-semibold text-black">Celo Mainnet</h3>
                  <p className="text-sm text-gray-600">Production network</p>
                </div>
              </div>
              <button
                onClick={() => addNetworkToMetaMask('celo')}
                className="w-full flex items-center justify-center px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-semibold"
              >
                🔄 Add & Switch to Mainnet
              </button>
            </div>

            {/* Testnet */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-[#5BFFB6] transition-all">
              <div className="flex items-center mb-4">
                <Image src="/celo_testnet.webp" alt="Celo Testnet" width={32} height={32} className="h-8 w-8 mr-3 rounded-full" />
                <div>
                  <h3 className="text-lg font-semibold text-black">Celo Testnet</h3>
                  <p className="text-sm text-gray-600">Development network</p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => addNetworkToMetaMask('alfajores')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-lg hover:shadow-lg transition-all font-semibold"
                >
                  🔄 Add & Switch to Testnet
                </button>
                <a
                  href="https://faucet.celo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center px-4 py-3 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                >
                  <span className="mr-2">🚰</span>
                  Get Test Funds
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scope Generator Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg mb-12">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-lg flex items-center justify-center mr-3">
              <span className="text-lg">🔧</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">Scope Generator</h2>
              <p className="text-gray-600 text-sm">Hash the scope seed with your address or DNS to generate the scope value</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-8">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                <span className="text-lg">💡</span>
              </div>
              <div>
                <h4 className="font-bold text-blue-900 mb-2">What is a Scope?</h4>
                <p className="text-blue-800 text-sm leading-relaxed">
                  The scope is the final value you set in your Self Verification contract. It&apos;s generated by hashing your scope seed 🌱 
                  with your address or DNS, creating a unique identifier for your verification requirements.
                </p>
              </div>
            </div>
          </div>


          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Address or URL
                </label>
                <div className="relative">
                  <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={handleAddressChange}
                    placeholder="0x1234... or https://example.com"
                    className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition-all font-mono text-sm ${addressError
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : isAddressValid
                        ? 'border-green-300 bg-green-50 focus:border-green-500'
                        : 'border-gray-200 bg-white focus:border-blue-500'
                      }`}
                    style={{ wordBreak: 'break-all' }}
                  />
                  {isAddressValid && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-green-500 text-lg">✓</span>
                    </div>
                  )}
                </div>
                {addressError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {addressError}
                  </p>
                )}
              </div>

              {/* Scope Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Scope seed 🌱
                </label>
                <div className="relative">
                  <input
                    id="scope"
                    type="text"
                    value={scope}
                    onChange={handleScopeChange}
                    placeholder="enter scope (max 20 chars)"
                    maxLength={20}
                    className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition-all ${scopeError
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : isScopeValid
                        ? 'border-green-300 bg-green-50 focus:border-green-500'
                        : 'border-gray-200 bg-white focus:border-blue-500'
                      }`}
                  />
                  {isScopeValid && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-green-500 text-lg">✓</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  {scopeError && (
                    <p className="text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {scopeError}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {scope.length}/20 chars
                  </p>
                </div>
              </div>
            </div>

            {/* Results Display */}
            {hashedEndpoint && (
              <div className="mt-8">
                {!areBothValid && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center">
                      <span className="text-amber-500 text-xl mr-3">⚠️</span>
                      <p className="text-amber-800 font-medium">
                        Warning: One or both fields are not valid. The hash below may not be accurate.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        🎯
                      </span>
                      Generated Scope
                    </h3>
                    <button
                      onClick={copyToClipboard}
                      className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${copySuccess
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 shadow-sm'
                        }`}
                    >
                      {copySuccess ? (
                        <>
                          <span className="mr-2">✓</span>
                          Copied!
                        </>
                      ) : (
                        <>
                          <span className="mr-2">📋</span>
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <code className="text-sm text-gray-900 break-all font-mono leading-relaxed">
                      {hashedEndpoint}
                    </code>
                  </div>

                  <div className="mt-4 text-sm text-blue-700">
                    <p className="flex items-center">
                      <span className="mr-2">💡</span>
                      Use this value as the scope parameter in your Self Verification contract
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Input Summary */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Address/URL</h4>
                <p className={`text-sm ${isAddressValid ? 'text-green-600' : 'text-gray-500'}`}>
                  {address || 'Not set'}
                  {isAddressValid && <span className="ml-2">✓</span>}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Scope Seed</h4>
                <p className={`text-sm ${isScopeValid ? 'text-green-600' : 'text-gray-500'}`}>
                  {scope || 'Not set'}
                  {isScopeValid && <span className="ml-2">✓</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hub Contract Operations Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg mb-12">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-lg flex items-center justify-center mr-3">
                <span className="text-lg">🏛️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-black">Hub Contract Operations</h2>
                <p className="text-gray-600 text-sm">Configure verification parameters and manage contract interactions</p>
              </div>
            </div>

            {/* Unified Network Selection */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6 mb-8">
              <h4 className="text-gray-900 font-semibold mb-4 flex items-center">
                <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3 text-sm">🌐</span>
                Network Selection
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedNetwork === 'celo' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="unified-network"
                    value="celo"
                    checked={selectedNetwork === 'celo'}
                    onChange={(e) => setSelectedNetwork(e.target.value as 'celo' | 'alfajores')}
                    className="mr-4"
                  />
                  <Image src="/celo.webp" alt="Celo" width={32} height={32} className="h-8 w-8 mr-4 rounded-full" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Celo Mainnet</div>
                    <div className="text-xs text-gray-600 font-mono">{DEFAULT_HUB_ADDRESSES.celo}</div>
                  </div>
                  {selectedNetwork === 'celo' && (
                    <span className="text-blue-500 text-lg">✓</span>
                  )}
                </label>
                
                <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedNetwork === 'alfajores' 
                    ? 'border-amber-500 bg-amber-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="unified-network"
                    value="alfajores"
                    checked={selectedNetwork === 'alfajores'}
                    onChange={(e) => setSelectedNetwork(e.target.value as 'celo' | 'alfajores')}
                    className="mr-4"
                  />
                  <Image src="/celo_testnet.webp" alt="Celo Testnet" width={32} height={32} className="h-8 w-8 mr-4 rounded-full" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Celo Testnet</div>
                    <div className="text-xs text-gray-600 font-mono">{DEFAULT_HUB_ADDRESSES.alfajores}</div>
                  </div>
                  {selectedNetwork === 'alfajores' && (
                    <span className="text-amber-500 text-lg">✓</span>
                  )}
                </label>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700 flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <strong>Active Network:</strong> {selectedNetwork === 'celo' ? 'Celo Mainnet' : 'Celo Testnet (Alfajores)'}
                </p>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  This selection applies to both Set and Read operations
                </p>
              </div>
            </div>

          {/* Set Verification Config Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-black">⚙️ Set Verification Config</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Configure what verification requirements users must meet
                </p>
              </div>
              <button
                onClick={() => {
                  // Load default example configuration (empty - no verification requirements)
                  setOlderThanEnabled(false);
                  setOlderThan('0');
                  setForbiddenCountriesEnabled(false);
                  setForbiddenCountriesPacked(['0', '0', '0', '0']);
                  setOfacEnabled([false, false, false]);
                }}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                📋 Load Example Config
              </button>
            </div>

            {/* Example Config Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h4 className="text-blue-800 font-bold mb-2">💡 Example Configuration</h4>
              <p className="text-blue-700 mb-3 text-sm leading-relaxed">
                Try the &ldquo;Load Example Config&rdquo; button to see a sample setup with <strong>no verification requirements</strong>:
              </p>
              <ul className="text-blue-600 text-sm space-y-1 ml-4">
                <li>• Age verification: <strong>Disabled</strong> (allows all ages)</li>
                <li>• Forbidden countries: <strong>Disabled</strong> (allows all countries)</li>
                <li>• OFAC compliance: <strong>Disabled</strong> (no OFAC checks)</li>
              </ul>
              <p className="text-blue-700 mt-3 text-sm leading-relaxed">
                This creates an <em>open configuration</em> where all users can verify without restrictions.
              </p>
              <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-600 font-mono">
                  Expected Config ID: 0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61
                </p>
              </div>
            </div>

          <div className="space-y-4">

            {/* Age Verification */}
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={olderThanEnabled}
                  onChange={(e) => setOlderThanEnabled(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-black">Enable Age Verification</span>
              </label>
              {olderThanEnabled && (
                <input
                  type="number"
                  value={olderThan}
                  onChange={(e) => setOlderThan(e.target.value)}
                  placeholder="18"
                  min="0"
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              )}
            </div>

            {/* Forbidden Countries */}
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={forbiddenCountriesEnabled}
                  onChange={(e) => setForbiddenCountriesEnabled(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-black">Enable Forbidden Countries</span>
              </label>
              {forbiddenCountriesEnabled && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {forbiddenCountriesPacked.map((value, index) => (
                    <input
                      key={index}
                      type="text"
                      value={value}
                      onChange={(e) => {
                        const newPacked = [...forbiddenCountriesPacked] as [string, string, string, string];
                        newPacked[index] = e.target.value;
                        setForbiddenCountriesPacked(newPacked);
                      }}
                      placeholder={`Packed ${index + 1}`}
                      className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* OFAC Settings */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">OFAC Settings</label>
              <div className="flex gap-4">
                {['OFAC 1', 'OFAC 2', 'OFAC 3'].map((label, index) => (
                  <label key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ofacEnabled[index]}
                      onChange={(e) => {
                        const newOfac = [...ofacEnabled] as [boolean, boolean, boolean];
                        newOfac[index] = e.target.checked;
                        setOfacEnabled(newOfac);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-black">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Deploy Button */}
            <div className="pt-4">
              <button
                onClick={setVerificationConfig}
                disabled={!isConnected}
                className="px-6 py-3 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-xl hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:text-gray-600 transition-all font-semibold"
              >
                {isConnected ? 'Set Verification Config' : 'Connect Wallet First'}
              </button>
            </div>

            {/* Status Messages */}
            {configError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {configError}
              </div>
            )}
            {configSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700">
                {configSuccess}
              </div>
            )}

            {generatedConfigId && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
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
                  <code className="text-sm text-blue-700 break-all font-mono bg-blue-100 px-2 py-1 rounded">
                    {generatedConfigId}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedConfigId)}
                    className="ml-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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

          {/* Divider */}
          <div className="border-t border-gray-300 my-8"></div>

          {/* Read Config Section */}
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-black">📖 Read Verification Config</h3>
              <p className="text-gray-600 text-sm mt-1">
                Read verification configuration by config ID (no wallet connection required)
              </p>
            </div>

            <div className="space-y-4">

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="readConfigId" className="block text-sm font-medium text-black">
                    Config ID
                  </label>
                  <button
                    onClick={() => setReadConfigId('0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61')}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    📋 Use Example ID
                  </button>
                </div>
                <input
                  id="readConfigId"
                  type="text"
                  value={readConfigId}
                  onChange={(e) => setReadConfigId(e.target.value)}
                  placeholder="Enter config ID to read"
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>

              <button
                onClick={readVerificationConfig}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold hover:shadow-lg"
              >
                Read Config
              </button>

              {/* Read Config Status Messages */}
              {readConfigError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{readConfigError}</p>
                </div>
              )}

              {readConfigResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
                    <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-3">
                      <p className="text-orange-700 font-medium">⚠️ Verification Requirements Active</p>
                      <p className="text-orange-600 text-sm mt-1">
                        This configuration has active verification requirements as detailed below.
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
        </div>
      </div>
        
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
          toast.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}>
          <div className={`flex items-center p-5 rounded-xl shadow-2xl min-w-96 max-w-2xl ${
            toast.type === 'success' ? 'bg-green-50 border-2 border-green-300' :
            toast.type === 'error' ? 'bg-red-50 border-2 border-red-300' :
            'bg-blue-50 border-2 border-blue-300'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
              toast.type === 'success' ? 'bg-green-100' :
              toast.type === 'error' ? 'bg-red-100' :
              'bg-blue-100'
            }`}>
              <span className="text-lg">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </span>
            </div>
            <div className="flex-1">
              <p className={`text-base font-semibold ${
                toast.type === 'success' ? 'text-green-800' :
                toast.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className={`ml-4 text-xl font-bold hover:scale-110 transition-transform ${
                toast.type === 'success' ? 'text-green-600 hover:text-green-800' :
                toast.type === 'error' ? 'text-red-600 hover:text-red-800' :
                'text-blue-600 hover:text-blue-800'
              }`}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image src="/self_logo.svg" alt="Self Logo" width={32} height={32} className="h-8 w-8 mr-3" />
                <span className="text-xl font-bold">Self Protocol</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Verify real users while preserving privacy. Build the future of identity verification.
              </p>
              <div className="flex space-x-4">
                <a href="https://github.com/selfxyz/self" target="_blank" rel="noopener noreferrer"
                   className="text-gray-400 hover:text-[#5BFFB6] transition-colors">
                  <Image src="/github.png" alt="GitHub" width={20} height={20} className="h-5 w-5 rounded-full" />
                </a>
                <a href="https://t.me/selfbuilder" target="_blank" rel="noopener noreferrer"
                   className="text-gray-400 hover:text-[#5BFFB6] transition-colors">
                  <Image src="/telegram.webp" alt="Telegram" width={20} height={20} className="h-5 w-5 rounded-full" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Developer Resources</h4>
              <div className="space-y-3">
                <a href="https://docs.self.xyz" target="_blank" rel="noopener noreferrer" 
                   className="block text-gray-400 hover:text-[#5BFFB6] transition-colors">
                  Documentation
                </a>
                <a href="https://docs.self.xyz/use-self/using-mock-passports" target="_blank" rel="noopener noreferrer"
                   className="block text-gray-400 hover:text-[#5BFFB6] transition-colors">
                  Mock Passports
                </a>
                <a href="https://github.com/selfxyz/self" target="_blank" rel="noopener noreferrer"
                   className="block text-gray-400 hover:text-[#5BFFB6] transition-colors">
                   GitHub Repository
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-6 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 Self Labs
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
