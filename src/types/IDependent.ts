export default interface IDependent {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phoneNumber: string;
  country: string;
  clinic: string;
  careclixId: string;
  relationship?: string;
  created: Date;
}

export interface IDependentInput {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phoneNumber: string;
  country: string;
  clinic: string;
  careclixId: string;
  relationship?: string;
}
