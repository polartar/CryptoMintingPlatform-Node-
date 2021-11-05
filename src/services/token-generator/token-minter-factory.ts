import { symbolToWalletConfig } from '../../common';
import TokenMinterErc20Green from './token-minter-erc20';
//import DryRunTokenMinter from './dry-run-token-minter';
import { ContractData } from '../../types/eth-contracts/contract';
//import { secretsFactory } from '../../common/secret-providers/secret-factory';

class TokenMinterFactory {
  public getTokenMinter = async (contractName: string, userId: string) => {
    // if (config.dryRun) {
    //   return new DryRunTokenMinter(contractData);
    // }

    switch (contractName.toLowerCase()) {
      case 'green':
        //Green's ERC-20 contract is different than standard ERC-20 because
        //Green uses 'distributeMinting' function instead of standard 'mint'
        const contract = await this.getGreenContractData();
        const tokenMint = new TokenMinterErc20Green(contract, userId);
        return tokenMint;
        break;
    }

    return undefined;
  };

  private getGreenContractData = async (
    secretKey = process.env.CONTRACT_OWNER_PRIVATE_KEY_SECRET_KEY,
  ): Promise<ContractData> => {
    // const secrets = secretsFactory.getSecretInstance();
    // const privateKey = await secrets.getSecretValue(secretKey);
    const walletConfig = symbolToWalletConfig.get('green');

    const results: ContractData = {
      //privateKey: privateKey,
      privateKey: process.env.GREEN_PKEY,
      address: process.env.GREEN_ADDRESS,
      decimalPlaces: walletConfig.decimalPlaces,
    };
    return results;
  };
}

export default new TokenMinterFactory();
