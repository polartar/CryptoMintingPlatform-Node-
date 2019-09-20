export default function buildGetUserRewardsPipeline(
  userId: string,
  rewardName: string,
) {
  const pipeline = [
    {
      $match: {
        userId: userId,
        rewardName: rewardName,
      },
    },
    {
      $group: {
        _id: '$userId',
        balance: {
          $sum: '$amount',
        },
      },
    },
  ];
  return pipeline;
}
