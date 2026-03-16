export interface StockLevelEvent {
  depotId?: string;
}

export interface ContainerStock {
  depotId: string;
  containersInTransit: number;
  containersEmpty: number;
  containersUnknown: number;
  asOf: string;
}