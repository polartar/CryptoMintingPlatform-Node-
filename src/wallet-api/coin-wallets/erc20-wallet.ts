import EthWallet from './eth-wallet';
import config from '../../common/config';
import { ethers, utils } from 'ethers';
import { ITransaction, ICoinMetadata, IWeb3TransferEvent } from '../../types';
import { UserApi } from '../../data-sources';
import { ApolloError } from 'apollo-server-express';
const Web3 = require('web3');

class Erc20API extends EthWallet {
  contract: ethers.Contract;
  decimalPlaces: number;
  decimalFactor: ethers.utils.BigNumber;
  decimalFactorNegative: ethers.utils.BigNumber;
  provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl);
  abi: any;
  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';
  FALLBACK_GAS_VALUE = this.bigNumberify(36254);

  constructor(tokenMetadata: ICoinMetadata) {
    super(tokenMetadata);
    this.validateArguments(tokenMetadata);
    const { abi, contractAddress, decimalPlaces } = tokenMetadata;
    this.contract = new ethers.Contract(contractAddress, abi, this.provider);
    this.decimalPlaces = decimalPlaces;
    this.decimalFactor = this.bigNumberify(10).pow(decimalPlaces);
    this.decimalFactorNegative = this.bigNumberify(10).pow(
      this.bigNumberify(this.bigNumberify(0).sub(decimalPlaces)),
    );
  }

  private validateArguments({
    abi,
    decimalPlaces,
    contractAddress,
  }: ICoinMetadata) {
    if (!abi)
      throw new Error(
        'No abi provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!decimalPlaces || decimalPlaces < 0)
      throw new Error(
        'No decimalPlaces provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!contractAddress)
      throw new Error(
        'No contractAddress provided in token configuration for wallet interface. This parameter is required.',
      );
  }

  async estimateFee(userApi: UserApi) {
    const gasPrice = await this.provider.getGasPrice();
    try {
      const testValue = this.bigNumberify(10);
      const estimate = await this.contract.estimate.transfer(
        config.erc20FeeCalcAddress,
        testValue,
        { gasLimit: 750000 },
      );
      return this.toEther(estimate.mul(gasPrice));
    } catch (error) {
      return this.toEther(this.FALLBACK_GAS_VALUE.mul(gasPrice));
    }
  }

  private negate(numToNegate: utils.BigNumber) {
    return this.bigNumberify(0).sub(numToNegate);
  }

  private decimalize(numHexOrBn: string | number | utils.BigNumber): utils.BigNumber {
    return this.bigNumberify(numHexOrBn).div(this.decimalFactor);
  }

  private integerize(decimalizedString: string) {
    return this.bigNumberify(decimalizedString).mul(this.decimalFactor);
  }

  private async getBalanceFromContract(ethAddress: string) {
    const balance = await this.contract.balanceOf(ethAddress);
    return this.decimalize(balance);
  }

  async getWalletInfo(userApi: UserApi) {
    const { ethAddress, blockNumAtCreation } = await this.getEthAddress(userApi);
    return {
      receiveAddress: ethAddress,
      symbol: this.symbol,
      name: this.name,
      backgroundColor: this.backgroundColor,
      icon: this.icon,
      blockNumAtCreation
    };
  }

  private async transferEventsToTransactions(
    transferEvents: IWeb3TransferEvent[],
    currentBlockNumber: number,
    userAddress: string,
    web3: any,
  ): Promise<ITransaction[]> {
    return Promise.all(
      transferEvents
        .sort(
          (eventOne, eventTwo) => eventTwo.blockNumber - eventOne.blockNumber,
        )
        .map(async transferEvent => {
          const {
            transactionHash,
            blockNumber,
            blockHash,
            returnValues: { tokens, to, from },
          } = transferEvent;

          const amount = this.decimalize(tokens.toHexString());
          const block = await web3.eth.getBlock(blockNumber, false);
          const { timestamp } = block;
          const transaction = await web3.eth.getTransaction(transactionHash);
          const { gasPrice, gas } = transaction;
          const fee = this.bigNumberify(gas).mul(this.bigNumberify(gasPrice));
          const feeString = `${utils.formatEther(fee)} ETH`
          const isDeposit = to === userAddress;
          const formattedAmount = isDeposit
            ? amount.toString()
            : this.negate(amount).toString()
          const formattedTotal = `${formattedAmount} ${this.symbol}, -${feeString}`;
          return {
            id: transactionHash,
            status: blockHash ? 'Complete' : 'Pending',
            timestamp,
            confirmations: currentBlockNumber - blockNumber,
            fee: isDeposit ? '0' : feeString,
            link: `${config.ethTxLink}/${transactionHash}`,
            to,
            from,
            type: isDeposit ? 'Deposit' : 'Withdrawal',
            amount: formattedAmount,
            total: formattedTotal,
          };
        }),
    );
  }

  async getTransactions(address: string, blockNumAtCreation: number): Promise<ITransaction[]> {
    // Ethers isn't quite there with getting past events. The new v5 release looks like serious improvements are coming.
    const web3 = new Web3(config.ethNodeUrl);
    const contract = new web3.eth.Contract(this.abi, this.contractAddress);

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const sent = await contract.getPastEvents('Transfer', {
      fromBlock: blockNumAtCreation,
      filter: {
        from: address,
      },
    });
    const received = await contract.getPastEvents('Transfer', {
      fromBlock: blockNumAtCreation,
      filter: {
        to: address,
      },
    });

    const transactions = await this.transferEventsToTransactions(
      [...sent, ...received],
      currentBlockNumber,
      address,
      web3,
    );
    return transactions;
  }

  public async getBalance(address: string) {
    const balance = await this.getBalanceFromContract(address);
    return {
      confirmed: balance.toString(),
      unconfirmed: '0',
    };
  }

  private async requireEnoughBalanceToSendToken(
    address: string,
    amount: utils.BigNumber,
  ) {
    const { confirmed } = await this.getBalance(address);
    const hasEnough = this.integerize(confirmed).gte(amount);
    if (!hasEnough)
      throw new ApolloError(
        `Insufficient account balance. Amount: ${this.decimalize(
          amount.toHexString(),
        )}. Balance: ${this.decimalize(confirmed)}`,
      );
  }

  async send(userApi: UserApi, to: string, value: string) {
    try {
      const { nonce, ethAddress } = await this.getEthAddress(userApi);
      const privateKey = await this.getPrivateKey(userApi.userId);
      const amount = this.integerize(value);
      const wallet = new ethers.Wallet(privateKey, this.provider);
      await this.requireEnoughBalanceToSendToken(wallet.address, amount);
      const contract = new ethers.Contract(
        this.contractAddress,
        this.abi,
        wallet,
      );
      const transaction = await contract.transfer(to, amount, { nonce });
      await userApi.incrementTxCount();
      this.getEthAddressMatchesPkey(wallet, ethAddress, userApi)
      return {
        success: true,
        message: transaction.hash,
      };
    } catch (error) {
      return {
        success: false,
        message: error.stack,
      };
    }
  }
}

export default Erc20API;
