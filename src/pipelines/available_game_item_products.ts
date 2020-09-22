import { config } from '../common';

export const availableGameItemProductsPipeline = [
  {
    $match: {
      baseId: new RegExp('^0x', 'i'),
    },
  },
  {
    $sort: {
      baseId: 1,
    },
  },
  {
    $lookup: {
      from: 'erc1155-tokens',
      localField: 'baseId',
      foreignField: 'baseId',
      as: 'token',
    },
  },
  {
    $project: {
      _id: 0,
      invoiceAddress: 1,
      baseId: 1,
      price: 1,
      name: {
        $arrayElemAt: ['$token.name', 0],
      },
      description: {
        $arrayElemAt: ['$token.description', 0],
      },
      image: {
        $arrayElemAt: ['$token.image', 0],
      },
      game: {
        $arrayElemAt: ['$token.game', 0],
      },
      coin: 'GALA',
      rarity: {
        $arrayElemAt: ['$token.properties.rarity', 0],
      },
    },
  },
  {
    $lookup: {
      from: 'wallet-transactions',
      let: {
        baseId: '$baseId',
      },
      as: 'transactions',
      pipeline: [
        {
          $match: {
            $or: [
              {
                to: config.galaMasterNodeWalletAddress,
              },
              {
                from: config.galaMasterNodeWalletAddress,
              },
            ],
            $expr: {
              $eq: ['$$baseId', '$baseId'],
            },
          },
        },
        {
          $project: {
            qtySubTotal: {
              $cond: [
                {
                  $eq: ['$from', config.galaMasterNodeWalletAddress],
                },
                {
                  $multiply: ['$amount', -1],
                },
                '$amount',
              ],
            },
          },
        },
        {
          $group: {
            _id: '',
            qtyLeft: {
              $sum: '$qtySubTotal',
            },
          },
        },
      ],
    },
  },
  {
    $addFields: {
      qtyLeft: {
        $ifNull: [{ $arrayElemAt: ['$transactions.qtyLeft', 0] }, 0],
      },
      transactions: '$$REMOVE',
    },
  },
];
