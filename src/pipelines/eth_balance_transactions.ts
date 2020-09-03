import { TransactionType } from '../types/IWalletTransaction';

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
        { to: ethAddress, type: TransactionType.Eth },
        { from: ethAddress, type: TransactionType.Eth },
        { operator: ethAddress, gasUsed: { $gt: 0 } },
      ],
    },
  },
  {
    $addFields: {
      isFromUser: {
        $eq: ['$operator', ethAddress],
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
      returnedEthDivisor: {
        $pow: [
          10,
          {
            $ifNull: ['$returnedEthDecimalsStored', 0],
          },
        ],
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
      amount: {
        $switch: {
          branches: [
            {
              case: {
                $eq: ['$type', 'ETH'],
              },
              then: {
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
            },
            {
              case: {
                $eq: ['$type', 'ExternalContract'],
              },
              then: {
                $add: [
                  {
                    $divide: [
                      {
                        $multiply: ['$amount', -1],
                      },
                      '$amountDivisor',
                    ],
                  },
                  {
                    $divide: [
                      {
                        $ifNull: ['$returnedEth', 0],
                      },
                      '$returnedEthDivisor',
                    ],
                  },
                ],
              },
            },
          ],
          default: 0,
        },
      },
    },
  },
  {
    $addFields: {
      amount: {
        $cond: [
          '$isFromUser',
          {
            $sum: ['$amount', '$fee'],
          },
          '$amount',
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
      status: {
        $first: '$status',
      },
    },
  },
  {
    $addFields: {
      amount: {
        $cond: [
          {
            $eq: ['$status', 'reverted'],
          },
          '$fee',
          '$amount',
        ],
      },
      status: {
        $cond: [
          {
            $eq: ['$status', 'reverted'],
          },
          'confirmed',
          '$status',
        ],
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
            $eq: ['$status', 'pending'],
          },
          'Pending',
          {
            $cond: [
              {
                $eq: ['$status', 'confirmed'],
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
      amount: 1,
      type: {
        $cond: ['$isFromUser', 'Withdrawal', 'Deposit'],
      },
    },
  },
  {
    $addFields: {
      pendingTotal: '$amount',
      confirmedTotal: {
        $cond: [
          {
            $eq: ['$status', 'Confirmed'],
          },
          '$amount',
          0,
        ],
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
    $sort: {
      timestamp: -1,
    },
  },
  {
    $group: {
      _id: '',
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
