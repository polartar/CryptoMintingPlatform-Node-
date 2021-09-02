export default interface IKyc {
  StatusCode: number;
  StatusDescription: string;
  PersonID: string;
  KycID: string;
  RequireMobileNumberCheck: boolean;
  RequireVideo: boolean;
  RequireAdditionalDocuments: boolean;
  AllowAddressEntry: boolean;
  RequiredAddressFields: string;
  AdditionalDocuments: string;
  VideoDocumentExpiryDate: string;
  VideoDocumentWillExpire: string;
  VideoDocumentExpired: string;
  IbanWillBeCreated: string;
  RequireAddress: boolean;
  AddressFields: string;
  ReferenceID: string;
}
