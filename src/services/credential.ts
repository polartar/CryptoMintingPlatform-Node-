import { config, logger } from '../common';
import { AxiosError } from 'axios';
import { ServerToServerService } from './server-to-server';

class CredentialService extends ServerToServerService {
  private apiKeyUrl = `${config.apiKeyServiceUrl}/api/v1/api-keys`;
  private healthUrl = `${config.apiKeyServiceUrl}/health`;

  public create = async (
    userId: string,
    coin: string,
    resource: string,
    payload: string,
  ) => {
    try {
      const resourceKey = `${coin}-${resource}`;
      const apiKeyUrl = `${this.apiKeyUrl}/`;
      const jwtAxios = this.getAxios({
        userId,
        accountId: resourceKey,
      });

      const createResponse = await jwtAxios.post(apiKeyUrl, {
        userId: userId,
        accountId: resourceKey,
        apiKey: payload,
      });

      return createResponse;
    } catch (error) {
      logger.exceptionContext(error, 'services.credential.create.catch');
      throw error;
    }
  };

  public get = async (
    userId: string,
    coin: string,
    resource: string,
    supressErrorLog = false,
  ) => {
    try {
      const resourceKey = `${coin}-${resource}`;
      const apiKeyUrl = `${this.apiKeyUrl}/${userId}/${resourceKey}`;
      const jwtAxios = this.getAxios({
        userId,
        accountId: resourceKey,
      });
      const response = await jwtAxios.get(apiKeyUrl, {
        params: {
          userId: userId,
        },
      });
      return response.data;
    } catch (error) {
      if (!supressErrorLog) {
        logger.warn(`services.credential.get.catch: ${error}`);
      }
      throw error;
    }
  };

  public handleErrResponse = (error: AxiosError, messageIf404: string) => {
    logger.warn(`services.credential.handleErrorResponse:${error}`);
    if (error.response && error.response.status === 404) {
      throw new Error(messageIf404);
    }
    throw error;
  };

  public checkHealth = async (userId: string) => {
    try {
      const jwtAxios = this.getAxios({
        userId,
      });
      const { data } = await jwtAxios.get(`${this.healthUrl}/`);
      return data.redis.ok === true;
    } catch (error) {
      logger.warn(`services.credential.checkHealth.catch: ${error}`);
      return false;
    }
  };

  public checkHealthStatus = async (userId: string) => {
    try {
      const jwtAxios = this.getAxios({
        userId,
      });

      const { data } = await jwtAxios.get(`${this.healthUrl}/`);
      return data;
    } catch (error) {
      logger.warn(`services.credential.checkHealthStatus.catch: ${error}`);
    }
  };
}

export default new CredentialService();
