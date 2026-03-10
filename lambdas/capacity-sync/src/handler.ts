import { HandlerEvent, DepotCapacityType } from "./types";
import { getAccessToken, downloadExcel } from "./graphClient";
import { parseExcel } from "./excelParser";
import { storeDepots } from "./dynamoWriter";

export const handler = async (event: HandlerEvent): Promise<void> => {
  const excelType: DepotCapacityType = event.type ?? "daily";
  const fileId = excelType === "daily"
      ? process.env.DAILY_FILE_ID!
      : process.env.WEEKLY_FILE_ID!;

  const today = new Date().toISOString().split("T")[0];
  const token = await getAccessToken();
  const buffer = await downloadExcel(token, fileId);
  const rows = parseExcel(buffer);

  await storeDepots(rows, excelType, today);
};