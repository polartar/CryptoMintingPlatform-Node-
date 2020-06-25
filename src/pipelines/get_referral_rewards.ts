export const referralRewardsPipeline = (userId: string) => [
  {
    $match: {
      id: userId,
    },
  },
  {
    $lookup: {
      from: 'users',
      as: 'rewardsEarned',
      let: {
        affiliateId: '$affiliateId',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$$affiliateId', '$referredBy'],
            },
          },
        },
        {
          $addFields: {
            upgradeCount: {
              $cond: ['$wallet.activations.gala.activated', 1, 0],
            },
          },
        },
        {
          $lookup: {
            from: 'licenses',
            localField: 'id',
            foreignField: 'userId',
            as: 'licenses',
          },
        },
        {
          $group: {
            _id: 1,
            friendsJoined: {
              $sum: 1,
            },
            btcEarned: {
              $sum: '$wallet.activations.gala.btcToReferrer',
            },
            galaEarned: {
              $sum: '$wallet.activations.gala.referrerReward.gala.amount',
            },
            goldUpgrades: {
              $sum: '$upgradeCount',
            },
            nodesPurchased: {
              $sum: '$licenses.length',
            },
          },
        },
      ],
    },
  },
  {
    $project: {
      friendsJoined: {
        $ifNull: [
          {
            $arrayElemAt: ['$rewardsEarned.friendsJoined', 0],
          },
          0,
        ],
      },
      btcEarned: {
        $ifNull: [
          {
            $arrayElemAt: ['$rewardsEarned.btcEarned', 0],
          },
          0,
        ],
      },
      galaEarned: {
        $ifNull: [
          {
            $arrayElemAt: ['$rewardsEarned.galaEarned', 0],
          },
          0,
        ],
      },
      upgradedReferrals: {
        $ifNull: [
          {
            $arrayElemAt: ['$rewardsEarned.goldUpgrades', 0],
          },
          0,
        ],
      },
      nodesPurchased: {
        $ifNull: [
          {
            $arrayElemAt: ['$rewardsEarned.nodesPurchased', 0],
          },
          0,
        ],
      },
    },
  },
];
