export interface ITicksRequest {
  uuid: string;
}

export interface ITicksResponse {
  ticks: ITick[];
}

export interface ITick {
  base: string;
  rel: string;
  token_id: string;
  symbol: string;
  lastPrice: number; // rel per base
  timestamp: number;
}