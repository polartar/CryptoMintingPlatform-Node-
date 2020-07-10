export const alfaFountainSharesPipeline = (userId: string) => [
  {
    $match: {
      'properties.tokenRun': 'alfa-fountain',
    },
  },
  {
    $lookup: {
      from: 'wallet-transactions',
      let: {
        baseId: '$baseId',
      },
      as: 'minted',
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {
                  $eq: ['$$baseId', '$baseId'],
                },
              ],
            },
          },
        },
        {
          $addFields: {
            userSubtotal: {
              $cond: [
                {
                  $eq: ['$toUser', userId],
                },
                1,
                {
                  $cond: [
                    {
                      $eq: ['$fromUser', userId],
                    },
                    -1,
                    0,
                  ],
                },
              ],
            },
            minted: {
              $cond: ['$mintTransaction', 1, 0],
            },
          },
        },
        {
          $group: {
            _id: 1,
            totalMinted: {
              $sum: '$minted',
            },
            userQuantity: {
              $sum: '$userSubtotal',
            },
          },
        },
      ],
    },
  },
  {
    $addFields: {
      totalMinted: {
        $ifNull: [
          {
            $arrayElemAt: ['$minted.totalMinted', 0],
          },
          0,
        ],
      },
      userQuantity: {
        $ifNull: [
          {
            $arrayElemAt: ['$minted.userQuantity', 0],
          },
          0,
        ],
      },
    },
  },
  {
    $project: {
      _id: 0,
      name: 1,
      image: 1,
      rarityIcon: '$properties.rarity.icon',
      description: 1,
      totalToBeMinted: '$properties.rarity.supplyLimit',
      totalRemaining: {
        $subtract: ['$properties.rarity.supplyLimit', '$totalMinted'],
      },
      totalReferralsNeeded: '$properties.shareRequirement',
      ownedByUser: {
        $gt: ['$userQuantity', 0],
      },
    },
  },
  {
    $sort: {
      totalToBeMinted: -1,
    },
  },
];
