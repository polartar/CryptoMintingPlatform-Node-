import * as mongoose from 'mongoose';

export interface IBlockbotActivation {
  Name: string;
  ActiveCount: number;
  ActivationsCount: number;
  Rewards: number;
  RewardsAllTime: number;
}

export interface IBlockbotMemory {
  TotalBlockbotsNow: number;
  TotalBlockbotsPrevious: number;
  TotalRewardsCoin: number;
  TotalRewardsUsd: number;
  AverageUsdPerBlockbot: number;
  AveragePercentDifference: number;
  Memory: string;
  FriendActivations: IBlockbotActivation[];
  BlockchainActivations: IBlockbotActivation[];
}

export interface IBlockbotReport {
  UserId: string;
  DatePrepared: number;
  TotalBlockbots: number;
  Day: IBlockbotMemory;
  Week: IBlockbotMemory;
  Month: IBlockbotMemory;
  Year: IBlockbotMemory;
  Quarter: IBlockbotMemory;
  All: IBlockbotMemory;
}

export interface IBlockbotReportDocument
  extends IBlockbotReport,
    mongoose.Document {}

export const activationSchema = new mongoose.Schema({
  Name: String,
  ActiveCount: Number,
  ActivationsCount: Number,
  Rewards: Number,
  RewardsAllTime: Number,
});

export const memorySchema = new mongoose.Schema({
  TotalBlockbotsNow: Number,
  TotalBlockbotsPrevious: Number,
  TotalRewardsCoin: Number,
  TotalRewardsUsd: Number,
  AverageUsdPerBlockbot: Number,
  AveragePercentDifference: Number,
  Memory: String,
  FriendActivations: [activationSchema],
  BlockchainActivations: [activationSchema],
});

export const winReportBlockbot = new mongoose.Schema({
  UserId: String,
  DatePrepared: Number,
  TotalBlockbots: Number,
  Day: memorySchema,
  Week: memorySchema,
  Month: memorySchema,
  Year: memorySchema,
  Quarter: memorySchema,
  All: memorySchema,
});

const BlockbotReportResult = mongoose.model<IBlockbotReportDocument>(
  'win-report-blockbot',
  winReportBlockbot,
);
export default BlockbotReportResult;
