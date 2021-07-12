export interface ICareclixUser {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  clinicIds: string[];
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: Date;
  phoneNumber: {
    type: string;
    countryCode: string;
    number: string;
    code: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    countryCode:  string;
  };
}
