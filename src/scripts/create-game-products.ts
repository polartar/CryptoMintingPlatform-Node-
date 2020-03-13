import { GameProduct } from '../models';
import { IGameProduct, gameProductCoins, gameOptions } from '../types';

void (async () => {
  await GameProduct.deleteMany({});

  const rarity = {
    legendary: {
      icon:
        'https://gala-tokens.s3.amazonaws.com/images/sandbox-games/town-star/rarity/legendary.png',
      label: 'Legendary',
    },
  };
  const newProducts: IGameProduct[] = [
    {
      name: 'Loot Box',
      description: 'Loot Box',
      game: gameOptions.townStar,
      image:
        'https://gala-tokens.s3-us-west-2.amazonaws.com/images/sandbox-games/town-star/products/loot-box.png',
      quantities: [1, 10, 25, 100],
      priceUsd: 10,
      basePriceUsd: 10,
      coin: gameProductCoins.BTC,
    },
    {
      name: 'FarmBot',
      description: 'FarmBot',
      game: gameOptions.townStar,
      image:
        'https://gala-tokens.s3-us-west-2.amazonaws.com/images/sandbox-games/town-star/products/farm-bot.png',
      quantities: [1],
      priceUsd: 100_000,
      basePriceUsd: 100_000,
      coin: gameProductCoins.BTC,
      nftBaseId:
        '0x8000000000000000000000000000000100000000000000000000000000000000',
      rarity: {
        ...rarity.legendary,
        supplyLimit: 1000,
      },
    },
  ];

  await GameProduct.insertMany(newProducts);
})();
