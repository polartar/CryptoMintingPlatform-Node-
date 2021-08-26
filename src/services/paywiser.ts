import axios from 'axios';
import {
  IPaywiserReferenceNumberResponse,
  IPaywiserReferenceNumberRequest,
  IUser,
} from '../types';
import {
  UserApi
} from '../data-sources';
import { config, logger } from '../common';

class PaywiserService {
  public getReferenceNumber = async (user: UserApi): Promise<IPaywiserReferenceNumberResponse> => {
    try {
      const userDbObject = await user.findFromDb();
      const url = `${config.paywiserHost}/Whitelabel/GetReferenceNumber`;
      const req: IPaywiserReferenceNumberRequest = {
        MobileNumber: "",
        Email: userDbObject.email,
        AddressChanged: false,
        DocumentChanged: false,
        IbanTypeID: undefined,
        ReferenceID: userDbObject.id
      }

      const resp: IPaywiserReferenceNumberResponse = await axios.post(
        url,
        req,
        {
          auth: {
            username: config.paywiserUsername,
            password: config.paywiserPassword,
          }
        });

      return resp;
    } catch (err) {
      logger.error(`services.paywiser.PaywiserService.getReferenceNumber: ${user.userId} : ${err.toString()}`,
      );
    }
    return undefined;
  };
}

export const paywiser = new PaywiserService();
