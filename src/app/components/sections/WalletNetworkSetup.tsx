'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain } from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';

interface WalletNetworkSetupProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function WalletNetworkSetup({ showToast }: WalletNetworkSetupProps) {
  const { isConnected, chain: currentChain, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  // Get current network from wallet connection
  const getCurrentNetwork = () => {
    if (!currentChain) return null;
    
    if (currentChain.id === celo.id) {
      return {
        key: 'celo' as const,
        name: 'Celo Mainnet',
        chain: celo
      };
    } else if (currentChain.id === celoAlfajores.id) {
      return {
        key: 'alfajores' as const,
        name: 'Celo Testnet (Alfajores)',
        chain: celoAlfajores
      };
    }
    
    return null; // Unsupported network
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

  return (
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
        <div className={`rounded-lg p-4 border-2 ${
          isConnected 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-dashed border-gray-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                isConnected 
                  ? 'bg-green-500' 
                  : 'bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0]'
              }`}>
                <span className={`text-sm font-bold ${
                  isConnected ? 'text-white' : 'text-black'
                }`}>
                  {isConnected ? '✓' : '💼'}
                </span>
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${
                  isConnected ? 'text-green-800' : 'text-gray-700'
                }`}>
                  {isConnected ? 'Wallet Connected' : 'Connect Your Wallet'}
                </h4>
                <p className={`text-xs sm:text-sm ${
                  isConnected ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {isConnected 
                    ? (address ? truncateAddress(address) : 'Connected')
                    : 'Connect your wallet to interact with Self contracts'
                  }
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto sm:flex-shrink-0">
              <ConnectButton />
            </div>
          </div>
        </div>
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
  );
} 