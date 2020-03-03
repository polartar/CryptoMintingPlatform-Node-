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

  getUserItems = async (userId: string) => {
    const result = await gameItemService.getUserItems(userId);

    return result;
  };

  getQuantityOwned = async (userId: string, tokenId: string) => {
    const itemsOwned = await this.getUserItems(userId);
    const item = itemsOwned.find(ownedItem => ownedItem.id === tokenId);
    if (!item) return 0;
    return item.items.length;
  };
}

export const gameItemsReward = new GameItemsReward();
