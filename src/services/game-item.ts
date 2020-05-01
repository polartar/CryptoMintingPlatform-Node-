import { config } from '../common';
import { ServerToServerService } from './server-to-server';
import { IItem, IGetUserItemResponse } from '../types';
import { AxiosResponse } from 'axios';

class GameItemService extends ServerToServerService {
  baseUrl = `${config.gameItemServiceUrl}/items`;

  getUserItems = async (userId: string) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.get<
      any,
      AxiosResponse<IGetUserItemResponse[]>
    >(`${this.baseUrl}/${userId}`);

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
    quantity: number,
  ) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.post<{ nftBaseId: string }[]>(
      `${this.baseUrl}/${tokenId}`,
      {
        userEthAddress,
        userId,
        quantity,
      },
    );
    return data.map(item => item.nftBaseId);
  };

  getRemaingSupplyForNftBaseId = async (userId: string, nftBaseId: string) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.get<{ count: number }>(
      `${this.baseUrl}/minted/remaining/${nftBaseId}`,
    );

    return data.count;
  };

  getRemainingSupplyForRandomItems = async (userId: string) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.get<{ remaining: number }>(
      `${this.baseUrl}/minted/remaining`,
    );

    return data.remaining;
  };
}

export const gameItemService = new GameItemService();
