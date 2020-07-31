import { config } from '../common';
import { ServerToServerService } from './server-to-server';

class GalaGamingApiService extends ServerToServerService {
  baseUrl = `${config.galaGamingApiUrl}/api`;

  public getGameJWT = (userId: string) => userId;

  // public getGameJWT = async (userId: string) => {
  // const jwtAxios = this.getAxios({ role: 'system' });

  // const { data } = await jwtAxios.get(`${this.baseUrl}/token/${userId}`);

  //   return data.token;
  // };
}

export default new GalaGamingApiService();
