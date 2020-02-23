import { config } from '../common';
import { ServerToServerService } from './server-to-server';

class GameItemService extends ServerToServerService {
  baseUrl = config.gameItemServiceUrl;

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

    return data;
  };
}

export const gameItemService = new GameItemService();
