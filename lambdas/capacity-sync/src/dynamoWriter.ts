import { DynamoDBClient, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { DepotCapacityRow, DepotCapacityRecord, DepotCapacityType } from "./types";

const dynamo = new DynamoDBClient({});

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

export async function storeDepots(
  rows: DepotCapacityRow[],
  excelType: DepotCapacityType,
  date: string
): Promise<void> {
  const chunks = chunkArray(rows, 25);

  for (const chunk of chunks) {
    const records: DepotCapacityRecord[] = chunk.map((row) => ({
      PK: `DEPOT#${row.depotId}`,
      SK: `${date}#${excelType}`,
      depotId: row.depotId,
      capacity: row.capacity,
      DepotCapacityType: excelType,
      updatedAt: date,
    }));

    await dynamo.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [process.env.TABLE_NAME!]: records.map((record) => ({
            PutRequest: { Item: marshall(record) },
          })),
        },
      })
    );
  }
}