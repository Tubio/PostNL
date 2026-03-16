import { KinesisStreamEvent } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { LocationEvent } from "./types";

const dynamo = new DynamoDBClient({});

function parseTTL(): number {
  const now = new Date();
  now.setHours(now.getHours() + 24);
  return Math.floor(now.getTime() / 1000);
}

function parseEvent(record: string): LocationEvent {
  return JSON.parse(Buffer.from(record, "base64").toString("utf-8"));
}

async function processEvent(event: LocationEvent): Promise<void> {
  await dynamo.send(
    new UpdateItemCommand({
      TableName: process.env.TABLE_NAME!,
      Key: marshall({ PK: `RC#${event.containerId}`, SK: "#STATE" }),
      UpdateExpression:
        "SET #loc = :loc, iotUpdatedAt = :ts, #ttl = :ttl, #status = if_not_exists(#status, :unknown)",
      ExpressionAttributeNames: {
        "#loc": "location",
        "#ttl": "ttl",
        "#status": "status",
      },
      ExpressionAttributeValues: marshall({
        ":loc": event.location,
        ":ts": event.timestamp,
        ":ttl": parseTTL(),
        ":unknown": "UNKNOWN",
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