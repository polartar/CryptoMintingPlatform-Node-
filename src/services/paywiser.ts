import axios from 'axios';
import {
  IPaywiserReferenceNumberResponse,
  IPaywiserReferenceNumberRequest,
  IPaywiserCheckReferenceNumberRequest,
  IPaywiserCheckReferenceNumberResponse,
  IPaywiserGetPersonAddressRequest,
  IPaywiserGetPersonAddressResponse,
} from '../types';
import { UserApi } from '../data-sources';
import { config, logger } from '../common';
import { countryPhoneCodes } from '../utils';

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

      user.update({ $set: { kyc: { ...resp.data } } });

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

  public checkReferenceNumber = async (
    user: UserApi,
  ): Promise<IPaywiserCheckReferenceNumberResponse> => {
    try {
      let referenceNumber: string = '';
      let referenceId: string = '';
      if (user) {
        const userDbObject = await user.findFromDb();
        referenceNumber = userDbObject.kyc?.ReferenceNumber;
        referenceId = userDbObject.kyc?.ReferenceID;
      }

      const url = `${config.paywiserHost}/Whitelabel/CheckReferenceNumber`;
      const req: IPaywiserCheckReferenceNumberRequest = {
        ReferenceNumber: referenceNumber,
        ReferenceID: referenceId,
      };

      const resp: {
        data: IPaywiserCheckReferenceNumberResponse;
      } = await axios.post(url, req, {
        auth: {
          username: config.paywiserUsername,
          password: config.paywiserPassword,
        },
      });

      user.update({
        $set: {
          'kyc.StatusCode': resp.data.StatusCode,
          'kyc.StatusDescription': resp.data.StatusDescription,
          'kyc.AssignedDateTime': resp.data.AssignedDateTime,
          'kyc.ReferenceNumberStatus': resp.data.ReferenceNumberStatus,
          'kyc.PersonID': resp.data.PersonID,
          'kyc.KycID': resp.data.KycID,
          'kyc.KycStart': resp.data.KycStart,
          'kyc.KycEnd': resp.data.KycEnd,
          'kyc.KycStatus': resp.data.KycStatus,
          'kyc.VerificationEnd': resp.data.VerificationEnd,
          'kyc.VerificationStatus': resp.data.VerificationStatus,
          'kyc.AdditionalData': resp.data.AdditionalData,
          'kyc.ReferenceID': resp.data.ReferenceID,
          'kyc.CallerReferenceID': resp.data.CallerReferenceID,
        },
      });

      return resp.data;
    } catch (err) {
      logger.error(
        `services.paywiser.PaywiserService.checkReferenceNumber: ${
          user.userId
        } : ${err.toString()}`,
      );
    }
    return undefined;
  };

  public getPersonAddress = async (
    user: UserApi,
  ): Promise<IPaywiserGetPersonAddressResponse> => {
    try {
      let personId: string = '';
      let kycId: string = '';
      let referenceId: string = '';

      if (user) {
        const userDbObject = await user.findFromDb();
        console.log({ userDbObject });
        personId = userDbObject.kyc.PersonID;
        kycId = userDbObject.kyc.KycID;
        referenceId = userDbObject.kyc.ReferenceID;
      }
      const url = `${config.paywiserHost}/Whitelabel/GetPersonAddress`;
      const req: IPaywiserGetPersonAddressRequest = {
        PersonID: personId,
        KycID: kycId,
        ReferenceID: referenceId,
      };

      const resp: {
        data: IPaywiserGetPersonAddressResponse;
      } = await axios.post(url, req, {
        auth: {
          username: config.paywiserUsername,
          password: config.paywiserPassword,
        },
      });
      console.log('Update user:', resp.data);

      console.log(
        resp.data.Address.CountryCode,
        countryPhoneCodes[resp.data.Address.CountryCode],
      );

      //TODO: Use CountryCode to look up mobile phone country code
      user.update({
        $set: {
          street: resp.data.Address.Address1,
          zipCode: resp.data.Address.ZipCode,
          city: resp.data.Address.City,
          state: resp.data.Address.State,
          countryPhoneCode: countryPhoneCodes[resp.data.Address.CountryCode],
          phone: resp.data.Address.MobileNumber,
        },
      });

      return resp.data;
    } catch (err) {
      logger.error(
        `services.paywiser.PaywiserService.getPersonAddress: ${
          user.userId
        } : ${err.toString()}`,
      );
    }
    return undefined;
  };
}

export const paywiser = new PaywiserService();
