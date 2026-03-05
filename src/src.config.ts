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
    dex1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap
    dex2: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', // SushiSwap
    native: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  BSC: {
    name: 'BSC',
    chainId: 56,
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    scanUrl: 'https://bscscan.com',
    flashbots: false,
    dex1: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap
    dex2: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
    native: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
  },
  POLYGON: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    scanUrl: 'https://polygonscan.com',
    flashbots: false,
    dex1: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    dex2: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
    native: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  AVAX: {
    name: 'Avalanche',
    chainId: 43114,
    rpcUrl: process.env.AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    scanUrl: 'https://snowtrace.io',
    flashbots: false,
    dex1: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', // Trader Joe
    dex2: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
    native: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    usdc: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664'
  },
  ARBITRUM: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    scanUrl: 'https://arbiscan.io',
    flashbots: false,
    dex1: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
    dex2: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
    native: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    usdc: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
  }
};

// Select network from environment
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

export const DEX_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)"
];
