import { subHours } from 'date-fns';
import { config } from '../common';

export const getPipeline = (
  userId: string,
  friend: string,
  nudgeCode: string,
) => [
  {
    $match: {
      id: userId,
    },
  },
  {
    $project: {
      _id: 0,
      id: 1,
      affiliateId: 1,
    },
  },
  {
    $lookup: {
      from: 'users',
      pipeline: [
        {
          $match: {
            id: friend,
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
            referredBy: 1,
            email: 1,
            firstName: 1,
          },
        },
      ],
      as: 'friend',
    },
  },
  {
    $addFields: {
      friend: {
        $arrayElemAt: ['$friend', 0],
      },
    },
  },
  {
    $addFields: {
      isFriend: {
        $eq: ['$affiliateId', '$friend.referredBy'],
      },
    },
  },
  {
    $lookup: {
      from: 'friend-nudges',
      pipeline: [
        {
          $match: {
            code: nudgeCode,
            userId,
            friend,
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
      allowedToNudge: {
        $eq: ['$nudges', [] as []],
      },
    },
  },
  {
    $project: {
      isFriend: 1,
      allowedToNudge: 1,
      email: '$friend.email',
      firstName: '$friend.firstName',
    },
  },
];
