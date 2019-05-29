export default interface ITransaction {
  id: string;
  status: string;
  confirmations: number;
  timestamp: number;
  fee: number;
  link: string;
  to: string;
  from: string;
  amount: number;
}
