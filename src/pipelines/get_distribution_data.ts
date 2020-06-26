export const getPipeline = (email: string, startDate: Date, endDate: Date) => [
  {
    $match: {
      email,
    },
  },
  {
    $project: {
      _id: 0,
      firstName: 1,
      lastName: 1,
      email: 1,
      id: 1,
    },
  },
  {
    $lookup: {
      from: 'promotional-rewards',
      let: {
        userId: '$id',
      },
      pipeline: [
        {
          $match: {
            created: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $group: {
            _id: '',
            points: {
              $push: '$$ROOT',
            },
          },
        },
        {
          $addFields: {
            _id: '$$REMOVE',
            totalPoolPoints: {
              $sum: '$points.amount',
            },
            userPoints: {
              $filter: {
                input: '$points',
                cond: {
                  $eq: ['$$this.userId', '$$userId'],
                },
              },
            },
          },
        },
        {
          $addFields: {
            points: '$$REMOVE',
          },
        },
        {
          $unwind: {
            path: '$userPoints',
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              totalPoolPoints: '$totalPoolPoints',
              pointType: '$userPoints.rewardType',
              amount: '$userPoints.amount',
            },
          },
        },
      ],
      as: 'points',
    },
  },
  {
    $addFields: {
      totalPoolPoints: {
        $arrayElemAt: ['$points.totalPoolPoints', 0],
      },
    },
  },
  {
    $unwind: {
      path: '$points',
    },
  },
  {
    $group: {
      _id: '$points.pointType',
      firstName: {
        $first: '$firstName',
      },
      lastName: {
        $first: '$lastName',
      },
      email: {
        $first: '$email',
      },
      userId: {
        $first: '$id',
      },
      totalPoolPoints: {
        $first: '$totalPoolPoints',
      },
      pointType: {
        $first: '$points.pointType',
      },
      amount: {
        $sum: '$points.amount',
      },
    },
  },
  {
    $group: {
      _id: '',
      firstName: {
        $first: '$firstName',
      },
      lastName: {
        $first: '$lastName',
      },
      email: {
        $first: '$email',
      },
      userId: {
        $first: '$userId',
      },
      totalPoolPoints: {
        $first: '$totalPoolPoints',
      },
      points: {
        $push: {
          pointType: '$pointType',
          amount: '$amount',
        },
      },
    },
  },
  {
    $addFields: {
      _id: '$$REMOVE',
    },
  },
  {
    $lookup: {
      from: 'wallet-transactions',
      let: {
        userId: '$userId',
      },
      pipeline: [
        {
          $match: {
            baseId: '0x0100000000000000000000000000000000',
            mintTransaction: true,
            $expr: {
              $and: [
                {
                  $gte: [
                    {
                      $toDate: {
                        $multiply: ['$timestamp', 1000],
                      },
                    },
                    startDate,
                  ],
                },
                {
                  $lt: [
                    {
                      $toDate: {
                        $multiply: ['$timestamp', 1000],
                      },
                    },
                    endDate,
                  ],
                },
                {
                  $eq: ['$toUser', '$$userId'],
                },
              ],
            },
          },
        },
        {
          $project: {
            amount: {
              $divide: [
                '$amount',
                {
                  $pow: [10, 8],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: '',
            amount: {
              $sum: '$amount',
            },
          },
        },
      ],
      as: 'distributionAmount',
    },
  },
  {
    $addFields: {
      distributionAmount: {
        $arrayElemAt: ['$distributionAmount.amount', 0],
      },
    },
  },
];
