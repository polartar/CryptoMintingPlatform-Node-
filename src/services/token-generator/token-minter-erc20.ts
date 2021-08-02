import { ethers } from 'ethers';
import { chunk, round } from 'lodash';
import * as abi from '../../common/ABI/erc20-green.json';
import { config } from '../../common';
//import { UserWithTokenAmount } from '../types/user';
import { ContractData } from '../../types/eth-contracts/contract';
import BigNumber from 'bignumber.js';
//import { Erc20 as Erc20Contract } from '../../types/eth-contracts/erc20-green';
//import nodeSelector from './node-selector';

class TokenMinter {
    private provider = new ethers.providers.JsonRpcProvider(
        config.ethNodeUrl,
    );

    private signer: ethers.Wallet;
    private contract: ethers.Contract;
    private decimalPlaces: number;

    constructor(contractData: ContractData) {
        this.signer = new ethers.Wallet(contractData.privateKey, this.provider);
        this.contract = new ethers.Contract(
            contractData.address,
            abi,
            this.signer,
        );
    }

    public mintToGetFromVault = async (toMint: IMintDestination) => {
        const [nonce, gasPrice] = await Promise.all([
            this.signer.getTransactionCount(),
            this.provider.getGasPrice(),
        ]);

        const amountConverted:BigNumber = new BigNumber(+toMint.amountDecimal * +Math.pow(10, this.decimalPlaces));

        const destinationAddresses: string[] = [toMint.destinationAddress];
        const destinationAmount: BigNumber[] = [amountConverted];

        //let tx = await this.contract.distributeMinting(destinationAddresses, destinationAmount);
        // const parameterToDistribute = {
        //     distAddresses: destinationAddresses,
        //     distValues: destinationAmount
        // };

        const contractMethod = this.contract.interface.encodeFunctionData("distributeMinting", [destinationAddresses, destinationAmount]);

        const transaction = await this.signer.signTransaction({
            to: this.contract.address,
            data: contractMethod,
            gasLimit: 1000000,
            value: '0x0',
            nonce: nonce,
            gasPrice: Math.floor(gasPrice.toNumber() * 1.1),
            
        });

        //TODO : when we do nodeSelector for the mint, put it in here.
        //const parsedTransaction = utils.parseTransaction(transaction);
        //await nodeSelector.getNodeToMineTransaction(parsedTransaction.hash);

        return this.provider.sendTransaction(transaction);
    };
}
export interface IMintDestination{
    destinationAddress: string;
    amountDecimal: number;
}

export default TokenMinter;
