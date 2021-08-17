import { ethers } from 'ethers';
import * as abi from '../../common/ABI/erc20-green.json';
import { config } from '../../common';
import { ContractData } from '../../types/eth-contracts/contract';

class TokenMinter {
  private provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl);

  private signer: ethers.Wallet;
  private contract: ethers.Contract;
  private decimalPlaces: number;

  constructor(contractData: ContractData) {
    this.signer = new ethers.Wallet(contractData.privateKey, this.provider);
    this.contract = new ethers.Contract(contractData.address, abi, this.signer);
    this.decimalPlaces = contractData.decimalPlaces;
  }

  public mintToGetFromVault = async (toMint: IMintDestination) => {
    const [nonce, gasPrice] = await Promise.all([
      this.signer.getTransactionCount(),
      this.provider.getGasPrice(),
    ]);

    const uint256Amt: number = Math.floor(+toMint.amountDecimal * Math.pow(10, this.decimalPlaces)); 
    
    const destinationAddresses: string[] = [toMint.destinationAddress];
    const destinationAmount: number[] = [uint256Amt];

    const contractMethod = this.contract.interface.encodeFunctionData(
      'distributeMinting',
      [destinationAddresses, destinationAmount],
    );

    const transaction = await this.signer.signTransaction({
      to: this.contract.address,
      data: contractMethod,
      gasLimit: 1000000,
      value: '0x0',
      nonce: nonce,
      gasPrice: Math.floor(gasPrice.toNumber() * 1.15),
    });

    //TODO : when we do nodeSelector for the mint, put it in here.
    //const parsedTransaction = utils.parseTransaction(transaction);
    //await nodeSelector.getNodeToMineTransaction(parsedTransaction.hash);

    this.provider.sendTransaction(transaction);

    const { hash } = ethers.utils.parseTransaction(transaction);
    return { hash, transaction };
  };
}
export interface IMintDestination {
  destinationAddress: string;
  amountDecimal: number;
}

export default TokenMinter;
