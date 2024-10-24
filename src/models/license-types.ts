import { Schema, model, Document } from 'mongoose';
import { ILicenseType } from '../types';

export interface ILicenseTypeDocument
  extends Omit<ILicenseType, '_id'>,
    Document {}

export const LicenseTypeSchema = new Schema({
  name: String,
  rewardType: String,
  environmentType: String,
  topPerformingMinerRewardPerDollarMined: Number,
  remainingMinerRewardPerDollarMined: Number,
  concurrentDevices: Number,
  promoPointsPerDay: Number,
});

const LicenseTypeModel = model<ILicenseTypeDocument>(
  'license-type',
  LicenseTypeSchema,
);

export default LicenseTypeModel;

const LisenceTypeMappingsPipeline = [
  {
    $group: {
      _id: { licenseTypeId: '$licenseTypeId' },
      wordPressMemberships: {
        $addToSet: { id: '$wordPressMembershipId', created: '$created' },
      },
    },
  },
  {
    $match: {
      $expr: { $eq: [{ $toObjectId: '$_id.licenseTypeId' }, '$$id'] },
    },
  },
  {
    $project: {
      _id: 0,
    },
  },
];

const emptyStringArray: string[] = [];
export const LisenceTypeMappingsFullPipeline = [
  {
    $lookup: {
      from: 'license-type-mappings',
      let: { id: '$_id' },
      pipeline: LisenceTypeMappingsPipeline,
      as: 'licenseMapping',
    },
  },
  {
    $project: {
      _id: 0,
      licenseType: {
        _id: { $toString: '$_id' },
        name: '$name',
        rewardType: '$rewardType',
        environmentType: '$environmentType',
        topPerformingMinerRewardPerDollarMined:
          '$topPerformingMinerRewardPerDollarMined',
        remainingMinerRewardPerDollarMined:
          '$remainingMinerRewardPerDollarMined',
        concurrentDevices: '$concurrentDevices',
        promoPointsPerDay: '$promoPointsPerDay',
      },
      wordPressMemberships: {
        $ifNull: [
          { $arrayElemAt: ['$licenseMapping.wordPressMemberships', 0] },
          emptyStringArray,
        ],
      },
    },
  },
];
