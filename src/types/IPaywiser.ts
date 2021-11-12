export interface IPaywiserReferenceNumberRequest {
  MobileNumber: string;
  Email: string;
  AddressChanged: boolean;
  DocumentChanged: boolean;
  IbanTypeID: string;
  ReferenceID: string;
}

export interface IPaywiserReferenceNumberResponse {
  StatusCode: number;
  StatusDescription: string;
  ReferenceNumber: string;
  ReferenceID: string;
  CallerReferenceID: string;
}

export interface IPaywiserCheckReferenceNumberRequest {
  ReferenceNumber: string;
  ReferenceID: string;
}

export interface IPaywiserCheckReferenceNumberResponse {
  StatusCode: number;
  StatusDescription: string;
  AssignedDateTime: string;
  ReferenceNumberStatus: string;
  PersonID: string;
  KycID: string;
  KycStart: string;
  KycEnd: string;
  KycStatus: string;
  VerificationEnd: string;
  VerificationStatus: string;
  AdditionalData: string;
  ReferenceID: string;
  CallerReferenceID: string;
}

export interface IPaywiserGetPersonAddressRequest {
  PersonID: string;
  KycID: string;
  ReferenceID: string;
}
export interface IPaywiserGetPersonAddressResponse {
  StatusCode?: number;
  StatusDescription?: string;
  Address?: PaywiserPersonAddress;
  ReferenceID?: string;
  CallerReferenceID?: string;
}

export interface PaywiserPersonAddress {
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Address1?: string;
  Address2?: string;
  Address3?: string;
  ZipCode?: string;
  City?: string;
  State?: string;
  CountryCode?: string;
  CountryName?: string;
  MobileNumber?: string;
  Email?: string;
  VerificationDateTime?: string;
  VerificationStatus?: string;
  VerificationRejectReason?: string;
}
