'use client';

import { useState, useEffect } from 'react';
import { hashEndpointWithScope, countryCodes } from '@selfxyz/core';
import { ethers } from 'ethers';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { HUB_CONTRACT_ABI } from '../contracts/hubABI';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWalletClient, useAccount, useSwitchChain } from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';

// Constants
const MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

// Types
interface VerificationConfigV2 {
  olderThanEnabled: boolean;
  olderThan: bigint;
  forbiddenCountriesEnabled: boolean;
  forbiddenCountriesListPacked: [bigint, bigint, bigint, bigint];
  ofacEnabled: [boolean, boolean, boolean];
}

// Country formatting function
export function formatCountriesList(countries: string[]) {
  // Check maximum list length
  if (countries.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    throw new Error(
      `Countries list must be inferior or equals to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`
    );
  }

  // Validate country codes
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

export default function Home() {
  const [address, setAddress] = useState('');
  const [scope, setScope] = useState('');
  const [addressError, setAddressError] = useState('');
  const [scopeError, setScopeError] = useState('');
  const [hashedEndpoint, setHashedEndpoint] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Wallet state
  const { data: walletClient } = useWalletClient();
  const { isConnected, chain: currentChain } = useAccount();
  const { switchChain } = useSwitchChain();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Default hub addresses and RPC URLs
  const DEFAULT_HUB_ADDRESSES = {
    celo: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF',
    alfajores: '0x68c931C9a534D37aa78094877F46fE46a49F1A51'
  };

  const RPC_URLS = {
    celo: 'https://forno.celo.org',
    alfajores: 'https://alfajores-forno.celo-testnet.org'
  };

  // Get current network from wallet connection
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
    
    return null; // Unsupported network
  };

  // Check if current wallet network is supported
  const isNetworkSupported = () => {
    return getCurrentNetwork() !== null;
  };

  // Get Celoscan URL for transaction
  const getCeloscanUrl = (txHash: string) => {
    const network = getCurrentNetwork();
    if (!network) return null;
    
    const baseUrl = network.key === 'celo' 
      ? 'https://celoscan.io/tx/' 
      : 'https://alfajores.celoscan.io/tx/';
    
    return baseUrl + txHash;
  };

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

  // Country selection state
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySelectionError, setCountrySelectionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Loading states for better UX
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const [isConfigDeploying, setIsConfigDeploying] = useState(false);
  const [isConfigReading, setIsConfigReading] = useState(false);

  // Professional interaction states
  const [particles, setParticles] = useState<Array<{
    id: number;
    emoji: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    scale: number;
    delay: number;
  }>>([]);
  const [isButtonAnimating, setIsButtonAnimating] = useState(false);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000); // Auto-hide after 5 seconds
  };

  // Truncate long strings for better mobile display
  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars + 3) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  // Professional interaction for "Ready to build" button
  const handleReadyToBuild = () => {
    // Prevent multiple rapid clicks
    if (isButtonAnimating) return;
    
    // Trigger sophisticated button animation
    setIsButtonAnimating(true);
    setTimeout(() => setIsButtonAnimating(false), 600);

    // Professional particle system
    const emojis = ['🚀', '⚡', '✨', '💎', '🌟'];
    const particleCount = 5; // More refined, fewer particles
    
    const newParticles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const velocity = 3 + Math.random() * 2;
      
      return {
        id: Date.now() + i,
        emoji: emojis[i % emojis.length],
        x: 0,
        y: 0,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 0.4,
        delay: i * 80, // Staggered launch
      };
    });

    setParticles(newParticles);
    
    // Curated success messages
    const messages = [
      "Ready to innovate! Let's build the future 🚀",
      "Time to revolutionize identity verification ⚡",
      "Your development journey starts now ✨",
      "Building cutting-edge solutions 💎",
      "Creating the next breakthrough 🌟"
    ];
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
    showToast(selectedMessage, 'success');

    // Clean particle system
    setTimeout(() => {
      setParticles([]);
    }, 2500);
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

  const addNetworkToMetaMask = async (networkKey: 'celo' | 'alfajores') => {
    setIsNetworkSwitching(true);
    try {
      const chainToSwitch = networkKey === 'celo' ? celo : celoAlfajores;
      
      await switchChain({ chainId: chainToSwitch.id });
      showToast(`Successfully switched to ${chainToSwitch.name} ⚡`, 'success');
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error switching network:', err);
      
      if (err.message.includes('rejected') || err.message.includes('denied')) {
        showToast('Network switch request was rejected', 'info');
      } else {
        showToast(`Failed to switch network: ${err.message}. Please try again or add the network manually in your wallet.`, 'error');
      }
    } finally {
      setIsNetworkSwitching(false);
    }
  };

  // Generate config ID using the contract's function to ensure accuracy
  const generateConfigIdFromContract = async (config: VerificationConfigV2) => {
    try {
      const currentNetwork = getCurrentNetwork();
      if (!currentNetwork) {
        throw new Error('No supported network detected');
      }

      // Create a provider for calling the pure function (no wallet needed)
      const readProvider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
      const contract = new ethers.Contract(currentNetwork.hubAddress, HUB_CONTRACT_ABI, readProvider);

      // Call the contract's generateConfigId function (it's pure, so no gas cost)
      const configId = await contract.generateConfigId(config);
      return configId;
    } catch (error) {
      console.error('Error generating config ID from contract:', error);
      // Fallback to local generation if contract call fails
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

  // Verification config functions
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

      // Create ethers provider and signer from wagmi walletClient
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();

      const currentNetwork = getCurrentNetwork();
      if (!currentNetwork) {
        throw new Error(`Unsupported network. Please switch to Celo Mainnet or Testnet in your wallet.`);
      }

      console.log('🌐 Using network from wallet:', {
        name: currentNetwork.name,
        chainId: currentChain?.id,
        hubAddress: currentNetwork.hubAddress,
        rpcUrl: currentNetwork.rpcUrl
      });

      const hubContractAddress = currentNetwork.hubAddress;
      
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

      console.log('Config to deploy:', config);

      // Generate config ID using the contract function to ensure accuracy
      const localConfigId = await generateConfigIdFromContract(config);
      console.log('Generated config ID from contract:', localConfigId);

      // Check if this config already exists on the contract
      const configExists = await contract.verificationConfigV2Exists(localConfigId);
      console.log('Config exists on contract:', configExists);

      if (configExists) {
        // Config already exists, no need to deploy again
        setGeneratedConfigId(localConfigId);
        setTransactionStatus('idle'); // No transaction needed
        setConfigSuccess('✅ Configuration already exists on-chain! No transaction needed (gas saved).');
        setTimeout(() => setConfigSuccess(''), 7000);
        return;
      }

      // Config doesn't exist, proceed with deployment
      console.log('Config does not exist, deploying...');
      const tx = await contract.setVerificationConfigV2(config);
      console.log('Transaction sent:', tx.hash);
      
      // Set transaction hash and pending status
      setTransactionHash(tx.hash);
      setTransactionStatus('pending');
      setConfigSuccess('🕐 Transaction sent! Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Transaction confirmed successfully
      setTransactionStatus('confirmed');
      setGeneratedConfigId(localConfigId);
      setConfigSuccess('✅ Verification config deployed successfully!');
      setTimeout(() => {
        setConfigSuccess('');
        setTransactionHash('');
        setTransactionStatus('idle');
      }, 10000); // Keep success message longer to show tx hash

    } catch (error: unknown) {
      console.error('Error setting verification config:', error);
      let errorMessage = (error as Error).message;

      // Enhanced error handling
      if (errorMessage.includes('could not decode result data') && errorMessage.includes('value="0x"')) {
        const network = getCurrentNetwork();
        errorMessage = `Contract not found or invalid at address ${network?.hubAddress || 'unknown'} on ${network?.name || 'current'} network. Please check:\n\n• Contract address is correct\n• You're connected to the right network\n• Contract is deployed on this network`;
      } else if (errorMessage.includes('CALL_EXCEPTION') || errorMessage.includes('execution reverted')) {
        errorMessage = 'Transaction reverted. This is likely because you are not the contract owner. Only the contract owner can set verification configs.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to pay for transaction. Please ensure you have enough tokens for gas fees.';
      } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        errorMessage = 'Transaction was rejected by the user.';
      }

      setConfigError('Failed to set verification config: ' + errorMessage);
      setTransactionStatus('failed');
    } finally {
      setIsConfigDeploying(false);
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

  // Age change handler
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = parseInt(e.target.value);
    setOlderThan(newAge.toString());
  };

  // Country selection handlers
  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryCode)) {
        setCountrySelectionError(null);
        return prev.filter(c => c !== countryCode);
      }
      
      if (prev.length >= MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
        setCountrySelectionError(`Maximum ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH} countries can be excluded`);
        return prev;
      }
      
      return [...prev, countryCode];
    });
  };

  const saveCountrySelection = () => {
    try {
      const formattedList = formatCountriesList(selectedCountries);
      
      // Convert to the required packed format for the contract
      const packed: [string, string, string, string] = ['0', '0', '0', '0'];
      
      // Pack the formatted list into 4 uint256 values
      for (let i = 0; i < 4; i++) {
        let value = BigInt(0);
        for (let j = 0; j < 30 && (i * 30 + j) < formattedList.length; j++) {
          value += BigInt(formattedList[i * 30 + j]) * (BigInt(256) ** BigInt(j));
        }
        packed[i] = value.toString();
      }
      
      setForbiddenCountriesPacked(packed);
      setShowCountryModal(false);
      setCountrySelectionError(null);
    } catch (error) {
      setCountrySelectionError((error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center min-w-0 flex-1">
              <Image src="/self_logo.svg" alt="Self Logo" width={32} height={32} className="h-8 w-8 sm:h-10 sm:w-10 mr-2 sm:mr-4 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-black truncate">
                  <span className="sm:hidden">Self Tools</span>
                  <span className="hidden sm:inline">Self Developer Tools</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">Privacy-preserving identity verification</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8 shrink-0">
              <a
                href="https://docs.self.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-black transition-colors font-medium text-xs sm:text-sm hidden sm:inline"
              >
                <span className="lg:hidden">Docs</span>
                <span className="hidden lg:inline">Documentation</span>
              </a>
              <a
                href="https://t.me/selfbuilder"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-lg sm:rounded-xl hover:shadow-lg transition-all text-xs sm:text-sm font-semibold transform hover:scale-105 active:scale-95 hover:shadow-xl"
              >
                <Image src="/telegram.webp" alt="Telegram" width={14} height={14} className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 rounded-full" />
                <span className="sm:inline">Telegram</span>
              </a>
              <a
                href="https://github.com/selfxyz/self"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 bg-black text-white rounded-lg sm:rounded-xl hover:bg-gray-800 transition-colors text-xs sm:text-sm font-semibold"
              >
                <Image src="/github.png" alt="GitHub" width={14} height={14} className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 rounded-full" />
                <span className="sm:inline">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="relative text-center mb-8 sm:mb-12 py-4 overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#5BFFB6]/5 via-transparent to-[#5BFFB6]/5 animate-pulse"></div>
          <div className="relative max-w-4xl mx-auto px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-4 leading-tight transform hover:scale-105 transition-transform duration-300">
              Everything you need to build with <span className="text-black bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] bg-clip-text text-transparent">Self Protocol</span>
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed px-4">
              Generate scopes, configure verification requirements, and test your integration with our comprehensive developer tools
            </p>
            <div className="relative">
              <button
                onClick={handleReadyToBuild}
                className={`inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all duration-300 font-semibold shadow-lg transform hover:scale-105 active:scale-95 hover:shadow-xl cursor-pointer text-sm sm:text-base ${
                  isButtonAnimating ? 'scale-105 shadow-2xl bg-gray-900' : ''
                }`}
                disabled={isButtonAnimating}
              >
                <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#5BFFB6] rounded-full mr-2 sm:mr-3 transition-all duration-300 ${
                  isButtonAnimating ? 'animate-ping bg-[#4AE6A0]' : 'animate-pulse'
                }`}></span>
                Ready to build
              </button>
              
              {/* Professional Particle System */}
              {particles.map((particle) => (
                <div
                  key={particle.id}
                  className="absolute pointer-events-none text-2xl z-20"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) scale(${particle.scale}) rotate(${particle.rotation}deg)`,
                    animation: `particleFloat 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                    animationDelay: `${particle.delay}ms`,
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                    '--particle-vx': `${particle.vx * 30}px`,
                    '--particle-vy': `${particle.vy * 30}px`,
                  } as React.CSSProperties & { [key: string]: string }}
                >

                  {particle.emoji}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Help Banner */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12 px-2 sm:px-0">
          <div className="bg-gradient-to-r from-[#5BFFB6]/10 via-blue-50 to-[#5BFFB6]/10 border border-[#5BFFB6]/30 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-xl flex items-center justify-center mb-4 sm:mb-0 sm:mr-6 animate-pulse">
                <span className="text-xl sm:text-2xl">🚀</span>
              </div>
              <div className="flex-1 mb-4 sm:mb-0">
                <h3 className="text-lg sm:text-xl font-bold text-black mb-2">Need Help Building?</h3>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  Join our active Telegram community for instant support, code examples, and direct access to the Self Protocol team!
                </p>
              </div>
              <a
                href="https://t.me/selfbuilder"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-xl hover:shadow-lg transition-all font-semibold text-sm sm:text-base transform hover:scale-105 active:scale-95 hover:shadow-xl group"
              >
                <Image src="/telegram.webp" alt="Telegram" width={20} height={20} className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 rounded-full group-hover:animate-bounce" />
                <span>Join Community</span>
                <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Quick Start Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12 max-w-4xl mx-auto px-2 sm:px-0">
          {/* App Install Card */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 hover:border-[#5BFFB6] transition-all hover:shadow-xl group transform hover:scale-[1.02] cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <span className="text-lg sm:text-xl">📱</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-black mb-2 sm:mb-3 group-hover:text-[#5BFFB6] transition-colors">Install Self App</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">Get started by installing the Self mobile app to create your digital identity</p>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200 mb-2 sm:mb-3 inline-block group-hover:bg-[#5BFFB6]/10 group-hover:border-[#5BFFB6]/30 transition-all duration-300">
                <QRCodeSVG
                  value="https://redirect.self.xyz"
                  size={120}
                  level="M"
                  className="sm:w-[140px] sm:h-[140px]"
                />
              </div>
              <p className="text-xs text-gray-500 font-medium group-hover:text-[#5BFFB6] transition-colors">Scan to download the app</p>
            </div>
          </div>

          {/* Mock Passport Card */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 hover:border-[#5BFFB6] transition-all hover:shadow-xl group transform hover:scale-[1.02] cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-black rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 group-hover:bg-gray-800">
                <span className="text-lg sm:text-xl text-white">🆔</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-black mb-2 sm:mb-3 group-hover:text-[#5BFFB6] transition-colors">Need a Mock Passport?</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">Don&apos;t have a biometric passport? Generate a mock one for testing</p>
              <a
                href="https://docs.self.xyz/use-self/using-mock-passports"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-lg hover:shadow-lg transition-all font-semibold text-xs sm:text-sm transform hover:scale-105 active:scale-95 hover:shadow-xl"
              >
                Learn How →
              </a>
            </div>
          </div>
        </div>

        {/* Wallet & Network Setup Section */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 mb-8 sm:mb-12 shadow-sm mx-2 sm:mx-0">
          <div className="flex items-center mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-lg flex items-center justify-center mr-3 animate-bounce hover:animate-none">
              <span className="text-base sm:text-lg">🔗</span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-black">Setup & Connection</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Connect your wallet and choose the right network</p>
            </div>
          </div>

          {/* Step 1: Wallet Connection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-black mb-3">Step 1: Connect Your Wallet</h3>
            {!isConnected ? (
              /* Wallet Connection Step */
              <div className="text-center bg-gray-50 rounded-lg p-4 sm:p-6 border-2 border-dashed border-gray-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-lg sm:text-xl">💼</span>
                </div>
                <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">Connect your wallet to interact with Self contracts</p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            ) : (
              /* Connected Status */
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Wallet Connected</h4>
                    <p className="text-xs text-green-700">{address ? truncateAddress(address) : 'Connected'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Network Status */}
          {isConnected && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-black mb-3">Step 2: Network Status</h3>
              <div className={`p-3 sm:p-4 rounded-lg border-2 ${
                isNetworkSupported() 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      isNetworkSupported() ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                    }`}></div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        isNetworkSupported() ? 'text-green-800' : 'text-amber-800'
                      }`}>
                        {getCurrentNetwork()?.name || 'Unknown Network'}
                      </p>
                      <p className={`text-xs ${
                        isNetworkSupported() ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {isNetworkSupported() 
                          ? '✓ Compatible with Self Protocol' 
                          : '⚠️ Please switch to a supported network'}
                      </p>
                    </div>
                  </div>
                  {getCurrentNetwork() && (
                    <Image 
                      src={getCurrentNetwork()?.key === 'celo' ? '/celo.webp' : '/celo_testnet.webp'} 
                      alt="Network" 
                      width={24} 
                      height={24} 
                      className="h-6 w-6 rounded-full" 
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Network Selection */}
          {isConnected && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-black">
                  {isNetworkSupported() ? 'Switch Networks (Optional)' : 'Choose a Supported Network'}
                </h3>
                {isNetworkSupported() && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Ready to use</span>
                )}
              </div>

              {/* Quick Guide */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 mb-2 font-medium">💡 Which network should I choose?</p>
                <div className="space-y-1 text-xs text-blue-600">
                  <p><strong>Testnet:</strong> Free to use, perfect for testing and development</p>
                  <p><strong>Mainnet:</strong> Real transactions, costs real money, for production use</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Testnet - Recommended for most users */}
                <div className={`rounded-xl p-4 border-2 transition-all relative ${
                  currentChain?.id === 44787 
                    ? 'border-[#5BFFB6] bg-gradient-to-br from-[#5BFFB6]/10 to-[#4AE6A0]/10 shadow-lg' 
                    : 'border-gray-200 bg-gray-50 hover:border-[#5BFFB6] hover:bg-gradient-to-br hover:from-[#5BFFB6]/5 hover:to-[#4AE6A0]/5'
                }`}>
                  {/* Recommended Badge */}
                  <div className="absolute -top-2 left-4">
                    <span className="bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                  
                  <div className="flex items-center mb-3 pt-2">
                    <Image src="/celo_testnet.webp" alt="Celo Testnet" width={28} height={28} className="h-7 w-7 mr-3 rounded-full" />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-base font-semibold text-black mr-2">Celo Testnet</h3>
                        {currentChain?.id === 44787 && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">Free testing environment</p>
                    </div>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Free transactions
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Perfect for development
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      No real value at risk
                    </div>
                  </div>

                  <div className="space-y-2">
                    {currentChain?.id === 44787 ? (
                      <div className="w-full flex items-center justify-center px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold">
                        ✓ Currently Active
                      </div>
                    ) : (
                      <button
                        onClick={() => addNetworkToMetaMask('alfajores')}
                        disabled={isNetworkSwitching}
                        className="w-full flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-lg hover:shadow-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-semibold transform hover:scale-105 active:scale-95 hover:shadow-xl text-sm"
                      >
                        {isNetworkSwitching ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2"></div>
                            Switching...
                          </>
                        ) : (
                          <>🔄 Switch to Testnet</>
                        )}
                      </button>
                    )}
                    <a
                      href="https://faucet.celo.org/alfajores"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                    >
                      💧 Get Free Testnet Tokens
                    </a>
                  </div>
                </div>

                {/* Mainnet */}
                <div className={`rounded-xl p-4 border-2 transition-all ${
                  currentChain?.id === 42220 
                    ? 'border-black bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg' 
                    : 'border-gray-200 bg-gray-50 hover:border-gray-400'
                }`}>
                  <div className="flex items-center mb-3">
                    <Image src="/celo.webp" alt="Celo" width={28} height={28} className="h-7 w-7 mr-3 rounded-full" />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-base font-semibold text-black mr-2">Celo Mainnet</h3>
                        {currentChain?.id === 42220 && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">Production network</p>
                    </div>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      Real transactions
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      Costs real money
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      For production apps
                    </div>
                  </div>

                  {currentChain?.id === 42220 ? (
                    <div className="w-full flex items-center justify-center px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold">
                      ✓ Currently Active
                    </div>
                  ) : (
                    <button
                      onClick={() => addNetworkToMetaMask('celo')}
                      disabled={isNetworkSwitching}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 text-sm"
                    >
                      {isNetworkSwitching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Switching...
                        </>
                      ) : (
                        <>🔄 Switch to Mainnet</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Pro Tip */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">💡 Pro tip:</span> Start with Testnet to learn and experiment, then switch to Mainnet when you&apos;re ready to deploy for real users.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Scope Generator Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-lg mb-8 sm:mb-12 mx-2 sm:mx-0">
          <div className="flex items-center mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-lg flex items-center justify-center mr-3 hover:rotate-12 transition-transform duration-300">
              <span className="text-base sm:text-lg">🔧</span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-black">Scope Generator</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Hash the scope seed with your address or DNS to generate the scope value</p>
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
                    className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition-all font-mono text-sm transform focus:scale-[1.02] hover:shadow-md overflow-hidden ${addressError
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                      : isAddressValid
                        ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200'
                        : 'border-gray-200 bg-white focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    style={{ wordBreak: 'break-all', overflowWrap: 'break-word', textOverflow: 'ellipsis', direction: 'ltr' }}
                    inputMode="text"
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
                    className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition-all transform focus:scale-[1.02] hover:shadow-md ${scopeError
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                      : isScopeValid
                        ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200'
                        : 'border-gray-200 bg-white focus:border-blue-500 focus:ring-blue-200'
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
                      className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95 ${copySuccess
                        ? 'bg-green-500 text-white shadow-lg animate-pulse'
                        : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-md'
                        }`}
                    >
                      {copySuccess ? (
                        <>
                          <span className="mr-2 animate-bounce">✓</span>
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

                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm overflow-hidden">
                    <div className="text-sm text-gray-900 font-mono leading-relaxed break-all overflow-wrap-anywhere">
                      {hashedEndpoint}
                    </div>
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
                <p className={`text-sm ${isAddressValid ? 'text-green-600' : 'text-gray-500'}`}
                  style={{wordBreak: 'break-all'}}>
                  {address
                    ? truncateAddress(address, 8, 6)
                    : 'Not set'}
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg mb-8 sm:mb-12 mx-2 sm:mx-0">
          <div className="p-4 sm:p-6">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-lg flex items-center justify-center mr-3 hover:scale-110 hover:rotate-6 transition-all duration-300">
                <span className="text-base sm:text-lg">🏛️</span>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-black">Hub Contract Operations</h2>
                <p className="text-gray-600 text-xs sm:text-sm">Configure verification parameters and manage contract interactions</p>
              </div>
            </div>

            {/* Current Network Status */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6 mb-8">
              <h4 className="text-gray-900 font-semibold mb-4 flex items-center">
                <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3 text-sm">🌐</span>
                Network Status
              </h4>
              
              {!isConnected ? (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                  <p className="text-gray-600 text-sm flex items-center">
                    <span className="text-gray-400 mr-2">⏳</span>
                    <strong>No wallet connected.</strong> Please connect your wallet to see network status.
                  </p>
                </div>
              ) : !isNetworkSupported() ? (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-lg">❌</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-red-800 mb-2">Unsupported Network</h4>
                      <p className="text-red-700 text-sm mb-3">
                        Your wallet is connected to <strong>{currentChain?.name}</strong>, which is not supported.
                      </p>
                      <p className="text-red-600 text-xs mb-3">
                        Please switch to Celo Mainnet or Testnet to use this application.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-green-700 text-sm flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    <strong>Connected to {getCurrentNetwork()?.name}</strong>
                  </p>
                  <div className="mt-2 text-xs text-green-600 font-mono">
                    Hub: {truncateAddress(getCurrentNetwork()?.hubAddress || '', 8, 6)}
                  </div>
                </div>
              )}
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
                  setSelectedCountries([]);
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
                <p className="text-xs text-blue-600">
                  <span className="font-semibold">Expected Config ID:</span>
                </p>
                <div className="text-xs text-blue-600 font-mono mt-1 overflow-hidden">
                  <div className="break-all">
                    <span className="sm:hidden">{truncateAddress('0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61', 8, 8)}</span>
                    <span className="hidden sm:inline">{truncateAddress('0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61', 12, 12)}</span>
                  </div>
                </div>
              </div>
            </div>

          <div className="space-y-4">

            {/* Age Verification */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={olderThanEnabled}
                  onChange={(e) => setOlderThanEnabled(e.target.checked)}
                  className="mr-3 h-4 w-4"
                />
                <span className="text-sm font-medium text-black">Enable Age Verification</span>
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
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={forbiddenCountriesEnabled}
                  onChange={(e) => setForbiddenCountriesEnabled(e.target.checked)}
                  className="mr-3 h-4 w-4"
                />
                <span className="text-sm font-medium text-black">Enable Forbidden Countries</span>
              </label>
              {forbiddenCountriesEnabled && (
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => setShowCountryModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Configure Excluded Countries
                  </button>
                  <div className="text-sm text-gray-700">
                    {selectedCountries.length > 0 
                      ? `${selectedCountries.length} countries excluded` 
                      : "No countries excluded"}
                  </div>
                  {selectedCountries.length > 0 && (
                    <div className="max-h-20 overflow-y-auto">
                      <div className="flex flex-wrap gap-1">
                        {selectedCountries.slice(0, 10).map((code) => (
                          <span key={code} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {countryCodes[code as keyof typeof countryCodes] || code}
                          </span>
                        ))}
                        {selectedCountries.length > 10 && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                            +{selectedCountries.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
                disabled={!isConnected || isConfigDeploying}
                className="px-6 py-3 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-xl hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:text-gray-600 transition-all font-semibold transform hover:scale-105 active:scale-95 hover:shadow-xl"
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
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {configError}
              </div>
            )}
            {configSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700">
                {configSuccess}
              </div>
            )}

            {/* Transaction Status */}
            {transactionHash && (
              <div className={`p-4 border rounded-lg ${
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
                  {/* Transaction Hash */}
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

                  {/* Celoscan Link */}
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

                  {/* Status Message */}
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
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="readConfigId" className="block text-sm font-medium text-black">
                      Config ID
                    </label>
                  </div>
                  <button
                    onClick={() => setReadConfigId('0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61')}
                    className="w-full sm:w-auto mb-3 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold text-sm transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
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
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black font-mono text-sm overflow-hidden"
                    style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
                  />
                  {readConfigId && (
                    <div className="mt-1 text-xs text-gray-500 font-mono overflow-hidden">
                      <div className="break-all">
                        <span className="sm:hidden">{truncateAddress(readConfigId, 8, 8)}</span>
                        <span className="hidden sm:inline">{truncateAddress(readConfigId, 12, 12)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={readVerificationConfig}
                disabled={isConfigReading}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 hover:shadow-xl"
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
        </div>
      </div>
        
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 sm:top-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50 transition-all duration-300 ${
          toast.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}>
          <div className={`flex items-center p-3 sm:p-5 rounded-xl shadow-2xl w-full sm:min-w-96 sm:max-w-2xl ${
            toast.type === 'success' ? 'bg-green-50 border-2 border-green-300' :
            toast.type === 'error' ? 'bg-red-50 border-2 border-red-300' :
            'bg-blue-50 border-2 border-blue-300'
          }`}>
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-3 sm:mr-4 ${
              toast.type === 'success' ? 'bg-green-100' :
              toast.type === 'error' ? 'bg-red-100' :
              'bg-blue-100'
            }`}>
              <span className="text-sm sm:text-lg">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </span>
            </div>
            <div className="flex-1">
              <p className={`text-sm sm:text-base font-semibold ${
                toast.type === 'success' ? 'text-green-800' :
                toast.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className={`ml-3 sm:ml-4 text-lg sm:text-xl font-bold hover:scale-110 transition-transform ${
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

      {/* Mobile Telegram Floating Button */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <a
          href="https://t.me/selfbuilder"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse hover:animate-none"
        >
          <Image src="/telegram.webp" alt="Join Telegram" width={24} height={24} className="h-6 w-6 rounded-full" />
        </a>
      </div>

      {/* Country Selection Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-black">Select Countries to Exclude</h3>
                <button
                  onClick={() => setShowCountryModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {countrySelectionError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{countrySelectionError}</p>
                </div>
              )}
              
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(countryCodes)
                  .filter(([, countryName]) =>
                    countryName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(([code, countryName]) => (
                    <label 
                      key={code} 
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(code)}
                        onChange={() => handleCountryToggle(code)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900 flex-1">{countryName}</span>
                      <span className="text-xs text-gray-500 font-mono">{code}</span>
                    </label>
                  ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedCountries.length} of {MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH} countries selected
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setSelectedCountries([]);
                      setCountrySelectionError(null);
                    }}
                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowCountryModal(false)}
                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCountrySelection}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Apply Selection
                  </button>
                </div>
              </div>
            </div>
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

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes particleFloat {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--particle-vx)), calc(-50% + var(--particle-vy))) scale(0.6);
          }
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-webkit-slider-track {
          height: 8px;
          background: linear-gradient(to right, #e5e7eb 0%, #3b82f6 100%);
          border-radius: 4px;
        }

        .slider::-moz-range-track {
          height: 8px;
          background: linear-gradient(to right, #e5e7eb 0%, #3b82f6 100%);
          border-radius: 4px;
          border: none;
        }
      `}</style>
    </div>
  );
}
