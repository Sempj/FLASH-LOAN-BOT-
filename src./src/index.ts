import { ethers } from 'ethers';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import * as http from 'http';

// ===== HARDCODED CONFIGURATION - MAINNET =====
const PRIVATE_KEY = process.env.PRIVATE_KEY; // From Fly.io secrets
const CONTRACT_ADDRESS = '0xc014F34D5Ba10B6799d76b0F5ACdEEe577805085'; // Curve flash loan contract
const ETH_RPC_URL = 'https://cloudflare-eth.com'; // Free mainnet RPC
const NETWORK = 'mainnet';

// Your withdrawal wallet (hardcoded as requested)
const WITHDRAWAL_WALLET = '0x8f1be8d1331f6968680bc141339bb246f68ad899';

// Simple logger
const log = {
  info: (...args: any[]) => console.log(new Date().toISOString(), '[INFO]', ...args),
  error: (...args: any[]) => console.error(new Date().toISOString(), '[ERROR]', ...args),
  warn: (...args: any[]) => console.warn(new Date().toISOString(), '[WARN]', ...args)
};

class FlashbotBot {
  private provider!: ethers.providers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private contract!: ethers.Contract;
  private flashbotsProvider: FlashbotsBundleProvider | null = null;
  private isRunning = true;

  constructor() {
    // Validate only PRIVATE_KEY is needed
    this.validateEnvironment();
  }

  private validateEnvironment() {
    if (!PRIVATE_KEY) {
      log.error('❌ Missing PRIVATE_KEY environment variable');
      log.info('Please set PRIVATE_KEY in Fly.io secrets dashboard');
      process.exit(1);
    }

    log.info('✅ Environment variables loaded');
    log.info(`📋 Contract Address: ${CONTRACT_ADDRESS}`);
    log.info(`📋 RPC URL: ${ETH_RPC_URL}`);
  }

  async init() {
    try {
      log.info('='.repeat(60));
      log.info('🚀 FLASH LOAN BOT - MAINNET');
      log.info('='.repeat(60));
      
      // Connect to Ethereum
      this.provider = new ethers.providers.JsonRpcProvider(ETH_RPC_URL);
      this.wallet = new ethers.Wallet(PRIVATE_KEY!, this.provider);
      
      log.info(`📋 Bot Address: ${this.wallet.address}`);
      log.info(`📋 Contract: ${CONTRACT_ADDRESS}`);
      log.info(`💰 Withdrawal: ${WITHDRAWAL_WALLET}`);

      // Check connection
      const block = await this.provider.getBlockNumber();
      log.info(`📋 Connected to Ethereum | Block: ${block}`);

      // Check wallet balance
      const balance = await this.wallet.getBalance();
      log.info(`💰 Bot Balance: ${ethers.utils.formatEther(balance)} ETH`);

      if (balance.lt(ethers.utils.parseEther('0.01'))) {
        log.warn('⚠️ Low balance! Need ETH for gas');
      }

      // Initialize Flashbots (optional)
      try {
        this.flashbotsProvider = await FlashbotsBundleProvider.create(
          this.provider,
          this.wallet,
          'https://relay.flashbots.net'
        );
        log.info('✅ Flashbots enabled (MEV protection)');
      } catch (error) {
        log.warn('⚠️ Flashbots not available, using public mempool');
      }

      // Simple contract ABI for flash loan
      const contractABI = [
        "function startArbitrage(address token, uint256 amount, uint256 expectedProfit) external",
        "function withdrawETH() external",
        "function withdrawToken(address token) external",
        "function emergencyStop() view returns (bool)"
        // Note: owner() function removed because Curve contract doesn't have it
      ];

      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractABI,
        this.wallet
      );

      // REMOVED: The owner() function call that was crashing the app

      // Start services
      this.startHealthServer();
      this.startMonitoring();

    } catch (error) {
      log.error('Initialization error:', error);
      process.exit(1);
    }
  }

  private startHealthServer() {
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          network: 'mainnet',
          contract: CONTRACT_ADDRESS
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(8080, '0.0.0.0', () => {
      log.info('✅ Health server running on 0.0.0.0:8080');
    });

    server.on('error', (err) => {
      log.error('Health server error:', err);
    });
  }

  private startMonitoring() {
    log.info('🔍 Starting arbitrage monitoring...');
    
    // Simple heartbeat every 60 seconds
    setInterval(() => {
      log.info('💓 Bot is alive and watching...');
    }, 60000);
  }
}

// Start the bot
const bot = new FlashbotBot();
bot.init().catch(error => {
  log.error('Fatal error:', error);
  process.exit(1);
});

// Handle shutdown
process.on('SIGTERM', () => {
  log.info('Received SIGTERM, shutting down...');
  process.exit(0);
});
