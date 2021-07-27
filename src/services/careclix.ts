import axios from 'axios';
import { IUser } from '../models/user';
import { config } from '../common';
import { ICareclixUser } from '../types';

class CareclixService {
  public signUp = async (user: IUser, password: string) => {
    try {
      const { data } = await axios.get(config.careclixSignUpUrl, {
        data: this.createUser(user, password),
      });

      if (data.status === 'ok') {
        user.careclixId = data.payload.id;

        return true;
      }

      throw new Error(`Received response: ${JSON.stringify(data)}`);
    } catch (err) {
      throw new Error(
        `An error happened while creating Careclix account: ${err.toString()}`,
      );
    }
  };

  private createUser = (user: IUser, password: string): ICareclixUser => {
    return {
      username: user.email,
      password: password,
      confirmPassword: password,
      email: user.email,
      clinicIds: [user.clinic],
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: {
        code: user.countryPhoneCode,
        countryCode: user.countryCode,
        number: user.phone,
      },
      address: {
        street: user.street,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        country: user.country,
        countryCode: user.countryCode,
      },
    };
  };
}

export const careclix = new CareclixService();
