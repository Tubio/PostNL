import * as XLSX from "xlsx";
import { DepotCapacityRow } from "./types";

export function parseExcel(buffer: Buffer): DepotCapacityRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<{
    depot: string;
    capacity: number;
  }>(sheet);

  return rows
    .filter((row) => row.depot && row.capacity)
    .map((row) => ({
      depotId: String(row.depot),
      capacity: Number(row.capacity),
    }));
}