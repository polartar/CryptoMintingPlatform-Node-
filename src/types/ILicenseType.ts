export default interface ILicenseType {
  _id: string;
  name: string;
  rewardType: string;
  environmentType: string;
  topPerformingMinerRewardPerDollarMined: number;
  remainingMinerRewardPerDollarMined: number;
  concurrentDevices: number;
  promoPointsPerDay: number;
}
