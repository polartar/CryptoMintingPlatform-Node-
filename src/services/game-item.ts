import { config } from '../common';
import { ServerToServerService } from './server-to-server';
import { IItem, IGameToken } from '../types';

class GameItemService extends ServerToServerService {
  baseUrl = `${config.gameItemServiceUrl}/items`;

  getUserItems = async (userId: string) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.get(`${this.baseUrl}/${userId}`);

    return data;
  };

  assignItemsToUser = async (
    userId: string,
    userEthAddress: string,
    quantity: number = 1,
  ) => {
    const jwtAxios = this.getAxios({ userId, userEthAddress });
    const { data } = await jwtAxios.post(this.baseUrl, {
      userId,
      userEthAddress,
      quantity,
    });

    return data.map((item: IItem) => item.nftBaseId);
  };

  getFarmBotRequiredItems = async (userId: string) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.get(`${this.baseUrl}/farmbot`);

    return data;
  };

  markLootBoxesOpened = async (userId: string, lootBoxIds: string[]) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.put(`${this.baseUrl}/lootbox`, {
      lootBoxIds,
    });

    return data;
  };

  assignItemToUserByTokenId = async (
    userId: string,
    userEthAddress: string,
    tokenId: string,
  ) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.post(`${this.baseUrl}/${tokenId}`, {
      userEthAddress,
      userId,
    });
    return data;
  };
}

export const gameItemService = new GameItemService();
