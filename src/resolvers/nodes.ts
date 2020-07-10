import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { IOrderContext } from '../types';
import { logger } from '../common';
import { Product } from '../models';

class Resolvers extends ResolverBase {
  getProductById = async (parent: any, { id }: { id: string }) => {
    const product = await Product.findById(id).exec();
    return product;
  };

  buyNode = async (
    parent: any,
    {
      coinSymbol,
      productId,
      quantity,
      walletPassword,
      orderContext,
    }: {
      quantity: number;
      coinSymbol: string;
      productId: string;
      walletPassword: string;
      orderContext: IOrderContext;
    },
    { user, wallet, dataSources: { blockfunnels } }: Context,
  ) => {
    try {
      this.requireAuth(user);
      // Check wallet password and fail if incorrect
      await this.validateWalletPassword({
        password: walletPassword,
        symbol: coinSymbol,
        walletApi: wallet,
        user,
      });
      // Make call to Blockfunnels to create order and get invoiceAddress
      const order = await blockfunnels.orderProduct({
        productId,
        productAmount: quantity,
        context: orderContext,
        id: user.userId,
      });
      logger.debug(`resolvers.nodes.buyNode.order: ${order}`);
      // send BTC transaction to invoiceAddress
      const walletApi = wallet.coin(coinSymbol);
      const outputs = [{ to: order.invoiceAddress, amount: order.btcValue }];
      const result = await walletApi.send(user, outputs, walletPassword);
      return result;
    } catch (error) {
      logger.warn(`resolvers.nodes.buyNode.catch: ${error}`);
      return {
        success: false,
        message: error,
      };
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    productById: resolvers.getProductById,
  },
  Mutation: {
    buyNode: resolvers.buyNode,
  },
};
