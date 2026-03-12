import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "./handler";
import { KinesisStreamEvent } from "aws-lambda";
import { ScanningEvent } from "./types";

const dynamoMock = mockClient(DynamoDBClient);

function makeKinesisEvent(payload: ScanningEvent): KinesisStreamEvent {
  return {
    Records: [
      {
        kinesis: {
          data: Buffer.from(JSON.stringify(payload)).toString("base64"),
          partitionKey: payload.containerId,
          sequenceNumber: "1",
          kinesisSchemaVersion: "1.0",
          approximateArrivalTimestamp: Date.now(),
        },
        eventSource: "aws:kinesis",
        eventVersion: "1.0",
        eventID: "1",
        eventName: "aws:kinesis:record",
        invokeIdentityArn: "arn:role/test",
        awsRegion: "eu-west-1",
        eventSourceARN: "arn:aws:kinesis:eu-west-1:123:stream/scan-stream",
      },
    ],
  };
}

describe("stock tracker handler", () => {
  beforeEach(() => {
    dynamoMock.reset();
    process.env.TABLE_NAME = "test-table";
  });

  it("processes a single scanning event", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(makeKinesisEvent({
      containerId: "1234",
      destination: "haarlem",
      isEmpty: false,
      timestamp: "2026-03-09T08:00:00.000Z",
    }));

    expect(dynamoMock.calls()).toHaveLength(1);
  });

  it("writes correct PK to DynamoDB", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(makeKinesisEvent({
      containerId: "1234",
      destination: "haarlem",
      isEmpty: false,
      timestamp: "2026-03-09T08:00:00.000Z",
    }));

    const input = dynamoMock.calls()[0].args[0].input as any;
    expect(input.Key.PK.S).toBe("RC#1234");
  });

  it("sets status to IN_TRANSIT when not empty", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(makeKinesisEvent({
      containerId: "1234",
      destination: "haarlem",
      isEmpty: false,
      timestamp: "2026-03-09T08:00:00.000Z",
    }));

    const input = dynamoMock.calls()[0].args[0].input as any;
    expect(input.ExpressionAttributeValues[":status"].S).toBe("IN_TRANSIT");
  });

  it("sets status to EMPTY when empty", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(makeKinesisEvent({
      containerId: "1234",
      destination: "haarlem",
      isEmpty: true,
      timestamp: "2026-03-09T08:00:00.000Z",
    }));

    const input = dynamoMock.calls()[0].args[0].input as any;
    expect(input.ExpressionAttributeValues[":status"].S).toBe("EMPTY");
  });

  it("writes destination to DynamoDB", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(makeKinesisEvent({
      containerId: "1234",
      destination: "haarlem",
      isEmpty: false,
      timestamp: "2026-03-09T08:00:00.000Z",
    }));

    const input = dynamoMock.calls()[0].args[0].input as any;
    expect(input.ExpressionAttributeValues[":dest"].S).toBe("haarlem");
  });

  it("sets TTL on each event", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(makeKinesisEvent({
      containerId: "1234",
      destination: "haarlem",
      isEmpty: false,
      timestamp: "2026-03-09T08:00:00.000Z",
    }));

    const input = dynamoMock.calls()[0].args[0].input as any;
    const ttl = Number(input.ExpressionAttributeValues[":ttl"].N);
    expect(ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("throws error if DynamoDB call fails", async () => {
    dynamoMock.on(UpdateItemCommand).rejects(new Error("DynamoDB error"));

    await expect(
      handler(makeKinesisEvent({
        containerId: "1234",
        destination: "haarlem",
        isEmpty: false,
        timestamp: "2026-03-09T08:00:00.000Z",
      }))
    ).rejects.toThrow("Batch processing failed");
  });
});