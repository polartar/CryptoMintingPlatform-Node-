import { gameItemService } from '../../game-item';

class GameItemsReward {
  send = async (userId: string, userEthAddress: string, quantity: number) => {
    const result = await gameItemService.assignItemsToUser(
      userId,
      userEthAddress,
      quantity,
    );
    return result;
  };
}

export const gameItemsReward = new GameItemsReward();
