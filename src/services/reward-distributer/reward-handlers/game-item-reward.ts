import { gameItemService } from '../../game-item';

class GameItemsReward {
  sendRandom = async (
    userId: string,
    userEthAddress: string,
    quantity: number,
  ) => {
    const result = await gameItemService.assignItemsToUser(
      userId,
      userEthAddress,
      quantity,
    );
    return result;
  };

  sendItemByTokenId = async (
    userId: string,
    userEthAddress: string,
    tokenId: string,
  ) => {
    const result = await gameItemService.assignItemToUserByTokenId(
      userId,
      userEthAddress,
      tokenId,
    );
    return result;
  };
}

export const gameItemsReward = new GameItemsReward();
