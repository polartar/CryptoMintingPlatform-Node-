import {
  IUser,
  ItemTokenName,
  RewardActions,
  IRewardTriggerValues,
} from '../../types';
import {
  BaseReward,
  Erc1155FungibleReward,
  Erc1155NFTReward,
} from './reward-handlers';
import { UserHelper } from '../../utils';

const {
  ALFA_FOUNTAIN_OK,
  ALFA_FOUNTAIN_GOOD,
  ALFA_FOUNTAIN_GREAT,
  ALFA_FOUNTAIN_MAJESTIC,
  BETA_KEY,
  EXPRESS_DEPOT,
} = ItemTokenName;

class RewardTrigger {
  private actionRewards = new Map<RewardActions, BaseReward[]>([
    [
      RewardActions.WALLET_CREATED,
      [
        new Erc1155FungibleReward('GALA', {
          amount: { toReferrer: 100, toUser: 100 },
        }),
        new Erc1155NFTReward(BETA_KEY, {
          amount: { toUser: 1 },
        }),
        new Erc1155NFTReward(ALFA_FOUNTAIN_OK, {
          amount: { toReferrer: 1 },
          valuesRequired: { referrer: 1 },
        }),
        new Erc1155NFTReward(ALFA_FOUNTAIN_GOOD, {
          amount: { toReferrer: 1 },
          valuesRequired: { referrer: 10 },
        }),
        new Erc1155NFTReward(ALFA_FOUNTAIN_GREAT, {
          amount: { toReferrer: 1 },
          valuesRequired: { referrer: 50 },
        }),
        new Erc1155NFTReward(ALFA_FOUNTAIN_MAJESTIC, {
          amount: { toReferrer: 1 },
          valuesRequired: { referrer: 100 },
        }),
      ],
    ],
    [
      RewardActions.UPGRADED,
      [
        new Erc1155FungibleReward('GALA', {
          amount: { toUser: 100, toReferrer: 100 },
        }),
        new Erc1155NFTReward(EXPRESS_DEPOT, { amount: { toUser: 1 } }),
      ],
    ],
  ]);

  triggerAction = (
    action: RewardActions,
    user: IUser,
    triggerValues?: IRewardTriggerValues,
  ) => {
    const rewards = this.actionRewards.get(action);
    const userWithReferrer = new UserHelper(user);
    return Promise.all(
      rewards.map(reward =>
        reward.triggerReward(userWithReferrer, triggerValues),
      ),
    );
  };
}

export const rewardTrigger = new RewardTrigger();
