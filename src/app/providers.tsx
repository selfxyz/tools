'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'Self Developer Tools',
  projectId: 'ef4b387f2479ce8cd6d5ff36518594c8',
  chains: [celo, celoAlfajores],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}