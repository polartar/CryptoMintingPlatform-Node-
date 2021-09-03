import { Types } from 'mongoose';

export default {
  _id: Types.ObjectId('61099d7b57c5bc14980867b3'),
  UserId: '60fd24fce7d789ae04cee939',
  DatePrepared: 1629137933511,
  TotalBlockbots: 3,
  Day: {
    _id: Types.ObjectId('61099d7b57c5bc14980867b4'),
    TotalBlockbotsNow: 3,
    TotalBlockbotsPrevious: 3,
    TotalRewardsCoin: 338,
    TotalRewardsUsd: 3.38,
    AverageUsdPerBlockbot: 0.01,
    AveragePercentDifference: 0.02,
    Memory: 'Day',
    FriendActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 0,
        ActivationsCount: 0,
        Rewards: 0,
        RewardsAllTime: 350,
      },
      {
        Name: 'Droid',
        ActiveCount: 2,
        ActivationsCount: 1,
        Rewards: 18,
        RewardsAllTime: 400,
      },
    ],
    BlockchainActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 0,
        ActivationsCount: 0,
        Rewards: 0,
        RewardsAllTime: 12,
      },
      {
        Name: 'Droid',
        ActiveCount: 2,
        ActivationsCount: 1,
        Rewards: 18,
        RewardsAllTime: 22,
      },
    ],
  },
  Week: {
    _id: Types.ObjectId('61099d7b57c5bc14980867b5'),
    TotalBlockbotsNow: 3,
    TotalBlockbotsPrevious: 2,
    TotalRewardsCoin: 1588,
    TotalRewardsUsd: 15.38,
    AverageUsdPerBlockbot: 0.01,
    AveragePercentDifference: 0.018,
    Memory: 'Week',
    FriendActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 1,
        ActivationsCount: 1,
        Rewards: 80,
        RewardsAllTime: 250,
      },
      {
        Name: 'Droid',
        ActiveCount: 2,
        ActivationsCount: 1,
        Rewards: 18,
        RewardsAllTime: 400,
      },
    ],
    BlockchainActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 0,
        ActivationsCount: 0,
        Rewards: 0,
        RewardsAllTime: 12,
      },
      {
        Name: 'Droid',
        ActiveCount: 2,
        ActivationsCount: 1,
        Rewards: 18,
        RewardsAllTime: 22,
      },
    ],
  },
  Month: {
    _id: Types.ObjectId('61099d7b57c5bc14980867b6'),
    TotalBlockbotsNow: 3,
    TotalBlockbotsPrevious: 3,
    TotalRewardsCoin: 338,
    TotalRewardsUsd: 3.38,
    AverageUsdPerBlockbot: 0.01,
    AveragePercentDifference: 0.02,
    Memory: 'Month',
    FriendActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 2,
        ActivationsCount: 10,
        Rewards: 120,
        RewardsAllTime: 350,
      },
      {
        Name: 'Droid',
        ActiveCount: 2,
        ActivationsCount: 10,
        Rewards: 350,
        RewardsAllTime: 400,
      },
    ],
    BlockchainActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 0,
        ActivationsCount: 0,
        Rewards: 0,
        RewardsAllTime: 12,
      },
      {
        Name: 'Droid',
        ActiveCount: 150,
        ActivationsCount: 120,
        Rewards: 18,
        RewardsAllTime: 22,
      },
    ],
  },
  Year: {
    _id: Types.ObjectId('61099d7b57c5bc14980867b7'),
    TotalBlockbotsNow: 3,
    TotalBlockbotsPrevious: 3,
    TotalRewardsCoin: 338,
    TotalRewardsUsd: 3.38,
    AverageUsdPerBlockbot: 0.01,
    AveragePercentDifference: 0.02,
    Memory: 'Year',
    FriendActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 3,
        ActivationsCount: 30,
        Rewards: 350,
        RewardsAllTime: 350,
      },
      {
        Name: 'Droid',
        ActiveCount: 5,
        ActivationsCount: 5,
        Rewards: 400,
        RewardsAllTime: 400,
      },
    ],
    BlockchainActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 50,
        ActivationsCount: 50,
        Rewards: 12,
        RewardsAllTime: 12,
      },
      {
        Name: 'Droid',
        ActiveCount: 250,
        ActivationsCount: 250,
        Rewards: 22,
        RewardsAllTime: 22,
      },
    ],
  },
  Quarter: {
    _id: Types.ObjectId('61099d7b57c5bc14980867b8'),
    TotalBlockbotsNow: 3,
    TotalBlockbotsPrevious: 3,
    TotalRewardsCoin: 338,
    TotalRewardsUsd: 3.38,
    AverageUsdPerBlockbot: 0.01,
    AveragePercentDifference: 0.02,
    Memory: 'Quarter',
    FriendActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 3,
        ActivationsCount: 30,
        Rewards: 350,
        RewardsAllTime: 350,
      },
      {
        Name: 'Droid',
        ActiveCount: 5,
        ActivationsCount: 5,
        Rewards: 400,
        RewardsAllTime: 400,
      },
    ],
    BlockchainActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 50,
        ActivationsCount: 50,
        Rewards: 12,
        RewardsAllTime: 12,
      },
      {
        Name: 'Droid',
        ActiveCount: 250,
        ActivationsCount: 250,
        Rewards: 22,
        RewardsAllTime: 22,
      },
    ],
  },
  All: {
    _id: Types.ObjectId('61099d7b57c5bc14980867b9'),
    TotalBlockbotsNow: 3,
    TotalBlockbotsPrevious: 3,
    TotalRewardsCoin: 338,
    TotalRewardsUsd: 3.38,
    AverageUsdPerBlockbot: 0.01,
    AveragePercentDifference: 0.02,
    Memory: 'All',
    FriendActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 3,
        ActivationsCount: 30,
        Rewards: 350,
        RewardsAllTime: 350,
      },
      {
        Name: 'Droid',
        ActiveCount: 5,
        ActivationsCount: 5,
        Rewards: 400,
        RewardsAllTime: 400,
      },
    ],
    BlockchainActivations: [
      {
        Name: 'Blockbot',
        ActiveCount: 50,
        ActivationsCount: 50,
        Rewards: 12,
        RewardsAllTime: 12,
      },
      {
        Name: 'Droid',
        ActiveCount: 250,
        ActivationsCount: 250,
        Rewards: 22,
        RewardsAllTime: 22,
      },
    ],
  },
};