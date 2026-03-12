import { KinesisStreamEvent } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { ScanningEvent, RollContainerStatus } from "./types";

const dynamo = new DynamoDBClient({});

function parseTTL(): number {
  const now = new Date();
  now.setHours(now.getHours() + 24);
  return Math.floor(now.getTime() / 1000);
}

function parseEvent(record: string): ScanningEvent {
  return JSON.parse(Buffer.from(record, "base64").toString("utf-8"));
}

function toStatus(isEmpty: boolean): RollContainerStatus {
  return isEmpty ? "EMPTY" : "IN_TRANSIT";
}

async function processEvent(event: ScanningEvent): Promise<void> {
  const status = toStatus(event.isEmpty);

  await dynamo.send(
    new UpdateItemCommand({
      TableName: process.env.TABLE_NAME!,
      Key: marshall({ PK: `RC#${event.containerId}` }),
      UpdateExpression:
        "SET destination = :dest, #status = :status, scanUpdatedAt = :ts, #ttl = :ttl",
      ExpressionAttributeNames: {
        "#status": "status",
        "#ttl": "ttl",
      },
      ExpressionAttributeValues: marshall({
        ":dest": event.destination,
        ":status": status,
        ":ts": event.timestamp,
        ":ttl": parseTTL(),
      }),
    })
  );
}

export const handler = async (event: KinesisStreamEvent): Promise<void> => {
  const results = await Promise.allSettled(
    event.Records.map((record) => processEvent(parseEvent(record.kinesis.data)))
  );
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    throw new Error(`Batch processing failed: ${failures.length} errors`);
  }
};