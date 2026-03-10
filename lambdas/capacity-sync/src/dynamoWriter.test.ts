import { DynamoDBClient, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { storeDepots } from "./dynamoWriter";

const dynamoMock = mockClient(DynamoDBClient);

describe("storeDepots", () => {
  beforeEach(() => {
    dynamoMock.reset();
    process.env.TABLE_NAME = "test-table";
  });

  it("calls DynamoDB with correct item structure", async () => {
    dynamoMock.on(BatchWriteItemCommand).resolves({});

    await storeDepots(
      [{ depotId: "haarlem", capacity: 3400 }],
      "daily",
      "2026-03-09"
    );

    const calls = dynamoMock.calls();
    expect(calls).toHaveLength(1);

    const input = calls[0].args[0].input as any;
    const putRequest = input.RequestItems["test-table"][0].PutRequest.Item;

    expect(putRequest.PK.S).toBe("DEPOT#haarlem");
    expect(putRequest.SK.S).toBe("2026-03-09#daily");
    expect(putRequest.capacity.N).toBe("3400");
    expect(putRequest.type.S).toBe("daily");
  });

  it("stores weekly type correctly", async () => {
    dynamoMock.on(BatchWriteItemCommand).resolves({});

    await storeDepots(
      [{ depotId: "amsterdam", capacity: 2800 }],
      "weekly",
      "2026-03-06"
    );

    const input = dynamoMock.calls()[0].args[0].input as any;
    const item = input.RequestItems["test-table"][0].PutRequest.Item;

    expect(item.type.S).toBe("weekly");
    expect(item.SK.S).toBe("2026-03-06#weekly");
  });

  it("daily and weekly on same date have different SKs", async () => {
    dynamoMock.on(BatchWriteItemCommand).resolves({});

    await storeDepots(
      [{ depotId: "haarlem", capacity: 3200 }],
      "daily",
      "2026-03-06"
    );

    await storeDepots(
      [{ depotId: "haarlem", capacity: 3100 }],
      "weekly",
      "2026-03-06"
    );

    const calls = dynamoMock.calls();
    const dailySK = (calls[0].args[0].input as any).RequestItems["test-table"][0].PutRequest.Item.SK.S;
    const weeklySK = (calls[1].args[0].input as any).RequestItems["test-table"][0].PutRequest.Item.SK.S;

    expect(dailySK).toBe("2026-03-06#daily");
    expect(weeklySK).toBe("2026-03-06#weekly");
    expect(dailySK).not.toBe(weeklySK);
  });

  it("throws if DynamoDB call fails", async () => {
    dynamoMock.on(BatchWriteItemCommand).rejects(new Error("DynamoDB error"));

    await expect(
      storeDepots([{ depotId: "haarlem", capacity: 3400 }], "daily", "2026-03-09")
    ).rejects.toThrow("DynamoDB error");
  });
});