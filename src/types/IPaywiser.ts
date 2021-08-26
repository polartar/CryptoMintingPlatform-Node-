export interface IPaywiserReferenceNumberRequest {
  MobileNumber: string,
  Email: string,
  AddressChanged: boolean,
  DocumentChanged: boolean,
  IbanTypeID: string,
  ReferenceID: string
}

export interface IPaywiserReferenceNumberResponse {
  StatusCode: number,
  StatusDescription: string,
  ReferenceNumber: string,
  ReferenceID: string,
  CallerReferenceID: string
}
