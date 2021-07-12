import axios from 'axios';
import { IUser } from '../models/user';
import { config, logger } from '../common';
import { ICareclixUser } from '../types';

class CareclixService {
  public signUp = async (user: IUser, password: string) => {
    const careclixUser: ICareclixUser = {
      username: user.email,
      password: password,
      confirmPassword: password,
      email: user.email,
      clinicIds: [ user.clinic ],
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: {
        code: user.countryPhoneCode,
        countryCode: user.countryCode,
        number: user.phone
      },
      address: {
        street: user.street,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        country: user.country,
        countryCode: user.countryCode,
      }
    }

    try {
      const { data } = await axios.get(config.careclixSignUpUrl, { data: careclixUser });

      if (data.status === "ok") {
        user.careclixId = data.payload.id;
      }

      throw new Error(`Careclix account wasn\'t created: ${data}`);
    } catch (err) {
      throw new Error(`Unexpected error while creating Careclix account: ${err}`);
    }

    return true;
  };
}

export const careclix = new CareclixService();
