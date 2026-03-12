import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "./handler";
import { KinesisStreamEvent } from "aws-lambda";

const dynamoMock = mockClient(DynamoDBClient);

function makeKinesisEvent(payload: any): KinesisStreamEvent {
  return {
    Records: [
      {
        kinesis: {
          data: Buffer.from(JSON.stringify(payload)).toString("base64"),
          partitionKey: payload.containerId ?? "unknown",
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
        eventSourceARN: "arn:aws:kinesis:eu-west-1:123:stream/iot-stream",
      },
    ],
  };
}

function makeKinesisEvents(payloads: any[]): KinesisStreamEvent {
  return {
    Records: payloads.map((payload, i) => ({
      kinesis: {
        data: Buffer.from(JSON.stringify(payload)).toString("base64"),
        partitionKey: payload.containerId ?? String(i),
        sequenceNumber: String(i),
        kinesisSchemaVersion: "1.0",
        approximateArrivalTimestamp: Date.now(),
      },
      eventSource: "aws:kinesis",
      eventVersion: "1.0",
      eventID: `${i}`,
      eventName: "aws:kinesis:record",
      invokeIdentityArn: "arn:role/test",
      awsRegion: "eu-west-1",
      eventSourceARN: "arn:aws:kinesis:eu-west-1:123:stream/iot-stream",
    })),
  };
}

describe("location tracker handler", () => {
  beforeEach(() => {
    dynamoMock.reset();
    process.env.TABLE_NAME = "test-table";
  });

  it("processes a single event", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(
      makeKinesisEvent({
        containerId: "1234",
        location: "haarlem",
        timestamp: "2026-03-09T10:00:00.000Z",
      })
    );
    expect(dynamoMock.calls()).toHaveLength(1);
  });

  it("writes correct PK to DynamoDB", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(
      makeKinesisEvent({
        containerId: "1234",
        location: "haarlem",
        timestamp: "2026-03-09T10:00:00.000Z",
      })
    );
    const input = dynamoMock.calls()[0].args[0].input as any;
    expect(input.Key.PK.S).toBe("RC#1234");
  });

  it("does not overwrite existing status", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(
      makeKinesisEvent({
        containerId: "1234",
        location: "haarlem",
        timestamp: "2026-03-09T10:00:00.000Z",
      })
    );
    const input = dynamoMock.calls()[0].args[0].input as any;
    expect(input.UpdateExpression).toContain("if_not_exists");
  });

  it("sets TTL on each event", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(
      makeKinesisEvent({
        containerId: "1234",
        location: "haarlem",
        timestamp: "2026-03-09T10:00:00.000Z",
      })
    );
    const input = dynamoMock.calls()[0].args[0].input as any;
    const ttl = Number(input.ExpressionAttributeValues[":ttl"].N);
    expect(ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("processes a batch of events", async () => {
    dynamoMock.on(UpdateItemCommand).resolves({});

    await handler(
      makeKinesisEvents([
        { containerId: "1234", location: "haarlem", timestamp: "2026-03-09T10:00:00.000Z" },
        { containerId: "5678", location: "Rotterdam", timestamp: "2026-03-09T10:01:00.000Z" },
        { containerId: "4321", location: "Amsterdam", timestamp: "2026-03-09T10:02:00.000Z" },
      ])
    );
    expect(dynamoMock.calls()).toHaveLength(3);
  });

  it("throws error if any DynamoDB call fails", async () => {
    dynamoMock.on(UpdateItemCommand).rejects(new Error("DynamoDB error"));

    await expect(
      handler(
        makeKinesisEvent({
          containerId: "1234",
          location: "haarlem",
          timestamp: "2026-03-09T10:00:00.000Z",
        })
      )
    ).rejects.toThrow("Batch processing failed");
  });
});