import { config } from '../common';
import { ServerToServerService } from './server-to-server';
import { AxiosResponse } from 'axios';
import {
  OrderStatus,
  IOrderStatus,
  IExchangeResponse,
  IBalanceResponse,
  IBalanceRequest,
  IBuyRequest,
  IBuyResponse,
  ICancelOrderRequest,
  IListTransactionsRequest,
  IListTransactionsResponse,
  IGetFeeRequest,
  IGetFeeResponse,
  IOrderbookRequest,
  IOrderbookResponse,
  ISellRequest,
  ISellResponse,
  IMyRecentSwapsRequest,
  IMyRecentSwapsResponse,
  ISwapStatusRequest,
  ISwapStatusResponse,
  ExchangeEvent,
  SwapEvents,
  IMyOrdersResponse,
  TakerOrMaker,
  OrderStatusResponse,
  isOrderError,
  CancelResponse,
  isCancelOrderError,
  IBuyError,
  isBuyError,
  ISellError,
  isSellError,
  IMyRecentSwapsError,
  isMyRecentSwapsError,
  IMarketsResponse,
  ITicksResponse,
} from '../types';

interface IAuthInfo {
  userpass?: string;
  userId: string;
}

class ExchangeService extends ServerToServerService {
  private baseUrl = `${config.exchangeUrl}/api/v1`;
  public balance = async ({
    userId,
    coin,
    userpass,
  }: IAuthInfo & IBalanceRequest) => {
    const jwtAxios = this.getAxios({ userId, userpass });
    const { data } = await jwtAxios.get<any, AxiosResponse<IBalanceResponse>>(
      `${this.baseUrl}/balance/${coin}`,
    );
    return data;
  };

  public buy = async ({
    userId,
    userpass,
    base,
    rel,
    volume,
    price,
  }: IBuyRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId, userpass });
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<IExchangeResponse<IBuyResponse> | IBuyError>
    >(`${this.baseUrl}/buy`, { base, rel, volume, price });
    if (isBuyError(data)) {
      throw data.error;
    }
    return data.result;
  };

  public cancel = async ({
    userpass,
    userId,
    uuid,
  }: ICancelOrderRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId, userpass });
    const { data } = await jwtAxios.post<any, AxiosResponse<CancelResponse>>(
      `${this.baseUrl}/cancel`,
      { uuid },
    );
    if (isCancelOrderError(data)) {
      throw data.error;
    }
    return data;
  };
  public getEnabledCoins = async ({ userId }: { userId: string }) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.get<
      any,
      AxiosResponse<IExchangeResponse<{ address: string; ticker: string }[]>>
    >(`${this.baseUrl}/coins`);
    return result;
  };
  public getTransactions = async ({
    userId,
    userpass,
    coin,
    limit,
    from_id,
  }: IListTransactionsRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId, userpass });
    const {
      data: { result },
    } = await jwtAxios.get<
      any,
      AxiosResponse<IExchangeResponse<IListTransactionsResponse>>
    >(`${this.baseUrl}/transactions/${coin}/${limit}/${from_id}`);
    return result;
  };
  public getMarkets = async ({ userId }: IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.get<
      any,
      AxiosResponse<IExchangeResponse<IMarketsResponse>>
    >(`${this.baseUrl}/markets`);
    return result;
  };
  public getTickers = async ({ userId }: IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.get<
      any,
      AxiosResponse<IExchangeResponse<ITicksResponse>>
    >(`${this.baseUrl}/markets`);
    return result;
  };
  public getFee = async ({ userId, coin }: IAuthInfo & IGetFeeRequest) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.get<
      any,
      AxiosResponse<IExchangeResponse<IGetFeeResponse>>
    >(`${this.baseUrl}/fee/${coin}`);
    return result;
  };

  public getOrderbook = async ({
    userId,
    base,
    rel,
  }: IOrderbookRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.get<any, AxiosResponse<IOrderbookResponse>>(
      `${this.baseUrl}/orderbook/${base}/${rel}`,
    );
    return data;
  };
  public sell = async ({
    userId,
    userpass,
    base,
    rel,
    price,
    volume,
  }: ISellRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId, userpass });
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<IExchangeResponse<ISellResponse> | ISellError>
    >(`${this.baseUrl}/sell`, { base, rel, volume, price });
    if (isSellError(data)) {
      throw data.error;
    }
    return data.result;
  };
  public getRecentSwaps = async ({
    userId,
    limit,
    from_uuid,
  }: IMyRecentSwapsRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.get<
      any,
      AxiosResponse<
        IExchangeResponse<IMyRecentSwapsResponse> | IMyRecentSwapsError
      >
    >(`${this.baseUrl}/swaps/${limit}/${from_uuid}`);
    if (isMyRecentSwapsError(data)) {
      throw data.error;
    }
    return data.result;
  };
  public getSwapStatus = async ({
    userId,
    userpass,
    uuid,
  }: ISwapStatusRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId, userpass });
    const {
      data: { result },
    } = await jwtAxios.get<
      any,
      AxiosResponse<IExchangeResponse<ISwapStatusResponse>>
    >(`${this.baseUrl}/swap/${uuid}`);
    return result;
  };
  public getMyOrders = async ({ userId }: { userId: string }) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.get<
      any,
      AxiosResponse<IExchangeResponse<IMyOrdersResponse>>
    >(`${this.baseUrl}/orders`);
    return result;
  };
  public getOrderStatus = async ({
    userId,
    uuid,
  }: {
    userId: string;
    uuid: string;
  }) => {
    const jwtAxios = this.getAxios({ userId });
    const { data } = await jwtAxios.get<
      any,
      AxiosResponse<OrderStatusResponse>
    >(`${this.baseUrl}/order/${uuid}`);
    if (isOrderError(data)) {
      throw data.error;
    }
    return data;
  };
  public extractOrderStatusFromSwapEvents = (swaps: ISwapStatusResponse[]) => {
    return swaps.map(swap => {
      const status = this.extractSwapStatusFromSwapEvents(swap);
      return {
        orderId: swap.uuid,
        status,
        bought: swap?.my_info?.other_coin,
        sold: swap?.my_info?.my_coin,
      };
    });
  };
  public extractSwapStatusFromSwapEvents = (swap: ISwapStatusResponse) => {
    return swap.events.reduce((accum, curr) => {
      if (accum === OrderStatus.failed) {
        return accum;
      }
      const eventStatus = this.determineOrderStatusFromSwapEvent(curr);
      if (eventStatus !== OrderStatus.converting) {
        return eventStatus;
      }
      return accum;
    }, OrderStatus.converting);
  };
  public determineOrderStatusFromSwapEvent = (event: ExchangeEvent) => {
    switch (event.type) {
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
        return OrderStatus.failed;
      case SwapEvents.finished:
        return OrderStatus.complete;
      default:
        return OrderStatus.converting;
    }
  };
  public extractOrderInfoFromMyOrder = (
    orderStatusResponse: OrderStatusResponse,
  ): IOrderStatus => {
    if (isOrderError(orderStatusResponse)) {
      throw orderStatusResponse.error;
    }
    if (orderStatusResponse.type === TakerOrMaker.taker) {
      return {
        orderId: orderStatusResponse.order.request.uuid,
        status: OrderStatus.converting,
      };
    } else {
      return {
        orderId: orderStatusResponse.order.uuid,
        status: OrderStatus.converting,
      };
    }
  };
}
export const exchangeService = new ExchangeService();
