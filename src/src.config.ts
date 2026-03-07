import { ethers } from 'ethers';

// YOUR WITHDRAWAL WALLET - ALL PROFITS GO HERE
export const WITHDRAWAL_WALLET = '0x8f1be8d1331f6968680bc141339bb246f68ad899';

// SUPPORTED NETWORKS
export const NETWORKS = {
  ETH: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: process.env.ETH_RPC_URL || '',
    scanUrl: 'https://etherscan.io',
    flashbots: true,
    dex1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    dex2: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    native: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  BSC: {
    name: 'BSC',
    chainId: 56,
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    scanUrl: 'https://bscscan.com',
    flashbots: false,
    dex1: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    dex2: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    native: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
  }
};

export const CURRENT_NETWORK = NETWORKS[process.env.NETWORK as keyof typeof NETWORKS] || NETWORKS.ETH;

// Contract ABIs
export const FLASHBOT_ABI = [
  "function startArbitrage(address token, uint256 amount, uint256 expectedProfit) external",
  "function withdrawToken(address token) external",
  "function withdrawETH() external",
  "function emergencyStop() view returns (bool)",
  "function owner() view returns (address)"
];

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];
