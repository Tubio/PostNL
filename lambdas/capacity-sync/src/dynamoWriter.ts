import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { DepotCapacityRow, DepotCapacityRecord, DepotCapacityType } from "./types";

const dynamo = new DynamoDBClient({});

export async function storeDepots(
  rows: DepotCapacityRow[],
  depotCapacityType: DepotCapacityType,
  depotCapacityDate: string
): Promise<void> {
  for (const row of rows) {
    const record: DepotCapacityRecord = {
      PK: `DEPOT#${row.depotId}`,
      SK: `${depotCapacityDate}#${depotCapacityType}`,
      depotId: row.depotId,
      capacity: row.capacity,
      depotCapacityType: depotCapacityType,
      updatedAt: new Date().toISOString(),
    };

    await dynamo.send(
      new PutItemCommand({
        TableName: process.env.TABLE_NAME!,
        Item: marshall(record),
      })
    );
  }
}