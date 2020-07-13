import { subHours } from 'date-fns';
import { config } from '../common';

export const getPipeline = (userId: string, nudgeCode = config.nudgeCode) => [
  {
    $match: {
      id: userId,
    },
  },
  {
    $project: {
      _id: 0,
      affiliateId: 1,
    },
  },
  {
    $lookup: {
      from: 'users',
      let: {
        affiliateId: '$affiliateId',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$referredBy', '$$affiliateId'],
            },
          },
        },
        {
          $project: {
            _id: 0,
            id: { $toString: '$_id' },
            displayName: 1,
            profilePic: '$profilePhotoUrl',
          },
        },
      ],
      as: 'friends',
    },
  },
  {
    $unwind: {
      path: '$friends',
    },
  },
  {
    $replaceRoot: {
      newRoot: '$friends',
    },
  },
  {
    $lookup: {
      from: 'game-activities',
      localField: 'id',
      foreignField: 'userId',
      as: 'gameActivity',
    },
  },
  {
    $addFields: {
      active: {
        $gt: ['$gameActivity', [] as []],
      },
      gameActivity: '$$REMOVE',
    },
  },
  {
    $lookup: {
      from: 'friend-nudges',
      let: { userId: '$id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$friend', '$$userId'],
            },
            userId,
            code: nudgeCode,
            created: {
              $gte: subHours(new Date(), config.nudgeTimeoutHours),
            },
          },
        },
      ],
      as: 'nudges',
    },
  },
  {
    $addFields: {
      canNudge: {
        $eq: ['$nudges', [] as []],
      },
    },
  },
  {
    $project: {
      id: 1,
      displayName: 1,
      profilePic: 1,
      active: 1,
      canNudge: 1,
    },
  },
];
