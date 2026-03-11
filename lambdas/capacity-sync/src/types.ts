export type DepotCapacityType = "daily" | "weekly";

export interface DepotCapacityRow {
  depotId: string;
  capacity: number;
}

export interface HandlerEvent {
  type?: DepotCapacityType;
}

export interface DepotCapacityRecord {
  PK: string;
  SK: string;
  depotId: string;
  capacity: number;
  depotCapacityType: DepotCapacityType;
  updatedAt: string;
}