import connections from './connections';
import { walletConfigSchema, IWalletConfig } from '../models/wallet-config';

void (async () => {
  const arcade = {
    prod: {
      backgroundColor: '#B38DF7',
      icon: 'arcade-share.png',
      accentColor: '#e8d1ff',
      textColor: '#6600CC',
      brand: 'arcade',
      referrerReward: 5,
      companyFee: 5,
      rewardCurrency: 'ARCADE',
      rewardAmount: 100,
      userBalanceThreshold: 20,
      shareLimit: 5,
      shareLinkBase: 'N/A',
      upgradeAccountName: 'Arcade+',
      upgradeBenefits: [
        'Basic Wallet',
        'Limited virtual game item',
        '$100 credit toward Arcade Soft Node',
        'Advanced sharing tools',
        '5 early access beta wallets to share',
        'Digital rewards for wallet shares',
      ],
      basicWalletBenefits: [
        'Send and receive BTC',
        'Send and receive ETH',
        'Hold early access game items*',
        'Advanced play access to Arcade games (coming soon)',
      ],
    },
    local: {
      backgroundColor: '#B38DF7',
      icon: 'arcade-share.png',
      accentColor: '#e8d1ff',
      textColor: '#6600CC',
      brand: 'localhost',
      referrerReward: 5,
      companyFee: 5,
      rewardCurrency: 'ARCADE',
      rewardAmount: 100,
      userBalanceThreshold: 20,
      shareLimit: 5,
      shareLinkBase: 'N/A',
      upgradeAccountName: 'Arcade+',
      upgradeBenefits: [
        'Basic Wallet',
        'Limited virtual game item',
        '$100 credit toward Arcade Soft Node',
        'Advanced sharing tools',
        '5 early access beta wallets to share',
        'Digital rewards for wallet shares',
      ],
      basicWalletBenefits: [
        'Send and receive BTC',
        'Send and receive ETH',
        'Hold early access game items*',
        'Advanced play access to Arcade games (coming soon)',
      ],
    },
  };

  const green = {
    prod: {
      backgroundColor: '#92D36E',
      icon: 'green-share.png',
      accentColor: '#e0f7e0',
      textColor: '#33cc33',
      brand: 'green',
      referrerReward: 5,
      companyFee: 5,
      rewardCurrency: 'GREEN',
      rewardAmount: 100,
      userBalanceThreshold: 20,
      shareLimit: 5,
      shareLinkBase: 'N/A',
      upgradeAccountName: 'Green+',
      upgradeBenefits: [
        'Basic Wallet',
        '$100 credit toward Green Soft Node',
        'Advanced sharing tools',
        '5 early access beta wallets to share',
        'Digital rewards for wallet shares',
      ],
      basicWalletBenefits: [
        'Send and receive BTC',
        'Send and receive ETH',
        'Send and receive GREEN',
      ],
    },
    local: {
      backgroundColor: '#92D36E',
      icon: 'green-share.png',
      accentColor: '#e0f7e0',
      textColor: '#33cc33',
      brand: 'localhost',
      referrerReward: 5,
      companyFee: 5,
      rewardCurrency: 'GREEN',
      rewardAmount: 100,
      userBalanceThreshold: 20,
      shareLimit: 5,
      shareLinkBase: 'N/A',
      upgradeAccountName: 'Green+',
      upgradeBenefits: [
        'Basic Wallet',
        '$100 credit toward Green Soft Node',
        'Advanced sharing tools',
        '5 early access beta wallets to share',
        'Digital rewards for wallet shares',
      ],
      basicWalletBenefits: [
        'Send and receive BTC',
        'Send and receive ETH',
        'Send and receive GREEN',
      ],
    },
  };

  const codex = {
    prod: {
      backgroundColor: '#75A9F9',
      icon: 'winx-share.png',
      accentColor: '#d9e8ff',
      textColor: '#0099ff',
      brand: 'codex',
      referrerReward: 5,
      companyFee: 5,
      rewardCurrency: 'WinX',
      rewardAmount: 100,
      userBalanceThreshold: 20,
      shareLimit: 5,
      shareLinkBase: 'N/A',
      upgradeAccountName: 'Codex+',
      upgradeBenefits: [
        'Basic Wallet',
        '$100 credit toward Codex Soft Node',
        'Advanced sharing tools',
        '5 early access beta wallets to share',
        'Digital rewards for wallet shares',
      ],
      basicWalletBenefits: ['Send and receive BTC', 'Send and receive ETH'],
    },
    local: {
      backgroundColor: '#75A9F9',
      icon: 'winx-share.png',
      accentColor: '#d9e8ff',
      textColor: '#0099ff',
      brand: 'localhost',
      referrerReward: 5,
      companyFee: 5,
      rewardCurrency: 'WinX',
      rewardAmount: 100,
      userBalanceThreshold: 20,
      shareLimit: 5,
      shareLinkBase: 'N/A',
      upgradeAccountName: 'Codex+',
      upgradeBenefits: [
        'Basic Wallet',
        '$100 credit toward Codex Soft Node',
        'Advanced sharing tools',
        '5 early access beta wallets to share',
        'Digital rewards for wallet shares',
      ],
      basicWalletBenefits: ['Send and receive BTC', 'Send and receive ETH'],
    },
  };

  const connect = {
    prod: {
      backgroundColor: '#75A9F9',
      icon: 'winx-share.png',
      accentColor: '#d9e8ff',
      textColor: '#0099ff',
      brand: 'connect',
      referrerReward: 5,
      companyFee: 5,
      rewardCurrency: 'WinX',
      rewardAmount: 100,
      userBalanceThreshold: 20,
      shareLimit: 5,
      shareLinkBase: 'N/A',
      upgradeAccountName: 'Connect+',
      upgradeBenefits: [
        'Basic Wallet',
        'Advanced sharing tools',
        '5 early access beta wallets to share',
        'Digital rewards for wallet shares',
      ],
      basicWalletBenefits: [
        'Send and receive BTC',
        'Send and receive ETH',
        'Send and receive GREEN',
      ],
    },
    local: {
      backgroundColor: '#75A9F9',
      icon: 'winx-share.png',
      accentColor: '#d9e8ff',
      textColor: '#0099ff',
      brand: 'localhost',
      referrerReward: 5,
      companyFee: 5,
      rewardCurrency: 'WinX',
      rewardAmount: 100,
      userBalanceThreshold: 20,
      shareLimit: 5,
      shareLinkBase: 'N/A',
      upgradeAccountName: 'Connect+',
      upgradeBenefits: [
        'Basic Wallet',
        'Advanced sharing tools',
        '5 early access beta wallets to share',
        'Digital rewards for wallet shares',
      ],
      basicWalletBenefits: [
        'Send and receive BTC',
        'Send and receive ETH',
        'Send and receive GREEN',
      ],
    },
  };
  const brand = 'connect';
  const basicWalletBenefits = [
    'Send and receive BTC',
    'Send and receive ETH',
    'Send and receive GREEN',
    'Hold early access game items*',
    'Advanced play access to Arcade games (coming soon)',
  ];
  const arcadeConfig = [arcade.prod, arcade.local];
  const greenConfig = [green.prod, green.local];
  const codexConfig = [codex.prod, codex.local];

  const connectOverrides = {
    brand: 'connect',
  };
  const connectConfig = [
    { ...connect.prod, basicWalletBenefits },
    { ...connect.local, basicWalletBenefits },
    { ...arcade.prod, brand, basicWalletBenefits },
    { ...arcade.local, basicWalletBenefits },
    { ...green.prod, brand, basicWalletBenefits },
    { ...green.local, basicWalletBenefits },
  ];

  const allConnections = await connections.allConnections.connect();

  const [
    connectStageModel,
    connectProdModel,
    greenStageModel,
    greenProdModel,
    arcadeStageModel,
    arcadeProdModel,
    codexStageModel,
    codexProdModel,
  ] = allConnections.map(connection => {
    return connection.model<IWalletConfig>('wallet-config', walletConfigSchema);
  });

  const connectResult = [connectStageModel, connectProdModel].map(async cnx => {
    await cnx.deleteMany({});
    await cnx.insertMany(connectConfig);
    console.log('Connect Done');
  });

  const greenResult = [greenStageModel, greenProdModel].map(async cnx => {
    await cnx.deleteMany({});
    await cnx.insertMany(greenConfig);
    console.log('Green Done');
  });

  const codexResult = [codexStageModel, codexProdModel].map(async cnx => {
    await cnx.deleteMany({});
    await cnx.insertMany(codexConfig);
    console.log('Codex Done');
  });

  const arcadeResult = [arcadeStageModel, arcadeProdModel].map(async cnx => {
    await cnx.deleteMany({});
    await cnx.insertMany(arcadeConfig);
    console.log('Arcade Done');
  });
})();
