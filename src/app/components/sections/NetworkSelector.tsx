'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { TransactionService } from '@/utils/transactionService';

interface NetworkSelectorProps {
  selectedNetwork: 'celo' | 'alfajores';
  onNetworkChange: (network: 'celo' | 'alfajores') => void;
}

export default function NetworkSelector({ 
  selectedNetwork, 
  onNetworkChange
}: NetworkSelectorProps) {
  const [walletStatus, setWalletStatus] = useState<{configured: boolean; address?: string}>({ configured: false });

  useEffect(() => {
    const checkWallet = async () => {
      const status = await TransactionService.getWalletStatus();
      setWalletStatus(status);
    };
    checkWallet();
  }, []);

  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars + 3) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 mb-8 sm:mb-12 shadow-sm mx-2 sm:mx-0">
      <div className="flex items-center mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-lg flex items-center justify-center mr-3 animate-bounce hover:animate-none">
          <span className="text-base sm:text-lg">🔗</span>
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-black">Setup & Connection</h2>
          <p className="text-gray-600 text-xs sm:text-sm">Server relayer for testnet, your wallet for mainnet</p>
        </div>
      </div>

      {/* Step 1: Server Wallet Status */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-black mb-3">Step 1: Server Wallet Status</h3>
        <div className={`rounded-lg p-4 border-2 ${
          walletStatus.configured 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                walletStatus.configured 
                  ? 'bg-green-500' 
                  : 'bg-red-500'
              }`}>
                <span className="text-white text-sm font-bold">
                  {walletStatus.configured ? '✓' : '⚠'}
                </span>
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${
                  walletStatus.configured ? 'text-green-800' : 'text-red-800'
                }`}>
                  {walletStatus.configured ? 'Server Wallet Connected' : 'Server Wallet Not Configured'}
                </h4>
                <p className={`text-xs sm:text-sm ${
                  walletStatus.configured ? 'text-green-700' : 'text-red-700'
                }`}>
                  {walletStatus.configured 
                    ? (walletStatus.address ? truncateAddress(walletStatus.address) : 'Connected')
                    : 'Configure PRIVATE_KEY environment variable'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Network Status */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-black mb-3">Step 2: Network Status</h3>
        <div className="p-3 sm:p-4 rounded-lg border-2 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-3 bg-green-500 animate-pulse"></div>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  {selectedNetwork === 'celo' ? 'Celo Mainnet' : 'Celo Testnet (Alfajores)'}
                </p>
                <p className="text-xs text-green-600">
                  ✓ Compatible with Self Protocol
                </p>
              </div>
            </div>
            <Image 
              src={selectedNetwork === 'celo' ? '/celo.webp' : '/celo_testnet.webp'} 
              alt="Network" 
              width={24} 
              height={24} 
              className="h-6 w-6 rounded-full" 
            />
          </div>
        </div>
      </div>

      {/* Switch Networks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-black">Switch Networks (Optional)</h3>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Ready to use</span>
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
            selectedNetwork === 'alfajores' 
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
                  {selectedNetwork === 'alfajores' && (
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
              {selectedNetwork === 'alfajores' ? (
                <div className="w-full flex items-center justify-center px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold">
                  ✓ Currently Active
                </div>
              ) : (
                <button
                  onClick={() => onNetworkChange('alfajores')}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-lg hover:shadow-lg transition-all font-semibold transform hover:scale-105 active:scale-95 hover:shadow-xl text-sm"
                >
                  🔄 Switch to Testnet
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
            selectedNetwork === 'celo' 
              ? 'border-black bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg' 
              : 'border-gray-200 bg-gray-50 hover:border-gray-400'
          }`}>
            <div className="flex items-center mb-3">
              <Image src="/celo.webp" alt="Celo" width={28} height={28} className="h-7 w-7 mr-3 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="text-base font-semibold text-black mr-2">Celo Mainnet</h3>
                  {selectedNetwork === 'celo' && (
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

            {selectedNetwork === 'celo' ? (
              <div className="w-full flex items-center justify-center px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold">
                ✓ Currently Active
              </div>
            ) : (
              <button
                onClick={() => onNetworkChange('celo')}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 text-sm"
              >
                🔄 Switch to Mainnet
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
    </div>
  );
} 