'use client';

import { useAccount } from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';
import VerificationConfigManager from './VerificationConfigManager';
import ConfigReader from './ConfigReader';

interface HubContractOperationsProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  selectedCountries: string[];
  setSelectedCountries: (countries: string[]) => void;
  setShowCountryModal: (show: boolean) => void;
}

export default function HubContractOperations({
  showToast,
  selectedCountries,
  setSelectedCountries,
  setShowCountryModal
}: HubContractOperationsProps) {
  const { isConnected, chain: currentChain } = useAccount();

  // Default hub addresses
  const DEFAULT_HUB_ADDRESSES = {
    celo: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF',
    alfajores: '0x68c931C9a534D37aa78094877F46fE46a49F1A51'
  };

  // Get current network from wallet connection
  const getCurrentNetwork = () => {
    if (!currentChain) return null;
    
    if (currentChain.id === celo.id) {
      return {
        key: 'celo' as const,
        name: 'Celo Mainnet',
        hubAddress: DEFAULT_HUB_ADDRESSES.celo,
        chain: celo
      };
    } else if (currentChain.id === celoAlfajores.id) {
      return {
        key: 'alfajores' as const,
        name: 'Celo Testnet (Alfajores)',
        hubAddress: DEFAULT_HUB_ADDRESSES.alfajores,
        chain: celoAlfajores
      };
    }
    
    return null;
  };

  // Check if current wallet network is supported
  const isNetworkSupported = () => {
    return getCurrentNetwork() !== null;
  };

  // Truncate long strings for better mobile display
  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars + 3) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  return (
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
        <VerificationConfigManager 
          showToast={showToast}
          selectedCountries={selectedCountries}
          setSelectedCountries={setSelectedCountries}
          setShowCountryModal={setShowCountryModal}
        />

        {/* Divider */}
        <div className="border-t-2 border-gray-200 my-12 sm:my-16"></div>

        {/* Read Config Section */}
        <ConfigReader />
      </div>
    </div>
  );
} 