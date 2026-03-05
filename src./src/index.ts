import { ethers } from 'ethers';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import * as http from 'http';
import { 
  CURRENT_NETWORK, 
  WITHDRAWAL_WALLET, 
  FLASHBOT_ABI, 
  ERC20_ABI, 
  DEX_ABI 
} from './config';

// Logger
const log = {
  info: (...args: any[]) => console.log(new Date().toISOString(), '[INFO]', ...args),
  error: (...args: any[]) => console.error(new Date().toISOString(), '[ERROR]', ...args),
  warn: (...args: any[]) => console.warn(new Date().toISOString(), '[WARN]', ...args)
};

class FlashbotBot {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private flashbots: FlashbotsBundleProvider | null = null;
  private network = CURRENT_NETWORK;
  private isRunning = true;
  private withdrawing = false;

  constructor() {
    // Validate
    if (!process.env.PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY');
    if (!process.env.CONTRACT_ADDRESS) throw new Error('Missing CONTRACT_ADDRESS');
    if (!this.network.rpcUrl) throw new Error(`Missing RPC for ${this.network.name}`);

    this.provider = new ethers.providers.JsonRpcProvider(this.network.rpcUrl);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      FLASHBOT_ABI,
      this.wallet
    );
  }

  async init() {
    log.info('='.repeat(60));
    log.info(`🚀 FLASHBOT ARBITRAGE - ${this.network.name}`);
    log.info('='.repeat(60));
    log.info(`💰 Withdrawal Wallet: ${WITHDRAWAL_WALLET}`);
    log.info(`🤖 Bot Address: ${this.wallet.address}`);
    log.info(`📋 Contract: ${process.env.CONTRACT_ADDRESS}`);
    
    // Check connection
    const block = await this.provider.getBlockNumber();
    log.info(`📋 Block: ${block}`);

    // Check wallet balance
    const balance = await this.wallet.getBalance();
    log.info(`💰 Bot Balance: ${ethers.utils.formatEther(balance)} ${this.getSymbol()}`);

    // Check contract
    try {
      const owner = await this.contract.owner();
      log.info(`📋 Contract Owner: ${owner}`);
      if (owner.toLowerCase() !== WITHDRAWAL_WALLET.toLowerCase()) {
        log.warn('⚠️ Contract owner is not withdrawal wallet!');
      }
    } catch (error) {
      log.error('❌ Cannot connect to contract');
      process.exit(1);
    }

    // Setup Flashbots for Ethereum
    if (this.network.flashbots) {
      try {
        this.flashbots = await FlashbotsBundleProvider.create(
          this.provider,
          this.wallet,
          'https://relay.flashbots.net'
        );
        log.info('✅ Flashbots enabled');
      } catch {
        log.warn('⚠️ Flashbots failed, using public mempool');
      }
    }

    // Start services
    this.startScan();
    this.startAutoWithdraw();
    this.startHealthServer();
  }

  private getSymbol(): string {
    switch (this.network.chainId) {
      case 56: return 'BNB';
      case 137: return 'MATIC';
      case 43114: return 'AVAX';
      default: return 'ETH';
    }
  }

  private startScan() {
    const interval = parseInt(process.env.SCAN_INTERVAL_MS || '1000');
    log.info(`🔍 Scanning every ${interval}ms`);

    setInterval(async () => {
      if (!this.isRunning) return;
      await this.checkArbitrage();
    }, interval);
  }

  private async checkArbitrage() {
    try {
      const [price1, price2] = await Promise.all([
        this.getPrice(this.network.dex1),
        this.getPrice(this.network.dex2)
      ]);

      if (price1 === 0 || price2 === 0) return;

      const diff = Math.abs(price1 - price2);
      const avg = (price1 + price2) / 2;
      const percent = (diff / avg) * 100;

      // Different thresholds per network
      const threshold = this.network.chainId === 56 ? 0.3 : 0.2;

      if (percent > threshold) {
        log.info('🎯 Arbitrage found!', {
          diff: percent.toFixed(2) + '%',
          profit: '$' + (diff * 10).toFixed(2)
        });
        await this.executeArbitrage();
      }
    } catch (error) {
      // Silent fail
    }
  }

  private async getPrice(routerAddr: string): Promise<number> {
    try {
      const router = new ethers.Contract(routerAddr, DEX_ABI, this.provider);
      
      // Use appropriate amount per network
      let amount: ethers.BigNumber;
      if (this.network.chainId === 137) {
        amount = ethers.utils.parseUnits('100', 18); // 100 MATIC
      } else if (this.network.chainId === 43114) {
        amount = ethers.utils.parseUnits('10', 18); // 10 AVAX
      } else {
        amount = ethers.utils.parseEther('1'); // 1 ETH/BNB
      }

      const path = [this.network.native, this.network.usdc];
      const amounts = await router.getAmountsOut(amount, path);
      
      const decimals = this.network.chainId === 43114 ? 18 : 6;
      return parseFloat(ethers.utils.formatUnits(amounts[1], decimals));
    } catch {
      return 0;
    }
  }

  private async executeArbitrage() {
    try {
      if (await this.contract.emergencyStop()) return;

      // Set trade size per network
      let size: ethers.BigNumber;
      if (this.network.chainId === 56) {
        size = ethers.utils.parseUnits('5', 18); // 5 BNB
      } else if (this.network.chainId === 137) {
        size = ethers.utils.parseUnits('500', 18); // 500 MATIC
      } else if (this.network.chainId === 43114) {
        size = ethers.utils.parseUnits('50', 18); // 50 AVAX
      } else {
        size = ethers.utils.parseEther('2'); // 2 ETH
      }

      const tx = await this.contract.populateTransaction.startArbitrage(
        this.network.native,
        size,
        ethers.utils.parseEther('0.005')
      );

      const nonce = await this.wallet.getTransactionCount('pending');
      const gasPrice = ethers.utils.parseUnits(
        process.env.MAX_GAS_PRICE_GWEI || '50', 
        'gwei'
      );

      const signedTx = await this.wallet.signTransaction({
        ...tx,
        nonce,
        gasLimit: 500000,
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
        chainId: this.network.chainId,
        type: 2
      });

      // Send transaction
      const response = await this.provider.sendTransaction(signedTx);
      log.info(`📦 Tx: ${this.network.scanUrl}/tx/${response.hash}`);

    } catch (error) {
      log.debug('Execute error:', error);
    }
  }

  private startAutoWithdraw() {
    if (process.env.AUTO_WITHDRAW_ENABLED !== 'true') return;

    const hours = parseInt(process.env.WITHDRAW_INTERVAL_HOURS || '1');
    log.info(`💰 Auto-withdraw every ${hours}h to ${WITHDRAWAL_WALLET}`);

    setInterval(async () => {
      await this.checkWithdraw();
    }, hours * 60 * 60 * 1000);

    this.checkWithdraw(); // Check immediately
  }

  private async checkWithdraw() {
    if (this.withdrawing) return;
    this.withdrawing = true;

    try {
      // Check native balance
      const nativeBalance = await this.provider.getBalance(process.env.CONTRACT_ADDRESS!);
      const minNative = ethers.utils.parseEther(process.env.MIN_WITHDRAW_ETH || '0.05');

      if (nativeBalance.gt(minNative)) {
        log.info(`💰 Withdrawing ${ethers.utils.formatEther(nativeBalance)} ${this.getSymbol()}`);
        await this.withdrawNative();
      }

      // Check USDC
      await this.checkTokenWithdraw(this.network.usdc, 'USDC', 50);
      
    } catch (error) {
      log.error('Withdraw error:', error);
    } finally {
      this.withdrawing = false;
    }
  }

  private async checkTokenWithdraw(tokenAddr: string, symbol: string, minUSD: number) {
    try {
      const token = new ethers.Contract(tokenAddr, ERC20_ABI, this.provider);
      const balance = await token.balanceOf(process.env.CONTRACT_ADDRESS!);
      const decimals = await token.decimals();
      
      const minAmount = ethers.utils.parseUnits(minUSD.toString(), decimals);
      
      if (balance.gt(minAmount)) {
        log.info(`💰 Withdrawing ${symbol}: ${ethers.utils.formatUnits(balance, decimals)}`);
        await this.withdrawToken(tokenAddr);
      }
    } catch (error) {
      log.error(`${symbol} check error:`, error);
    }
  }

  private async withdrawNative() {
    try {
      const tx = await this.contract.populateTransaction.withdrawETH({
        gasLimit: 100000,
        maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
        type: 2
      });

      const nonce = await this.wallet.getTransactionCount('pending');
      const signedTx = await this.wallet.signTransaction({
        ...tx,
        nonce,
        chainId: this.network.chainId,
        type: 2
      });

      const response = await this.provider.sendTransaction(signedTx);
      const receipt = await response.wait();
      
      if (receipt.status === 1) {
        log.info(`✅ Sent to ${WITHDRAWAL_WALLET}: ${this.network.scanUrl}/tx/${receipt.transactionHash}`);
      }
    } catch (error) {
      log.error('Native withdraw error:', error);
    }
  }

  private async withdrawToken(tokenAddr: string) {
    try {
      const tx = await this.contract.populateTransaction.withdrawToken(tokenAddr, {
        gasLimit: 150000,
        maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
        type: 2
      });

      const nonce = await this.wallet.getTransactionCount('pending');
      const signedTx = await this.wallet.signTransaction({
        ...tx,
        nonce,
        chainId: this.network.chainId,
        type: 2
      });

      const response = await this.provider.sendTransaction(signedTx);
      const receipt = await response.wait();
      
      if (receipt.status === 1) {
        log.info(`✅ Token sent to ${WITHDRAWAL_WALLET}`);
      }
    } catch (error) {
      log.error('Token withdraw error:', error);
    }
  }

  private startHealthServer() {
    const server = http.createServer(async (req: any, res: any) => {
      if (req.url === '/health') {
        try {
          const balance = await this.provider.getBalance(process.env.CONTRACT_ADDRESS!);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'running',
            network: this.network.name,
            block: await this.provider.getBlockNumber(),
            contractBalance: ethers.utils.formatEther(balance),
            withdrawalWallet: WITHDRAWAL_WALLET,
            uptime: process.uptime()
          }));
        } catch {
          res.writeHead(500);
          res.end();
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(8080, () => {
      log.info('📊 Health server on port 8080');
    });
  }

  stop() {
    this.isRunning = false;
    log.info('🛑 Bot stopped');
  }
}

// Start
const bot = new FlashbotBot();
bot.init().catch(error => {
  log.error('Fatal:', error);
  process.exit(1);
});

// Shutdown
process.on('SIGINT', () => {
  bot.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  bot.stop();
  process.exit(0);
});
