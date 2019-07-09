export default interface IWeb3TransferEvent {
  address: string;
  blockHash: string;
  blockNumber: number;
  event: string;
  id: string;
  logIndex: number;
  raw: any;
  removed: boolean;
  returnValues: {
    from: string;
    to: string;
    tokens: any;
  };
  signature: string;
  transactionHash: string;
  transactionIndex: number;
}
