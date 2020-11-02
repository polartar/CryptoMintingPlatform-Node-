import { config } from '../common';
import { ServerToServerService } from './server-to-server';
import {
  ITokenClaim,
  IUnclaimedToken,
  IClaimQuote,
} from '../types/token-claim';

class TokenClaim extends ServerToServerService {
  baseUrl = `${config.tokenClaimsApiUrl}`;

  public getClaimableTokens = async (userId: string) => {
    const axios = this.getAxios({ userId });

    const { data } = await axios.get<IUnclaimedToken[]>(
      `${this.baseUrl}/token/claimable/${userId}`,
    );

    return data;
  };

  public getClaimQuote = async (userId: string) => {
    const axios = this.getAxios({ userId });

    const { data } = await axios.post<IClaimQuote>(
      `${this.baseUrl}/claim-fee`,
      { userId },
    );

    return data;
  };

  public getUnseenFulfilledClaims = async (userId: string) => {
    const axios = this.getAxios({ userId });

    const { data } = await axios.get<ITokenClaim[]>(
      `${this.baseUrl}/claim/unseen/${userId}`,
    );

    return data;
  };

  public markClaimsAsSeen = async (userId: string) => {
    const axios = this.getAxios({ userId });

    const { data } = await axios.put<{ success: boolean }>(
      `${this.baseUrl}/claim/seen/${userId}`,
    );

    return data;
  };

  public claimTokens = async ({ userId, ...rest }: ITokenClaim) => {
    const axios = this.getAxios({ userId });

    const { data } = await axios.post<ITokenClaim>(`${this.baseUrl}/claim`, {
      userId,
      ...rest,
    });

    return data;
  };
}

export const tokenClaimService = new TokenClaim();
