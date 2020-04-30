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
  IGetFeeResponse,
  IOrderbookRequest,
  IOrderbookResponse,
  ISellRequest,
  ISellResponse,
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
  IMarketsResponse,
  ITicksResponse,
  IGetPrice,
  IGetPriceResponse,
  IItemQueryInput,
} from '../types';

interface IAuthInfo {
  walletPassword: string;
  userId: string;
}

class ExchangeService extends ServerToServerService {
  private baseUrl = `${config.exchangeUrl}`;
  private pubUrl = `${this.baseUrl}/pub`;
  private authUrl = `${this.baseUrl}/auth`;
  public balance = async ({
    userId,
    coin,
    walletPassword,
    tokenId,
    rel,
    walletAddress,
  }: IAuthInfo & IBalanceRequest) => {
    const jwtAxios = this.getAxios({ userId, walletPassword });
    const { data } = await jwtAxios.post<any, AxiosResponse<IBalanceResponse>>(
      `${this.authUrl}/get-balance`,
      { userId, walletPassword, coin, tokenId, rel, walletAddress },
    );
    return data;
  };

  public buy = async ({
    userId,
    walletPassword,
    base,
    rel,
    quantityBase,
    price,
  }: IBuyRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId, walletPassword });
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<IExchangeResponse<IBuyResponse> | IBuyError>
    >(`${this.authUrl}/buy`, {
      base,
      rel,
      quantityBase,
      price,
      userId,
      walletPassword,
    });
    if (isBuyError(data)) {
      throw data.error;
    }
    return data.result;
  };

  public cancel = async ({
    walletPassword,
    userId,
    uuid,
  }: ICancelOrderRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId, walletPassword });
    const { data } = await jwtAxios.post<any, AxiosResponse<CancelResponse>>(
      `${this.authUrl}/cancel`,
      { uuid },
    );
    if (isCancelOrderError(data)) {
      throw data.error;
    }
    return data;
  };
  public getMarkets = async () => {
    const jwtAxios = this.getAxios({});

    const { data } = await jwtAxios.get<any, AxiosResponse<IMarketsResponse>>(
      `${this.pubUrl}/markets`,
    );

    return data;
  };
  public getTicks = async () => {
    const jwtAxios = this.getAxios({});
    const { data } = await jwtAxios.get<any, AxiosResponse<ITicksResponse>>(
      `${this.pubUrl}/ticks`,
    );

    return data;
  };
  public getFee = async () => {
    const jwtAxios = this.getAxios({});
    const {
      data: { result },
    } = await jwtAxios.get<
      any,
      AxiosResponse<IExchangeResponse<IGetFeeResponse>>
    >(`${this.pubUrl}/get-fees`);
    return result;
  };

  public getOrderbook = async ({ base, rel, tokenId }: IOrderbookRequest) => {
    const jwtAxios = this.getAxios({});
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<IOrderbookResponse>
    >(`${this.pubUrl}/order-book/all`, { base, rel, tokenId });
    return data;
  };
  public getPrice = async ({
    base,
    tokenId,
    rel,
    quantityBase,
    buyOrSell,
  }: IGetPrice) => {
    const jwtAxios = this.getAxios({});
    const { data } = await jwtAxios.post<any, AxiosResponse<IGetPriceResponse>>(
      `${this.pubUrl}/get-price`,
      {
        base,
        rel,
        tokenId,
        quantityBase,
        buyOrSell,
      },
    );
    return data;
  };
  public getOrderbookByNft = async ({
    base,
    rel,
    nftBaseId,
  }: IOrderbookRequest & { nftBaseId: number }) => {
    const jwtAxios = this.getAxios({});
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<IOrderbookResponse>
    >(`${this.pubUrl}/order-book/by-nft`, { base, rel, nftBaseId });
    return data;
  };
  public sell = async ({
    userId,
    walletPassword,
    base,
    rel,
    price,
    quantityBase,
    tokenId,
  }: ISellRequest & IAuthInfo) => {
    const jwtAxios = this.getAxios({ userId, walletPassword });
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<IExchangeResponse<ISellResponse> | ISellError>
    >(`${this.authUrl}/sell`, {
      base,
      rel,
      quantityBase,
      tokenId,
      price,
      userId,
      walletPassword,
    });
    if (isSellError(data)) {
      throw data.error;
    }
    return data.result;
  };
  public getMyOrders = async ({
    userId,
    base,
    rel,
    tokenId,
  }: {
    userId: string;
    base?: string;
    rel?: string;
    tokenId?: string;
  }) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.post<
      any,
      AxiosResponse<IExchangeResponse<IMyOrdersResponse>>
    >(`${this.authUrl}/my-orders/open`, { userId, base, rel, tokenId });
    return result;
  };
  public getMyOrdersByNftBaseId = async ({
    userId,
    base,
    rel,
    nftBaseId,
  }: {
    userId: string;
    base: string;
    rel: string;
    nftBaseId: number;
  }) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.post<
      any,
      AxiosResponse<IExchangeResponse<IMyOrdersResponse>>
    >(`${this.authUrl}/my-orders/by-nft`, { userId, base, rel, nftBaseId });
    return result;
  };
  getClosedOrders = async ({
    userId,
    base,
    rel,
    tokenId,
  }: {
    userId: string;
    base?: string;
    rel?: string;
    tokenId?: number;
  }) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.post<
      any,
      AxiosResponse<IExchangeResponse<IMyOrdersResponse>>
    >(`${this.authUrl}/my-orders/closed`, { userId, base, rel, tokenId });
    return result;
  };
  getOpenOrders = async ({
    userId,
    base,
    rel,
    tokenId,
  }: {
    userId: string;
    base: string;
    rel: string;
    tokenId: number;
  }) => {
    const jwtAxios = this.getAxios({ userId });
    const {
      data: { result },
    } = await jwtAxios.post<
      any,
      AxiosResponse<IExchangeResponse<IMyOrdersResponse>>
    >(`${this.authUrl}/my-orders/closed`, { userId, base, rel, tokenId });
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
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<OrderStatusResponse>
    >(`${this.authUrl}/my-orders/detail`, { userId, uuid });
    if (isOrderError(data)) {
      throw data.error;
    }
    return data;
  };
  public getItems = async (itemQuery: IItemQueryInput) => {
    const jwtAxios = this.getAxios({});
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<IOrderbookResponse>
    >(`${this.pubUrl}/order-book/all`, itemQuery);

    return data;
  };
  public getHistory = async () => {
    const jwtAxios = this.getAxios({});
    const { data } = await jwtAxios.get<any, AxiosResponse<IOrderbookResponse>>(
      `${this.pubUrl}/history`,
    );

    return data;
  };
  public getHistorySummary = async ({
    base,
    rel,
    nftBaseId,
  }: {
    base: string;
    rel: string;
    nftBaseId: number;
  }) => {
    const jwtAxios = this.getAxios({});
    const { data } = await jwtAxios.post<
      any,
      AxiosResponse<IOrderbookResponse>
    >(`${this.pubUrl}/history/summary`, { base, rel, nftBaseId });

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
