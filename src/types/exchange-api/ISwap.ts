import { IWithdraw } from './IWithdraw';
export interface IMySwapHistory {
  swaps: IMySwapHistoryDetail[];
  timestamp: number;
}

export interface IMySwapHistoryDetail {
  uuid: string;
  base: string;
  rel: string;
  nftBaseId: string;
  myCoin: string;
  myAmount: number;
  otherCoin: string;
  otherAmount: number;
  startedAt: number;
  tokenId: string;
}
export interface ISwapStatusRequest {
  uuid: string; // the uuid of swap, typically received from the buy/sell call --GOES IN PARAMS
}

export interface IMyRecentSwapsRequest {
  limit?: number; // limits the number of returned swaps
  from_uuid?: string; // MM2 will skip records until this uuid, skipping the from_uuid as well
}

export interface IMyRecentSwapsResponse {
  swaps: ISwapStatusResponse[];
  from_uuid: string; // the from_uuid that was set in the request; this value is null if nothing was set
  skipped: number; // the number of skipped records (i.e. the position of from_uuid in the list + 1; the value is 0 if from_uuid was not set
  limit: number; // the limit that was set in the request; note that the actual number of swaps can differ from the specified limit (e.g. on the last page
  total: number; //  total number of swaps available
}
export interface IMyRecentSwapsError {
  error: string; //example: "lp_swap:1454] from_uuid e299c6ece7a7ddc42444eda64d46b163eaa992da65ce6de24eb812d715184e41 swap is not found"
}
export function isMyRecentSwapsError(
  data: { result: IMyRecentSwapsResponse } | IMyRecentSwapsError,
): data is IMyRecentSwapsError {
  return (data as IMyRecentSwapsError).error !== undefined;
}
export interface ISwapStatusResponse {
  events: ExchangeEvent[];
  success_events: string[]; // a list of events that gained a success swap state; the contents are listed in the order in which they should occur in the events array
  error_events: string[]; // a list of events that fell into an error swap state; if at least 1 of the events happens, the swap is considered a failure
  uuid: string; // swap uuid
  gui?: string; // information about gui; copied from MM2 configuration
  mm_version?: string; // MM2 version
  maker_coin?: string; // ticker of maker coin
  taker_coin?: string; // ticker of taker coin
  maker_amount?: string; // the amount of coins to be swapped by maker
  taker_amount?: string; // the amount of coins to be swapped by taker
  my_info?: {
    my_amount: string;
    my_coin: string; // what the user traded away
    other_amount: string;
    other_coin: string; // what the user is receiving
    started_at: number;
  }; // this object maps event data to make displaying swap data in a GUI simpler (my_coin, my_amount, etc.)
  recoverable: boolean; // whether the swap can be recovered using the recover_funds_of_swap API command. Important note: MM2 does not record the state regarding whether the swap was recovered or not. MM2 allows as many calls to the recover_funds_of_swap method as necessary, in case of errors
}

interface IStarted {
  taker_coin: string; // the ticker of the taker coin
  maker_coin: string; // the ticker of the maker coin
  taker: string; // the p2p ID of taker node
  secret: string; // a random secret, the hash of which is used to lock atomic-swap payments
  secret_hash: string; // the hash of the swap secret
  my_persistent_pub: string; // a persistent secp256k1 public key of maker node
  lock_duration: number; // the lock duration of swap payments in seconds. The sender can refund the transaction when the lock duration is passed. The taker payment is locked for the lock duration. The maker payment is locked for lock duration * 2
  maker_amount: string; // the amount of coins to be swapped by maker
  taker_amount: string; // the amount of coins to be swapped by taker
  maker_payment_confirmations: number; // the required number of blockchain confirmations for maker payment
  maker_payment_requires_nota: boolean; // whether dPoW notarization is required for maker payment; can be null; available since beta-2.0.1738
  taker_payment_confirmations: number; // the required number of blockchain confirmations for taker payment
  taker_payment_requires_nota: boolean; // whether dPoW notarization is required for taker payment; can be null; available since beta-2.0.1738
  maker_payment_lock: number; // the maker payment is locked until this timestamp
  uuid: string; // the swap uuid
  started_at: number; // UTC timestamp in seconds the timestamp at the start of the swap
  maker_coin_start_block: number; // the maker coin block number at the start of the swap
  taker_coin_start_block: number; // the taker coin block number at the start of the swap
}
interface IStartedEvent {
  type: SwapEvents.started;
  data: IStarted;
}

interface IStartFailedEvent {
  type: SwapEvents.startFailed; //error description with stack trace
  data: IFailedEvent;
}
interface IFailedEvent {
  error: string;
}
interface INegotiated {
  taker_payment_locktime: number; // UTC timestamp in seconds, the taker payment is locked until this timestamp
  taker_pubkey: string; // a persistent secp256k1 public key of taker node
}
interface INegotiatedEvent {
  type: SwapEvents.negotiated;
  data: INegotiated;
}

interface INegotiateFailedEvent {
  type: SwapEvents.negotiateFailed;
  data: IFailedEvent;
}

interface ITakerFeeValidatedEvent {
  type: SwapEvents.takerFeeValidated;
  data: IWithdraw;
}
interface ITakerFeeValidateFailedEvent {
  type: SwapEvents.takerFeeValidateFailed;
  data: IFailedEvent;
}

interface IMakerPaymentTransactionFailedEvent {
  type: SwapEvents.makerPaymentTransactionFailed;
  data: IFailedEvent;
}

interface IMakerPaymentSentEvent {
  type: SwapEvents.makerPaymentSent;
  data: IWithdraw;
}

interface IMakerPaymentDataSendFailedEvent {
  type: SwapEvents.makerPaymentDataSendFailed;
  data: IFailedEvent;
}

interface IMakerPaymentWaitConfirmFailedEvent {
  type: SwapEvents.makerPaymentWaitConfirmFailed;
  data: IFailedEvent;
}

interface ITakerPaymentReceivedEvent {
  type: SwapEvents.takerPaymentReceived;
  data: IWithdraw;
}

interface ITakerPaymentValidateFailedEvent {
  type: SwapEvents.takerPaymentValidateFailed;
  data: IFailedEvent;
}
interface ITakerPaymentWaitConfirmFailedEvent {
  type: SwapEvents.takerPaymentWaitConfirmFailed;
  data: IFailedEvent;
}
interface ITakerPaymentSpendFailedEvent {
  type: SwapEvents.takerPaymentSpendFailed;
  data: IFailedEvent;
}
interface ITakerPaymentSpentEvent {
  type: SwapEvents.takerPaymentSpent;
  data: IWithdraw;
}

interface IMakerPaymentWaitRefundStartedEvent {
  type: SwapEvents.makerPaymentWaitRefundStarted;
  data: {
    wait_until: number; //  UTC timestamp. the timestamp at which a refund will occur
  };
}
interface IMakerPaymentRefundFailedEvent {
  type: SwapEvents.makerPaymentRefundFailed;
  data: IFailedEvent;
}
interface IMakerPaymentRefundedEvent {
  type: SwapEvents.makerPaymentRefunded;
  data: IWithdraw;
}

interface ITakerFeeSentEvent {
  type: SwapEvents.takerFeeSent;
  data: IWithdraw;
}
interface ITakerFeeSendFailedEvent {
  type: SwapEvents.takerFeeSendFailed;
  data: IFailedEvent;
}
interface IMakerPaymentValidateFailedEvent {
  type: SwapEvents.makerPaymentValidateFailed;
  data: IFailedEvent;
}
interface IMakerPaymentReceivedEvent {
  type: SwapEvents.makerPaymentReceived;
  data: IWithdraw;
}
interface IMakerPaymentWaitConfirmStartedEvent {
  type: SwapEvents.makerPaymentWaitConfirmStarted;
  data: undefined;
}
interface IMakerPaymentValidatedAndConfirmedEvent {
  type: SwapEvents.makerPaymentValidatedAndConfirmed;
  data: undefined;
}
interface ITakerPaymentSent {
  type: SwapEvents.takerPaymentSent;
  data: IWithdraw;
}
interface ITakerPaymentTransactionFailedEvent {
  type: SwapEvents.takerPaymentTransactionFailed;
  data: IFailedEvent;
}
interface ITakerPaymentDataSendFailedEvent {
  type: SwapEvents.takerPaymentDataSendFailed;
  data: IFailedEvent;
}
interface ITakerPaymentWaitForSpendFailedEvent {
  type: SwapEvents.takerPaymentWaitForSpendFailed;
  data: IFailedEvent;
}
interface IMakerPaymentSpendFailedEvent {
  type: SwapEvents.makerPaymentSpendFailed;
  data: IFailedEvent;
}
interface IMakerPaymentSpentEvent {
  type: SwapEvents.makerPaymentSpent;
  data: IWithdraw;
}
interface ITakerPaymentWaitRefundStartedEvent {
  type: SwapEvents.takerPaymentWaitRefundStarted;
  data: {
    wait_until: number; // the timestamp at which a refund will occur
  };
}
interface ITakerPaymentRefundFailedEvent {
  type: SwapEvents.takerPaymentRefundFailed;
  data: IFailedEvent;
}
interface ITakerPaymentRefundedEvent {
  type: SwapEvents.takerPaymentRefunded;
  data: IWithdraw;
}
interface IFinishedEvent {
  type: SwapEvents.finished;
  data: undefined;
}
export enum SwapEvents {
  takerPaymentValidatedAndConfirmed = 'TakerPaymentValidatedAndConfirmed',
  started = 'Started',
  startFailed = 'StartFailed',
  negotiated = 'Negotiated',
  negotiateFailed = 'NegotiateFailed',
  takerFeeValidated = 'TakerFeeValidated',
  takerFeeValidateFailed = 'TakerFeeValidateFailed',
  makerPaymentTransactionFailed = 'MakerPaymentTransactionFailed',
  makerPaymentSent = 'MakerPaymentSent',
  makerPaymentDataSendFailed = 'MakerPaymentDataSendFailed',
  makerPaymentWaitConfirmFailed = 'MakerPaymentWaitConfirmFailed',
  takerPaymentReceived = 'TakerPaymentReceived',
  takerPaymentValidateFailed = 'TakerPaymentValidateFailed',
  takerPaymentWaitConfirmFailed = 'TakerPaymentWaitConfirmFailed',
  takerPaymentSpendFailed = 'TakerPaymentSpendFailed',
  takerPaymentSpent = 'TakerPaymentSpent',
  makerPaymentWaitRefundStarted = 'MakerPaymentWaitRefundStarted',
  makerPaymentRefundFailed = 'MakerPaymentRefundFailed',
  makerPaymentRefunded = 'MakerPaymentRefunded',
  takerFeeSent = 'TakerFeeSent',
  takerFeeSendFailed = 'TakerFeeSendFailed',
  makerPaymentValidateFailed = 'MakerPaymentValidateFailed',
  makerPaymentReceived = 'MakerPaymentReceived',
  makerPaymentWaitConfirmStarted = 'MakerPaymentWaitConfirmStarted',
  makerPaymentValidatedAndConfirmed = 'MakerPaymentValidatedAndConfirmed',
  takerPaymentSent = 'TakerPaymentSent',
  takerPaymentTransactionFailed = 'TakerPaymentTransactionFailed',
  takerPaymentDataSendFailed = 'TakerPaymentDataSendFailed',
  takerPaymentWaitForSpendFailed = 'TakerPaymentWaitForSpendFailed',
  makerPaymentSpendFailed = 'MakerPaymentSpendFailed',
  makerPaymentSpent = 'MakerPaymentSpent',
  takerPaymentWaitRefundStarted = 'TakerPaymentWaitRefundStarted',
  takerPaymentRefundFailed = 'TakerPaymentRefundFailed',
  takerPaymentRefunded = 'TakerPaymentRefunded',
  finished = 'Finished',
}
export type ExchangeEvent =
  | IStartedEvent
  | IStartFailedEvent
  | INegotiatedEvent
  | INegotiateFailedEvent
  | ITakerFeeValidatedEvent
  | ITakerFeeValidateFailedEvent
  | IMakerPaymentTransactionFailedEvent
  | IMakerPaymentSentEvent
  | IMakerPaymentDataSendFailedEvent
  | IMakerPaymentWaitConfirmFailedEvent
  | ITakerPaymentReceivedEvent
  | ITakerPaymentValidateFailedEvent
  | ITakerPaymentWaitConfirmFailedEvent
  | ITakerPaymentSpendFailedEvent
  | ITakerPaymentSpentEvent
  | IMakerPaymentWaitRefundStartedEvent
  | IMakerPaymentRefundedEvent
  | IMakerPaymentRefundFailedEvent
  | ITakerFeeSentEvent
  | ITakerFeeSendFailedEvent
  | IMakerPaymentValidateFailedEvent
  | IMakerPaymentReceivedEvent
  | IMakerPaymentWaitConfirmStartedEvent
  | IMakerPaymentValidatedAndConfirmedEvent
  | ITakerPaymentSent
  | ITakerPaymentTransactionFailedEvent
  | ITakerPaymentDataSendFailedEvent
  | ITakerPaymentWaitForSpendFailedEvent
  | IMakerPaymentSpendFailedEvent
  | IMakerPaymentSpentEvent
  | ITakerPaymentWaitRefundStartedEvent
  | ITakerPaymentRefundFailedEvent
  | ITakerPaymentRefundedEvent
  | IFinishedEvent;

function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
}
function test(e: ExchangeEvent) {
  switch (e.type) {
    case SwapEvents.started:
      return 2;
    case SwapEvents.startFailed:
      return 2;
    case SwapEvents.negotiated:
      return 2;
    case SwapEvents.negotiateFailed:
      return 2;
    case SwapEvents.takerFeeValidated:
      return 2;
    case SwapEvents.takerFeeValidateFailed:
      return 2;
    case SwapEvents.makerPaymentTransactionFailed:
      return 2;
    case SwapEvents.makerPaymentSent:
      return 2;
    case SwapEvents.makerPaymentDataSendFailed:
      return 0;
    case SwapEvents.makerPaymentWaitConfirmFailed:
      return 0;
    case SwapEvents.takerPaymentReceived:
      return 0;
    case SwapEvents.takerPaymentValidateFailed:
      return 0;
    case SwapEvents.takerPaymentWaitConfirmFailed:
      return 0;
    case SwapEvents.takerPaymentSpendFailed:
      return 0;
    case SwapEvents.takerPaymentSpent:
      return 0;
    case SwapEvents.makerPaymentWaitRefundStarted:
      return 0;
    case SwapEvents.makerPaymentRefunded:
      return 0;
    case SwapEvents.makerPaymentRefundFailed:
      return 0;
    case SwapEvents.takerFeeSent:
      return 0;
    case SwapEvents.takerFeeSendFailed:
      return 0;
    case SwapEvents.makerPaymentValidateFailed:
      return 0;
    case SwapEvents.makerPaymentReceived:
      return 0;
    case SwapEvents.makerPaymentWaitConfirmStarted:
      return 0;
    case SwapEvents.makerPaymentValidatedAndConfirmed:
      return 0;
    case SwapEvents.takerPaymentSent:
      return 0;
    case SwapEvents.takerPaymentTransactionFailed:
      return 0;
    case SwapEvents.takerPaymentDataSendFailed:
      return 0;
    case SwapEvents.takerPaymentWaitForSpendFailed:
      return 0;
    case SwapEvents.makerPaymentSpendFailed:
      return 0;
    case SwapEvents.makerPaymentSpent:
      return 0;
    case SwapEvents.takerPaymentWaitRefundStarted:
      return 0;
    case SwapEvents.takerPaymentRefundFailed:
      return 0;
    case SwapEvents.takerPaymentRefunded:
      return 0;
    case SwapEvents.finished:
      return 0;
    default:
      return assertNever(e);
  }
}
function test2(e: ExchangeEvent) {
  switch (e.type) {
    case SwapEvents.startFailed:
    case SwapEvents.negotiateFailed:
    case SwapEvents.takerFeeValidateFailed:
    case SwapEvents.makerPaymentTransactionFailed:
    case SwapEvents.makerPaymentDataSendFailed:
    case SwapEvents.makerPaymentWaitConfirmFailed:
    case SwapEvents.takerPaymentValidateFailed:
    case SwapEvents.takerPaymentWaitConfirmFailed:
    case SwapEvents.takerPaymentSpendFailed:
    case SwapEvents.makerPaymentRefundFailed:
    case SwapEvents.takerFeeSendFailed:
    case SwapEvents.makerPaymentValidateFailed:
    case SwapEvents.takerPaymentTransactionFailed:
    case SwapEvents.takerPaymentDataSendFailed:
    case SwapEvents.takerPaymentWaitForSpendFailed:
    case SwapEvents.makerPaymentSpendFailed:
    case SwapEvents.takerPaymentRefundFailed:
      return 0;
    case SwapEvents.started:
      return 1;
    case SwapEvents.negotiated:
      return 2;
    case SwapEvents.takerFeeValidated:
      return 3;
    case SwapEvents.makerPaymentSent:
      return 4;
    case SwapEvents.takerPaymentReceived:
      return 5;
    case SwapEvents.takerPaymentSpent:
      return 6;
    case SwapEvents.makerPaymentWaitRefundStarted:
      return 7;
    case SwapEvents.makerPaymentRefunded:
      return 8;
    case SwapEvents.takerFeeSent:
      return 9;
    case SwapEvents.makerPaymentReceived:
      return 10;
    case SwapEvents.makerPaymentWaitConfirmStarted:
      return 11;
    case SwapEvents.makerPaymentValidatedAndConfirmed:
      return 12;
    case SwapEvents.takerPaymentSent:
      return 13;
    case SwapEvents.makerPaymentSpent:
      return 14;
    case SwapEvents.takerPaymentWaitRefundStarted:
      return 15;
    case SwapEvents.takerPaymentRefunded:
      return 16;
    case SwapEvents.finished:
      return 17;
    default:
      return assertNever(e);
  }
}
