import { IUser, ItemTokenName, RewardActions } from '../../types';
import {
  BaseReward,
  Erc1155FungibleReward,
  Erc1155NFTReward,
} from './reward-handlers';
import { UserWithReferrer } from '../../utils';

const {
  ALFA_FOUNTAIN_OK,
  ALFA_FOUNTAIN_GOOD,
  ALFA_FOUNTAIN_GREAT,
  ALFA_FOUNTAIN_MAJESTIC,
  BETA_KEY,
  TRUCK_WITH_FLAMES,
} = ItemTokenName;

class RewardTrigger {
  actionRewards = new Map<RewardActions, BaseReward[]>([
    [
      RewardActions.WALLET_CREATED,
      [
        new Erc1155FungibleReward('GALA', {
          amountToUser: '100',
          amountToReferrer: '100',
        }),
        new Erc1155NFTReward(BETA_KEY, { amountToUser: '1' }),
        new Erc1155NFTReward(ALFA_FOUNTAIN_OK, { amountToReferrer: '1' }, 1),
        new Erc1155NFTReward(ALFA_FOUNTAIN_GOOD, { amountToReferrer: '1' }, 10),
        new Erc1155NFTReward(
          ALFA_FOUNTAIN_GREAT,
          { amountToReferrer: '1' },
          50,
        ),
        new Erc1155NFTReward(
          ALFA_FOUNTAIN_MAJESTIC,
          { amountToReferrer: '1' },
          100,
        ),
      ],
    ],
    [
      RewardActions.UPGRADED,
      [
        new Erc1155FungibleReward('GALA', {
          amountToUser: '100',
          amountToReferrer: '100',
        }),
        new Erc1155NFTReward(TRUCK_WITH_FLAMES, { amountToUser: '1' }),
      ],
    ],
  ]);

  triggerAction = (action: RewardActions, user: IUser, value?: number) => {
    const rewards = this.actionRewards.get(action);
    const userWithReferrer = new UserWithReferrer(user);
    return Promise.all(
      rewards.map(reward => reward.triggerReward(userWithReferrer, value)),
    );
  };
}
