import axios from 'axios';
import {
  IPaywiserReferenceNumberResponse,
  IPaywiserReferenceNumberRequest,
  IUser,
} from '../types';
import { UserApi } from '../data-sources';
import { config, logger } from '../common';

class PaywiserService {
  public getReferenceNumber = async (
    user: UserApi,
  ): Promise<IPaywiserReferenceNumberResponse> => {
    try {
      let userId: string = 'aa335452';
      let userEmail: string = 'default@blockchainjedi.com';
      if (user) {
        const userDbObject = await user.findFromDb();
        userId = userDbObject.id;
        userEmail = userDbObject.email;
      }

      const url = `${config.paywiserHost}/Whitelabel/GetReferenceNumber`;
      const req: IPaywiserReferenceNumberRequest = {
        MobileNumber: '',
        Email: userEmail,
        AddressChanged: false,
        DocumentChanged: false,
        IbanTypeID: undefined,
        ReferenceID: userId,
      };

      const resp: { data: IPaywiserReferenceNumberResponse } = await axios.post(
        url,
        req,
        {
          auth: {
            username: config.paywiserUsername,
            password: config.paywiserPassword,
          },
        },
      );

      return resp.data;
    } catch (err) {
      logger.error(
        `services.paywiser.PaywiserService.getReferenceNumber: ${
          user.userId
        } : ${err.toString()}`,
      );
    }
    return undefined;
  };
}

export const paywiser = new PaywiserService();
