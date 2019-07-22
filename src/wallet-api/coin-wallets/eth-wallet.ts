import { credentialService } from '../../services';
import CoinWalletBase from './coin-wallet-base';
import { ethers, providers, utils } from 'ethers';
import config from '../../common/config';
import { ITransaction, ICoinMetadata } from '../../types';
import { UserApi } from '../../data-sources';
import { ApolloError } from 'apollo-server-express';

const PRIVATEKEY = 'privatekey'

class EthWallet extends CoinWalletBase {
  provider = new providers.JsonRpcProvider(config.ethNodeUrl);
  etherscan = new providers.EtherscanProvider(
    config.etherscanNetwork,
    config.etherScanApiKey,
  );
  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';

  constructor({
    name,
    symbol,
    contractAddress,
    abi,
    backgroundColor,
    icon,
  }: ICoinMetadata) {
    super(name, symbol, contractAddress, abi, backgroundColor, icon);
  }

  public async checkIfWalletExists(userApi: UserApi) {
    try {
      const privateKey = await this.getPrivateKey(userApi.userId);
      return !!privateKey
    } catch (error) {
      return false;
    }
  }

  public async createWallet(userApi: UserApi, walletPassword: string, mnemonic: string) {
    try {
      const { privateKey, address } = ethers.Wallet.fromMnemonic(mnemonic)

      const encryptedPrivateKey = this.encrypt(privateKey, walletPassword)
      const privateKeyPromise = credentialService.create(
        userApi.userId,
        'ETH',
        PRIVATEKEY,
        encryptedPrivateKey,
      );

      const addressSavePromise = this.saveAddress(userApi, address);

      await Promise.all([privateKeyPromise, addressSavePromise]);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async saveAddress(userApi: UserApi, ethAddress: string) {
    const ethBlockNumAtCreation = await this.provider.getBlockNumber();
    const updateResult = await userApi.setWalletAccountToUser(
      ethAddress,
      ethBlockNumAtCreation,
    );
    return updateResult;
  }

  protected getPrivateKey(userId: string) {
    return credentialService.get(userId, 'ETH', PRIVATEKEY);
  }

  public async estimateFee(userApi: UserApi) {
    const gasPrice = await this.provider.getGasPrice();
    const feeEstimate = gasPrice.mul(21001);
    return this.toEther(feeEstimate);
  }

  public async getWalletInfo(userApi: UserApi) {
    const { ethAddress } = await this.getEthAddress(userApi);
    return {
      receiveAddress: ethAddress,
      symbol: this.symbol,
      name: this.name,
      backgroundColor: this.backgroundColor,
      icon: this.icon,
    };
  }

  async getBalance(address: string) {
    const balance = await this.provider.getBalance(address);
    return {
      unconfirmed: '0',
      confirmed: this.toEther(balance),
    };
  }

  private async requireEnoughBalanceToSendEther(
    address: string,
    amount: utils.BigNumber,
  ) {
    const { parseEther, formatEther } = utils;
    const { confirmed } = await this.getBalance(address);
    const weiConfirmed = parseEther(confirmed);

    const hasEnough = weiConfirmed.gte(amount);
    if (!hasEnough)
      throw new ApolloError(
        `Insufficient account balance. Amount: ${formatEther(amount).toString()}. Balance: ${confirmed}`,
      );
  }

  protected async getEthAddress(userApi: UserApi) {
    const {
      wallet = { ethAddress: '', ethNonce: 0, ethBlockNumAtCreation: 2426642 },
    } = await userApi.findFromDb();
    /* tslint:disable: prefer-const */
    let { ethAddress, ethNonce: nonce, ethBlockNumAtCreation: blockNumAtCreation } = wallet;
    /* tslint:enable:prefer-const */
    if (!ethAddress) {
      throw new Error('Wallet not found')
    }
    return { ethAddress, nonce, blockNumAtCreation };
  }

  async getTransactions(address: string, blockNumAtCreation: number): Promise<ITransaction[]> {
    const transactions = await this.etherscan.getHistory(address, blockNumAtCreation);
    const formattedTransactions = this.formatTransactions(
      transactions,
      address,
    );
    return formattedTransactions;
  }

  protected bigNumberify(anyValidValue: any) {
    return ethers.utils.bigNumberify(anyValidValue);
  }

  protected ensureEthAddressMatchesPkey(
    userWallet: ethers.Wallet,
    addressFromDb: string,
    userApi: UserApi,
  ) {
    return new Promise((resolve, reject) => {
      const { address } = userWallet;
      if (address.toLowerCase() === addressFromDb.toLowerCase()) resolve();
      else {
        userApi.Model.findByIdAndUpdate(
          userApi.userId,
          { $set: { 'wallet.ethAddress': address } },
          err => {
            if (err) reject(err);
            else {
              resolve();
            }
          },
        );
      }
    });
  }
  protected async requireValidAddress(maybeAddress: string) {
    const isAddress = !!(await this.provider.resolveName(maybeAddress));
    if (!isAddress) throw new Error(`Invalid address ${maybeAddress}`);
  }

  async send(userApi: UserApi, to: string, amount: string, walletPassword: string) {
    try {
      this.requireValidAddress(to);
      const value = utils.parseEther(amount);
      const { nonce, ethAddress } = await this.getEthAddress(userApi);
      await this.requireEnoughBalanceToSendEther(ethAddress, value);
      const encryptedPrivateKey = await this.getPrivateKey(userApi.userId);
      const privateKey = this.decrypt(encryptedPrivateKey, walletPassword)
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const { hash: txHash } = await wallet.sendTransaction({
        nonce,
        to,
        value,
        gasLimit: 21001,
      });
      await userApi.incrementTxCount();
      this.ensureEthAddressMatchesPkey(wallet, ethAddress, userApi);
      return {
        success: true,
        message: txHash,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  protected toEther(wei: utils.BigNumber, negate: boolean = false): string {
    return `${negate ? '-' : ''}${utils.formatEther(wei)}`;
  }

  protected toWei(ether: string): utils.BigNumber {
    try {
      const amount = utils.parseEther(ether);
      return amount;
    } catch ({ value }) {
      throw new Error(`Invalid amount: ${value}`);
    }
  }

  private formatTransactions(
    transactions: ethers.providers.TransactionResponse[],
    address: string,
  ): ITransaction[] {
    const gasUsed = this.bigNumberify(2100);
    return transactions.map(rawTx => {
      const {
        hash,
        blockNumber,
        confirmations,
        timestamp,
        to,
        from,
        value,
      } = rawTx;
      const gasPrice = this.bigNumberify(rawTx.gasPrice);
      const subTotal = this.bigNumberify(value);
      const fee = gasUsed.mul(gasPrice);
      const isDeposit = to === address.toLowerCase();
      const total = subTotal.add(isDeposit ? 0 : fee);
      return {
        id: hash,
        status: blockNumber !== null ? 'Complete' : 'Pending',
        confirmations: +confirmations,
        timestamp: +timestamp,
        fee: isDeposit ? '0' : this.toEther(fee, true),
        link: `${config.ethTxLink}/${hash}`,
        to: to,
        from: from,
        type: isDeposit ? 'Deposit' : 'Withdrawal',
        amount: isDeposit
          ? this.toEther(subTotal)
          : this.toEther(subTotal, true),
        total: isDeposit ? this.toEther(total) : this.toEther(total, true),
      };
    });
  }
}

export default EthWallet;
