export type RollContainerStatus =
  | "IN_TRANSIT"
  | "EMPTY"
  | "UNKNOWN";

export interface LocationEvent {
  containerId: string;
  location: string;
  timestamp: string; 
}

export interface ScanningEvent {
  containerId: string;
  destination: string;
  isEmpty: boolean;
  timestamp: string;
}

export interface RollContainerRecord {
  PK: string;
  location?: string;
  destination?: string;
  status: RollContainerStatus;
  iotUpdatedAt?: string;
  scanUpdatedAt?: string;
  ttl: number;
}