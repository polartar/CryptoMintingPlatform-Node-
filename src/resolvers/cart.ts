import { Context, ITransaction } from '../types';
import ResolverBase from '../common/Resolver-Base';
import config from '../common/config';
import { User } from '../models';


class Resolvers extends ResolverBase {
  

  getCartAddress = async (
    parent: any,
    args: {
      coinSymbol: string;
      orderId: string;
    },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);
    const { orderId, coinSymbol = {} } = args;
    
    
    
    // const { wallet: userWallet } = await user.findFromDb();
    // const product = await this.getProduct(productId);
    // const isEnoughLeft = await this.verifyEnoughItemsLeft(
    //   quantity,
    //   product,
    //   user.userId,
    // );
    // if (!isEnoughLeft) {
    //   throw new Error('Product out of stock');
    // }
    // const ethAddress = userWallet?.ethAddress || '';
    // const galaWallet = wallet.coin('GALA');
    // const orderDetails = await this.getOrderDetails(
    //   product,
    //   quantity,
    //   user.userId,
    //   orderContext,
    // );
    // const outputs = [
    //   {
    //     to: config.companyFeeEthAddress,
    //     amount: orderDetails.totalGala.toFixed(8),
    //   },
    // ];
    // const { success, message, transaction } = await galaWallet.send(
    //   user,
    //   outputs,
    //   walletPassword,
    // );

    // if (!success) {
    //   throw new Error(message || 'Transaction failed');
    // }
    // orderDetails.txHash = transaction.id;
    // orderDetails.itemsReceived = await this.assignItems(
    //   user.userId,
    //   ethAddress,
    //   quantity,
    //   product.baseId,
    // );

    // GameOrder.create(orderDetails);
    // const items = await this.getOwnedItems(parent, args, ctx);
    let address = 'mj2CYWm7ZDJM7uwooiDKK4QraU99XTHyWV';
    const qr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAYAAABRRIOnAAAAAklEQVR4AewaftIAAAOMSURBVO3BQY7kRgADwWSh///l9B584EmAIPV41mBE/IOZfx1mymGmHGbKYaYcZsphphxmymGmHGbKYaYcZsphphxmymGmHGbKh4eS8JNUWhKayh1JaCotCU3ljiT8JJUnDjPlMFMOM+XDy1TelIQ7ktBUrqi0JNyRhKZyReVNSXjTYaYcZsphpnz4siTcofKbqHxTEu5Q+abDTDnMlMNM+fCXU2lJaEloKnckoak0lf+Tw0w5zJTDTPnwl0vCFZWWhKbyRBKayt/sMFMOM+UwUz58mco3qVxJQlP5TVR+k8NMOcyUw0z58LIk/KQkNJU7ktBUWhLelITf7DBTDjPlMFM+PKTyX1JpSWgqdyThTSp/k8NMOcyUw0z58FASmsqVJPykJDSVKyotCXckoalcSUJTaUm4Q+WJw0w5zJTDTIl/8EVJuKLSktBUnkhCU2lJeELljiS8SeVNh5lymCmHmRL/4Acl4YpKS0JTuSMJTeVKEppKS8ITKi0JV1SuJKGpPHGYKYeZcpgp8Q9elIQrKi0JV1RaEppKS0JT+aYkNJWWhCsqLQlPqDxxmCmHmXKYKR8eSkJTuUOlJaEl4Q6VloSm0pLQVK4k4ZtU7kjCmw4z5TBTDjMl/sEDSXhC5Y4kXFFpSWgqV5LwJpUrSWgqV5LQVN50mCmHmXKYKR++TOWOJHxTEu5QaUloKi0JLQlN5UoS7khCU3niMFMOM+UwUz68TKUloam0JDSVK0m4Q6Uloam8SeVKEppKS8IVlZaENx1mymGmHGZK/IMHktBUWhKuqFxJwhMqdyShqbQkfJNKS8IVlTcdZsphphxmyoeHVK6oPKFyJQlN5UoSvknljiT8JoeZcpgph5ny4aEk/CSVK0m4Q6Ul4YpKS8KVJDSVO1SuJKGpPHGYKYeZcpgpH16m8qYkvEmlJeGOJNyh8qYkNJU3HWbKYaYcZsqHL0vCHSpPqLQk3KHSknBHEn5SEprKE4eZcpgph5ny4X9O5YrKHSotCXeo/GaHmXKYKYeZ8uEvp9KS0FSuJKGpNJUrKi0JTeVKEn6Tw0w5zJTDTPnwZSr/pSQ0laZyJQlN5YkkXFFpSfhJh5lymCmHmfLhZUn4SUm4onIlCU8koam0JDSVK0loKleS8KbDTDnMlMNMiX8w86/DTDnMlMNMOcyUw0w5zJTDTDnMlMNMOcyUw0w5zJTDTDnMlMNM+Qeve5EOUrEhtwAAAABJRU5ErkJggg==';
    switch(coinSymbol){
      case 'BTC':
        address = 'mj2CYWm7ZDJM7uwooiDKK4QraU99XTHyWV';
        break;
      case 'ETH':
        address = '0xD7394c6fdA30BFbFf25D148E29F0951c4fcc0098';
        break;
      case 'GALA':
        address = '0xD7394c6fdA30BFbFf25D148E29F0951c4fcc0098';
        break;
    }
    const returnItem = [{coinSymbol, address, qrCode: qr }];
    return returnItem;
  };
  sendCartTransaction = async (
    parent: any,
    args: {
      coinSymbol: string;
      orderId: string;
      amount: string;
      walletPassword: string;
    },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);
    const { orderId, coinSymbol, amount, walletPassword = {} } = args;

    const trans: ITransaction = {
      id: 'asdf',
      status: 'Pending',
      amount,
      confirmations: 0,
      fee: '0',
      link: 'etherscan.io',
      from: '',
      to: [''],
      timestamp: Date.now(),
      total: amount,
      type: coinSymbol,
    };
    
    
    return {
      success: true,
      message: 'Success',
      transaction: trans
    };

  };

}

const resolvers = new Resolvers();

export default {
  Mutation: {
    getCartAddress: resolvers.getCartAddress,
    sendCartTransaction: resolvers.sendCartTransaction,
  },
};
