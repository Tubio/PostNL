import * as XLSX from "xlsx";
import { DepotCapacityRow } from "./types";

export function parseExcel(buffer: Buffer): DepotCapacityRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<{
    depot_id: string;
    capacity: number;
  }>(sheet);

  return rows
    .filter((row) => row.depot_id && row.capacity)
    .map((row) => ({
      depotId: String(row.depot_id),
      capacity: Number(row.capacity),
    }));
}