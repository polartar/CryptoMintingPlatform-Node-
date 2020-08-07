export const getPipeline = (startDate: Date, endDate: Date) => [
  {
    $match: {
      userId: { $nin: ['company', 'master-node'] },
      created: {
        $gte: startDate,
        $lte: endDate,
      },
    },
  },
  {
    $group: {
      _id: '$address',
      address: {
        $first: '$address',
      },
      userId: {
        $first: '$userId',
      },
      gala: {
        $sum: {
          $cond: [
            {
              $eq: ['$baseId', '0x0100000000000000000000000000000000'],
            },
            '$quantity',
            0,
          ],
        },
      },
      items: {
        $sum: {
          $cond: [
            {
              $ne: ['$baseId', '0x0100000000000000000000000000000000'],
            },
            '$quantity',
            0,
          ],
        },
      },
    },
  },
  {
    $addFields: {
      _id: '$$REMOVE',
      gala: {
        $floor: '$gala',
      },
    },
  },
  {
    $lookup: {
      from: 'promotional-rewards',
      let: {
        userId: '$userId',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$userId', '$$userId'],
            },
            created: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: '',
            total: {
              $sum: '$amount',
            },
          },
        },
      ],
      as: 'points',
    },
  },
  {
    $addFields: {
      points: {
        $ifNull: [
          {
            $arrayElemAt: ['$points.total', 0],
          },
          0,
        ],
      },
      userId: '$$REMOVE',
    },
  },
  {
    $sort: {
      points: -1,
    },
  },
];
