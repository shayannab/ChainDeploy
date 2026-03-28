import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

const qie = {
  id: 5656,
  name: 'QIE Blockchain',
  nativeCurrency: { name: 'QIE', symbol: 'QIE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-main1.qiblockchain.online'] },
  },
  blockExplorers: {
    default: { name: 'QIE Explorer', url: 'https://mainnet.qiblockchain.online' },
  },
};

const config = getDefaultConfig({
  appName: 'ChainDeploy',
  projectId: 'YOUR_PROJECT_ID', // In production, get one from cloud.walletconnect.com
  chains: [qie, mainnet, polygon, optimism, arbitrum, base],
  ssr: false, 
});

const queryClient = new QueryClient();

export default function Web3Provider({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#00f2ff',
          accentColorForeground: 'black',
          borderRadius: 'large',
        })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
