require('dotenv').config();
import connections from './connections';
import { walletConfigSchema, IWalletConfig } from '../models/wallet-config';

void (async () => {
  const arcade = {
    prod: {
      coupon: {
        photo: 'instant-credit-arcade-soft-node.jpg',
        softnodeType: 'Arcade',
      },
    },
    local: {
      coupon: {
        photo: 'instant-credit-arcade-soft-node.jpg',
        softnodeType: 'Arcade',
      },
    },
  };

  const green = {
    prod: {
      coupon: {
        photo: 'instant-credit-green-soft-node.jpg',
        softnodeType: 'Green',
      },
    },
    local: {
      coupon: {
        photo: 'instant-credit-green-soft-node.jpg',
        softnodeType: 'Green',
      },
    },
  };

  const codex = {
    prod: {
      coupon: {
        photo: 'instant-credit-codex-soft-node.jpg',
        softnodeType: 'Codex',
      },
    },
    local: {
      coupon: {
        photo: 'instant-credit-codex-soft-node.jpg',
        softnodeType: 'Codex',
      },
    },
  };

  const connect = {
    prod: {
      coupon: {
        photo: 'instant-credit-codex-soft-node.jpg',
        softnodeType: 'Codex',
      },
    },
    local: {
      coupon: {
        photo: 'instant-credit-codex-soft-node.jpg',
        softnodeType: 'Codex',
      },
    },
  };
  const brand = 'connect';

  const arcadeConfig = [arcade.prod, arcade.local];
  const greenConfig = [green.prod, green.local];
  const codexConfig = [codex.prod, codex.local];

  const connectOverrides = {
    brand: 'connect',
  };
  const connectConfig = [
    { ...connect.prod },
    { ...connect.local },
    { ...arcade.prod },
    { ...arcade.local },
    { ...green.prod },
    { ...green.local },
  ];

  const allConnections = await connections.allStage.connect();

  const [
    connectStageModel,
    // connectProdModel,
    greenStageModel,
    // greenProdModel,
    // arcadeStageModel,
    // arcadeProdModel,
    codexStageModel,
    // codexProdModel,
  ] = allConnections.map(connection => {
    return connection.model<IWalletConfig>('wallet-config', walletConfigSchema);
  });

  const connectResult = [
    connectStageModel,
    // connectProdModel
  ].map(async cnx => {
    try {
      await cnx
        .updateMany({ upgradeAccountName: 'Connect+' }, connect.prod)
        .exec();
      await cnx.updateMany({ upgradeAccountName: 'Codex+' }, codex.prod).exec();
      await cnx.updateMany({ upgradeAccountName: 'Green+' }, green.prod).exec();
      await cnx
        .updateMany({ upgradeAccountName: 'Arcade+' }, arcade.prod)
        .exec();
      console.log('Connect Done');
    } catch (err) {
      console.log(err);
    }
  });

  const greenResult = [
    greenStageModel,
    // greenProdModel
  ].map(async cnx => {
    await cnx.updateMany({}, green.prod).exec();
    console.log('Green Done');
  });

  const codexResult = [
    codexStageModel,
    // codexProdModel
  ].map(async cnx => {
    await cnx.updateMany({}, codex.prod).exec();

    console.log('Codex Done');
  });

  //   const arcadeResult = [arcadeStageModel, arcadeProdModel].map(async cnx => {
  //     await cnx.updateMany({}, arcade.prod);

  //     console.log('Arcade Done');
  //   });
})();
