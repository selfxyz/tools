'use client';

import { useState, useEffect } from 'react';
import { hashEndpointWithScope } from '@selfxyz/core';
import { ethers } from 'ethers';

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

// Hub contract ABI - Let's try different possible function names
const HUB_CONTRACT_ABI = [
  "function setVerificationConfigV2(tuple(bool olderThanEnabled, uint256 olderThan, bool forbiddenCountriesEnabled, uint256[4] forbiddenCountriesListPacked, bool[3] ofacEnabled) config) external returns (bytes32)",
  // Try multiple possible getter function names
  "function getVerificationConfigV2(bytes32 configId) external view returns (tuple(bool olderThanEnabled, uint256 olderThan, bool forbiddenCountriesEnabled, uint256[4] forbiddenCountriesListPacked, bool[3] ofacEnabled))",
  "function verificationConfigs(bytes32 configId) external view returns (tuple(bool olderThanEnabled, uint256 olderThan, bool forbiddenCountriesEnabled, uint256[4] forbiddenCountriesListPacked, bool[3] ofacEnabled))",
  "function getVerificationConfig(bytes32 configId) external view returns (tuple(bool olderThanEnabled, uint256 olderThan, bool forbiddenCountriesEnabled, uint256[4] forbiddenCountriesListPacked, bool[3] ofacEnabled))",
  "function generateConfigId(tuple(bool olderThanEnabled, uint256 olderThan, bool forbiddenCountriesEnabled, uint256[4] forbiddenCountriesListPacked, bool[3] ofacEnabled) config) external view returns (bytes32)"
];

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
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Verification config state
  const [hubContractAddress, setHubContractAddress] = useState('');
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
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setProvider(provider);
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
        } catch (switchError: any) {
          // If the network doesn't exist, add it
          if (switchError.code === 4902) {
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
    } catch (error: any) {
      console.error('Error adding network:', error);
      alert(`Failed to add network to MetaMask: ${error.message || 'Unknown error'}`);
    }
  };

  // Verification config functions
  const setVerificationConfig = async () => {
    if (!signer || !hubContractAddress) {
      setConfigError('Please connect wallet and enter hub contract address');
      return;
    }

    if (!validateEthereumAddress(hubContractAddress)) {
      setConfigError('Please enter a valid hub contract address');
      return;
    }

    try {
      setConfigError('');
      setConfigSuccess('');
      setGeneratedConfigId('');

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
    } catch (error: any) {
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
    if (!provider || !hubContractAddress) {
      setReadConfigError('Please connect wallet and enter hub contract address');
      return;
    }

    if (!readConfigId.trim()) {
      setReadConfigError('Please enter a config ID');
      return;
    }

    try {
      setReadConfigError('');
      setReadConfigResult(null);

      const contract = new ethers.Contract(hubContractAddress, HUB_CONTRACT_ABI, provider);

      // Try different possible function names
      let config;
      let functionUsed = '';

      try {
        config = await contract.getVerificationConfigV2(readConfigId);
        functionUsed = 'getVerificationConfigV2';
      } catch (e1) {
        try {
          config = await contract.verificationConfigs(readConfigId);
          functionUsed = 'verificationConfigs';
        } catch (e2) {
          try {
            config = await contract.getVerificationConfig(readConfigId);
            functionUsed = 'getVerificationConfig';
          } catch (e3) {
            throw new Error('None of the expected getter functions exist on this contract. Tried: getVerificationConfigV2, verificationConfigs, getVerificationConfig');
          }
        }
      }

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

      // Show which function worked in the console
      console.log(`Successfully read config using function: ${functionUsed}`);

    } catch (error: any) {
      console.error('Error reading verification config:', error);
      let errorMessage = (error as Error).message;

      // Check for common errors
      if (errorMessage.includes('missing revert data') || errorMessage.includes('CALL_EXCEPTION')) {
        errorMessage = 'Config ID not found or function call failed. Possible reasons:\n• Config ID does not exist in the contract\n• Wrong hub contract address\n• Network mismatch\n• Function does not exist on this contract';
      }

      setReadConfigError('Failed to read verification config: ' + errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black mb-4">
            Self.xyz Verification Tools
          </h1>
          <p className="text-gray-600">
            Tools for managing verification configurations and generating scope hashes
          </p>
        </div>

        {/* Wallet Connection Section */}
        <div className="bg-gray-50 rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold text-black mb-4">🔗 Wallet Connection</h2>
          <p className="text-gray-600 mb-4">
            Connect your wallet to interact with verification contracts
          </p>

          <div className="space-y-4">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Connected Address:</p>
                  <p className="font-mono text-sm text-black">{walletAddress}</p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => addNetworkToMetaMask('celo')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Celo Network
              </button>
              <button
                onClick={() => addNetworkToMetaMask('alfajores')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Add Alfajores Testnet
              </button>
            </div>
          </div>
        </div>

        {/* Scope Generator Section (Existing) */}
        <div className="bg-gray-50 rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold text-black mb-4">🔧 Scope Generator</h2>
          <p className="text-gray-600 mb-6">
            Generate scope hashes for verification endpoints
          </p>

          <div className="max-w-md mx-auto space-y-6">
            <div className="space-y-4">
              {/* Address Input */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-black mb-2">
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
                <label htmlFor="scope" className="block text-sm font-medium text-black mb-2">
                  Scope
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
                  <span className="font-medium text-black">Scope:</span>{' '}
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
                      <p className="font-medium text-black">Generated Hash:</p>
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

        {/* Set Verification Config Section */}
        <div className="bg-gray-50 rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold text-black mb-4">⚙️ Set Verification Config</h2>
          <p className="text-gray-600 mb-4">
            Configure verification parameters and deploy to the hub contract
          </p>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-6">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Important:</strong> Only the contract owner can set verification configs.
              Make sure you're connected with the owner wallet address.
            </p>
          </div>

          <div className="space-y-4">
            {/* Hub Contract Address */}
            <div>
              <label htmlFor="hubAddress" className="block text-sm font-medium text-black mb-2">
                Hub Contract Address
              </label>
              <input
                id="hubAddress"
                type="text"
                value={hubContractAddress}
                onChange={(e) => setHubContractAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>

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

        {/* Read Verification Config Section */}
        <div className="bg-gray-50 rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold text-black mb-4">📖 Read Verification Config</h2>
          <p className="text-gray-600 mb-6">
            Read verification configuration by config ID from the hub contract
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="readConfigId" className="block text-sm font-medium text-black mb-2">
                Config ID
              </label>
              <input
                id="readConfigId"
                type="text"
                value={readConfigId}
                onChange={(e) => setReadConfigId(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>

            <button
              onClick={readVerificationConfig}
              disabled={!isConnected}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isConnected ? 'Read Config' : 'Connect Wallet First'}
            </button>

            {readConfigError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {readConfigError}
              </div>
            )}

            {readConfigResult && (
              <div className="p-4 bg-white border rounded-lg">
                <h3 className="font-semibold text-black mb-3">Configuration Details:</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Older Than Enabled:</span> {readConfigResult.olderThanEnabled ? 'Yes' : 'No'}</p>
                  <p><span className="font-medium">Older Than:</span> {readConfigResult.olderThan.toString()}</p>
                  <p><span className="font-medium">Forbidden Countries Enabled:</span> {readConfigResult.forbiddenCountriesEnabled ? 'Yes' : 'No'}</p>
                  <p><span className="font-medium">Forbidden Countries Packed:</span> [{readConfigResult.forbiddenCountriesListPacked.map(n => n.toString()).join(', ')}]</p>
                  <p><span className="font-medium">OFAC Enabled:</span> [{readConfigResult.ofacEnabled.map(String).join(', ')}]</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
