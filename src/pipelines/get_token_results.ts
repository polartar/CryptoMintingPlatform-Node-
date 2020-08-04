export const getPipeline = (userId: string, startDate: Date, endDate: Date) => [
  {
    $match: {
      userId,
      created: {
        $gte: startDate,
        $lte: endDate,
      },
    },
  },
  {
    $group: {
      _id: '$baseId',
      baseId: {
        $first: '$baseId',
      },
      amount: {
        $sum: '$quantity',
      },
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
      amount: {
        $floor: '$amount',
      },
      name: {
        $arrayElemAt: ['$token.name', 0],
      },
      imageUrl: {
        $arrayElemAt: ['$token.image', 0],
      },
    },
  },
];
