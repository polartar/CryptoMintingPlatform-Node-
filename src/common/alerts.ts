import { config } from '../common';
import { ServerToServerService } from '../services/server-to-server';

export class AlertService extends ServerToServerService {
  roomName: string;
  constructor(roomName: string) {
    super();
    this.roomName = roomName;
  }

  public postMessage = async (message: string) => {
    const axios = this.getAxios({ role: 'system' });

    const result = await Promise.all(
      config.alertApiUrls.map(url =>
        axios.post<{ success: boolean }>(`${url}/alert`, {
          message,
          room: this.roomName,
        }),
      ),
    );

    return result.every(({ data: { success } }) => success);
  };
}
