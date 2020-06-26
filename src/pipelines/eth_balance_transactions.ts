export interface IEthBalanceTransactions {
  pendingBalance: string;
  confirmedBalance: string;
  transactions: Array<{
    to: string;
    from: string;
    timestamp: number;
    blockNumber: number;
    fee: string;
    id: string;
    status: string;
    total: string;
    amount: string;
    type: string;
  }>;
}

export const ethBalanceTransactionsPipeline = (ethAddress: string) => [
  {
    $match: {
      $or: [
        {
          to: ethAddress,
        },
        {
          from: ethAddress,
        },
      ],
      gasUsed: {
        $gt: 0,
      },
    },
  },
  {
    $addFields: {
      isFromUser: {
        $eq: ['$from', ethAddress],
      },
      fee: {
        $multiply: ['$gasPrice', '$gasUsed'],
      },
      amountDivisor: {
        $pow: [10, '$decimalsStored'],
      },
      feeDivisor: {
        $pow: [10, '$gasPriceDecimals'],
      },
    },
  },
  {
    $project: {
      hash: 1,
      type: 1,
      status: 1,
      blockNumber: 1,
      timestamp: 1,
      isFromUser: 1,
      to: 1,
      from: 1,
      amount: {
        $cond: [
          {
            $ne: ['$type', 'ETH'],
          },
          0,
          {
            $cond: [
              '$isFromUser',
              {
                $divide: [
                  {
                    $subtract: [0, '$amount'],
                  },
                  '$amountDivisor',
                ],
              },
              {
                $divide: ['$amount', '$amountDivisor'],
              },
            ],
          },
        ],
      },
      fee: {
        $cond: [
          '$isFromUser',
          {
            $divide: [
              {
                $subtract: [0, '$fee'],
              },
              '$feeDivisor',
            ],
          },
          0,
        ],
      },
    },
  },
  {
    $group: {
      _id: '$hash',
      isFromUser: {
        $first: '$isFromUser',
      },
      to: {
        $first: '$to',
      },
      from: {
        $first: '$from',
      },
      timestamp: {
        $first: '$timestamp',
      },
      blockNumber: {
        $first: '$blockNumber',
      },
      amount: {
        $sum: '$amount',
      },
      fee: {
        $sum: '$fee',
      },
      hash: {
        $first: '$hash',
      },
      type: {
        $first: '$type',
      },
      status: {
        $first: '$status',
      },
    },
  },
  {
    $project: {
      _id: 0,
      id: '$hash',
      status: {
        $cond: [
          {
            $eq: ['pending', '$status'],
          },
          'Pending',
          {
            $cond: [
              {
                $eq: ['confirmed', '$status'],
              },
              'Confirmed',
              '$status',
            ],
          },
        ],
      },
      blockNumber: 1,
      timestamp: 1,
      fee: 1,
      to: 1,
      from: 1,
      pendingTotal: {
        $add: ['$fee', '$amount'],
      },
      confirmedTotal: {
        $cond: [
          {
            $eq: ['$status', 'confirmed'],
          },
          {
            $add: ['$fee', '$amount'],
          },
          0,
        ],
      },
      amount: {
        $cond: [
          {
            $eq: ['ETH', '$type'],
          },
          '$amount',
          0,
        ],
      },
      type: {
        $cond: ['$isFromUser', 'Withdrawal', 'Deposit'],
      },
    },
  },
  {
    $match: {
      pendingTotal: {
        $ne: 0,
      },
    },
  },
  {
    $group: {
      _id: 1,
      pendingBalance: {
        $sum: '$pendingTotal',
      },
      confirmedBalance: {
        $sum: '$confirmedTotal',
      },
      transactions: {
        $push: {
          to: '$to',
          from: '$from',
          timestamp: '$timestamp',
          blockNumber: '$blockNumber',
          fee: {
            $toString: '$fee',
          },
          id: '$id',
          status: '$status',
          total: {
            $toString: '$pendingTotal',
          },
          amount: {
            $toString: '$amount',
          },
          type: '$type',
        },
      },
    },
  },
  {
    $project: {
      _id: 0,
      pendingBalance: {
        $toString: {
          $trunc: ['$pendingBalance', 8],
        },
      },
      confirmedBalance: {
        $toString: {
          $trunc: ['$confirmedBalance', 8],
        },
      },
      transactions: 1,
    },
  },
];
