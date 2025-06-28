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

  // Generate hash when both fields have values (regardless of validity)
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
        alert('Please install MetaMask to connect your wallet');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
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
          alert(`Successfully switched to ${NETWORKS[networkKey].chainName}`);
        } catch (switchError: unknown) {
          // If the network doesn't exist, add it
          if ((switchError as { code?: number }).code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [NETWORKS[networkKey]],
            });
            alert(`Successfully added ${NETWORKS[networkKey].chainName} to MetaMask`);
          } else {
            throw switchError;
          }
        }
      } else {
        alert('Please install MetaMask to add networks');
      }
    } catch (error: unknown) {
      console.error('Error adding network:', error);
      alert(`Failed to add network to MetaMask: ${(error as Error).message || 'Unknown error'}`);
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
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <Image src="/self_logo.svg" alt="Self Logo" width={48} height={48} className="h-12 w-12 mr-3" />
            <h1 className="text-4xl font-bold text-black">
              Self Developer Tools
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="https://github.com/selfxyz/self"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Image src="/github.png" alt="GitHub" width={20} height={20} className="h-5 w-5 mr-2 rounded-full" />
              Star on GitHub
            </a>
            <a
              href="https://docs.self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📚 Documentation
            </a>
            <a
              href="https://t.me/selfbuilder"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Image src="/telegram.webp" alt="Telegram" width={20} height={20} className="h-5 w-5 mr-2" />
              Builder Channel
            </a>
          </div>
        </div>

        {/* Mock Passport & App Install Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mock Passport Section */}
          <div>
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 ">
              <h2 className="text-xl font-semibold text-black mb-4">🆔 Don&apos;t have a biometric passport?</h2>
              <p className="text-gray-700">
                Learn how to generate a mock one in the Self app.{' '}
                <a
                  href="https://docs.self.xyz/use-self/using-mock-passports"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Read the documentation
                </a>
              </p>
            </div>
          </div>

          {/* App Install Section */}
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h2 className="text-xl font-semibold text-black mb-8">📱 Install the Self App</h2>
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-3 inline-block">
                <QRCodeSVG
                  value="https://redirect.self.xyz"
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Connection Section */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-black mb-6">🔗 Wallet Connection</h2>

          {/* Wallet Status */}
          <div className="mb-8">
            {!isConnected ? (
              <div className="text-center">
                <button
                  onClick={connectWallet}
                  className="flex items-center justify-center px-6 py-3 text-white bg-black rounded-lg hover:bg-gray-800 transition-colors hover:cursor-pointer font-medium"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium mb-1">Connected Wallet</p>
                    <p className="font-mono text-sm text-green-800">{walletAddress}</p>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="flex items-center px-4 py-2 text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors hover:cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mainnet & Testnet Side by Side */}
          <div className="flex flex-row gap-12">
            {/* Mainnet */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Mainnet</h3>
              <button
                onClick={() => addNetworkToMetaMask('celo')}
                className="flex items-center px-4 py-3 text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors hover:cursor-pointer"
              >
                <Image src="/celo.webp" alt="Celo" width={24} height={24} className="h-6 w-6 mr-3 rounded-full" />
                <span className="font-medium">Switch to Celo</span>
              </button>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Testnet</h3>
              <div className="flex flex-row gap-5">
                <button
                  onClick={() => addNetworkToMetaMask('alfajores')}
                  className="flex items-center px-4 py-3 text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors hover:cursor-pointer"
                >
                  <Image src="/celo_testnet.webp" alt="Celo Testnet" width={24} height={24} className="h-6 w-6 mr-3 rounded-full" />
                  <span className="font-medium">Switch to Celo Testnet</span>
                </button>
                <a
                  href="https://faucet.celo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center w-fit px-4 py-3 text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors hover:cursor-pointer"
                >
                  <span className="mr-2">🚰</span>
                  <span className="font-medium">Get Testnet Funds</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scope Generator Section (Existing) */}
        <div className="bg-gray-50 rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold text-black mb-4">🔧 Scope Generator</h2>
          <p className="text-gray-600 ">
            Hash the Scope seed 🌱 with the address or DNS to generate the Scope.
          </p>
          <p className="text-gray-600 mb-6">
            The scope is the final value you want to set in your Self Verification contract.
          </p>


          <div className="max-w-md mx-auto space-y-6">
            <div className="space-y-4">
              {/* Address Input */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Address or URL
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={handleAddressChange}
                  placeholder="0x1234... or https://example.com"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-colors ${addressError
                    ? 'border-red-500 bg-red-50'
                    : isAddressValid
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white'
                    }`}
                />
                {addressError && (
                  <p className="mt-1 text-sm text-red-600">{addressError}</p>
                )}
              </div>

              {/* Scope Input */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Scope seed 🌱
                </label>
                <input
                  id="scope"
                  type="text"
                  value={scope}
                  onChange={handleScopeChange}
                  placeholder="enter scope (max 20 chars)"
                  maxLength={20}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-colors ${scopeError
                    ? 'border-red-500 bg-red-50'
                    : isScopeValid
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white'
                    }`}
                />
                <div className="flex justify-between items-center mt-1">
                  {scopeError && (
                    <p className="text-sm text-red-600">{scopeError}</p>
                  )}
                  <p className="text-sm text-gray-600 ml-auto">
                    {scope.length}/20 chars
                  </p>
                </div>
              </div>
            </div>

            {/* Status Display */}
            <div className="mt-8 p-4 bg-white rounded-md border">
              <h3 className="text-lg font-medium text-black mb-2">Current Values:</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-black">Address/URL:</span>{' '}
                  <span className={isAddressValid ? 'text-green-600' : 'text-gray-600'}>
                    {address || 'Not set'}
                  </span>
                  {isAddressValid && (
                    <span className="ml-2 text-green-600">✓ Valid</span>
                  )}
                </p>
                <p>
                  <span className="font-medium text-black">Scope seed:</span>{' '}
                  <span className={isScopeValid ? 'text-green-600' : 'text-gray-600'}>
                    {scope || 'Not set'}
                  </span>
                  {isScopeValid && (
                    <span className="ml-2 text-green-600">✓ Valid</span>
                  )}
                </p>
                {hashedEndpoint && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-black">Scope Value:</p>
                      {areBothValid && (
                        <button
                          onClick={copyToClipboard}
                          className={`px-3 py-1 text-xs rounded transition-colors ${copySuccess
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
                            }`}
                        >
                          {copySuccess ? '✓ Copied!' : 'Copy'}
                        </button>
                      )}
                    </div>

                    {!areBothValid && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Warning: One or both fields are not valid. The hash below may not be accurate.
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded border">
                      <code className="text-sm text-black break-all font-mono">
                        {hashedEndpoint}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hub Contract Operations Section */}
        <div className="bg-gray-50 rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold text-black mb-4">🏛️ Hub Contract Operations</h2>
          <p className="text-gray-600 mb-6">
            Configure verification parameters, deploy to the hub contract, and read existing configurations
          </p>

          {/* Unified Network Selection */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
            <h4 className="text-gray-800 font-medium mb-3">🌐 Select Network</h4>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="unified-network"
                  value="celo"
                  checked={selectedNetwork === 'celo'}
                  onChange={(e) => setSelectedNetwork(e.target.value as 'celo' | 'alfajores')}
                  className="mr-3"
                />
                <Image src="/celo.webp" alt="Celo" width={24} height={24} className="h-6 w-6 mr-3 rounded-full" />
                <div>
                  <div className="text-sm font-medium text-black">Celo Mainnet</div>
                  <div className="text-xs text-gray-500">{DEFAULT_HUB_ADDRESSES.celo}</div>
                </div>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="unified-network"
                  value="alfajores"
                  checked={selectedNetwork === 'alfajores'}
                  onChange={(e) => setSelectedNetwork(e.target.value as 'celo' | 'alfajores')}
                  className="mr-3"
                />
                <Image src="/celo_testnet.webp" alt="Celo Testnet" width={24} height={24} className="h-6 w-6 mr-3 rounded-full" />
                <div>
                  <div className="text-sm font-medium text-black">Celo Testnet (Alfajores)</div>
                  <div className="text-xs text-gray-500">{DEFAULT_HUB_ADDRESSES.alfajores}</div>
                </div>
              </label>
            </div>
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-700">
                ✅ <strong>Active:</strong> {selectedNetwork === 'celo' ? 'Celo Mainnet' : 'Celo Testnet (Alfajores)'} - 
                Hub: <code className="bg-green-100 px-1 rounded">{DEFAULT_HUB_ADDRESSES[selectedNetwork]}</code>
              </p>
              <p className="text-xs text-green-600 mt-1">
                ℹ️ This network selection applies to both Set and Read operations
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-blue-800 font-medium mb-2">💡 Example Configuration</h4>
              <p className="text-blue-700 text-sm mb-3">
                Try the &ldquo;Load Example Config&rdquo; button to see a sample setup with <strong>no verification requirements</strong>:
              </p>
              <ul className="text-blue-600 text-sm space-y-1 ml-4">
                <li>• Age verification: <strong>Disabled</strong> (allows all ages)</li>
                <li>• Forbidden countries: <strong>Disabled</strong> (allows all countries)</li>
                <li>• OFAC compliance: <strong>Disabled</strong> (no OFAC checks)</li>
              </ul>
              <p className="text-blue-700 text-sm mt-3">
                This creates an <em>open configuration</em> where all users can verify without restrictions.
              </p>
              <div className="mt-3 p-2 bg-blue-100 rounded">
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
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
    </div>
  );
}
