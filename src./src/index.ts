import { ethers } from 'ethers';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import * as http from 'http';
import { CURRENT_NETWORK, WITHDRAWAL_WALLET, FLASHBOT_ABI, ERC20_ABI } from './config';

const log = {
  info: (...args: any[]) => console.log(new Date().toISOString(), '[INFO]', ...args),
  error: (...args: any[]) => console.error(new Date().toISOString(), '[ERROR]', ...args)
};

class FlashbotBot {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private network = CURRENT_NETWORK;
  private isRunning = true;

  constructor() {
    if (!process.env.PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY');
    if (!process.env.CONTRACT_ADDRESS) throw new Error('Missing CONTRACT_ADDRESS');
    
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
    log.info(`💰 Withdrawal: ${WITHDRAWAL_WALLET}`);
    
    const block = await this.provider.getBlockNumber();
    log.info(`📋 Block: ${block}`);

    this.startScan();
    this.startHealthServer();
  }

  private startScan() {
    const interval = parseInt(process.env.SCAN_INTERVAL_MS || '1000');
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

      if (percent > 0.2) {
        log.info('🎯 Arbitrage found!', { diff: percent.toFixed(2) + '%' });
        await this.executeArbitrage();
      }
    } catch (error) {}
  }

  private async getPrice(routerAddr: string): Promise<number> {
    try {
      const router = new ethers.Contract(
        routerAddr,
        ['function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)'],
        this.provider
      );

      const amount = ethers.utils.parseEther('1');
      const path = [this.network.native, this.network.usdc];
      const amounts = await router.getAmountsOut(amount, path);
      
      return parseFloat(ethers.utils.formatUnits(amounts[1], 6));
    } catch {
      return 0;
    }
  }

  private async executeArbitrage() {
    try {
      const tx = await this.contract.populateTransaction.startArbitrage(
        this.network.native,
        ethers.utils.parseEther('1'),
        ethers.utils.parseEther('0.001')
      );

      const nonce = await this.wallet.getTransactionCount('pending');
      const signedTx = await this.wallet.signTransaction({
        ...tx,
        nonce,
        gasLimit: 500000,
        maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
        chainId: this.network.chainId,
        type: 2
      });

      const response = await this.provider.sendTransaction(signedTx);
      log.info(`📦 Tx: ${this.network.scanUrl}/tx/${response.hash}`);
    } catch (error) {}
  }

  private startHealthServer() {
    const server = http.createServer(async (req: any, res: any) => {
      if (req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'running' }));
      }
    });
    server.listen(8080);
  }
}

const bot = new FlashbotBot();
bot.init().catch(console.error);
