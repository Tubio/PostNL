import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { storeDepots } from "./dynamoWriter";

const dynamoMock = mockClient(DynamoDBClient);

describe("storeDepots", () => {
  beforeEach(() => {
    dynamoMock.reset();
    process.env.TABLE_NAME = "test-table";
  });

  it("calls put item once per depot", async () => {
    dynamoMock.on(PutItemCommand).resolves({});

    await storeDepots(
      [
        { depotId: "haarlem", capacity: 3400 },
        { depotId: "amsterdam", capacity: 2800 },
      ],
      "daily",
      "2026-03-09"
    );

    expect(dynamoMock.calls()).toHaveLength(2);
  });

  it("stores correct item structure", async () => {
    dynamoMock.on(PutItemCommand).resolves({});

    await storeDepots(
      [{ depotId: "haarlem", capacity: 3400 }],
      "daily",
      "2026-03-09"
    );

    const item = (dynamoMock.calls()[0].args[0].input as any).Item;
    expect(item.PK.S).toBe("DEPOT#haarlem");
    expect(item.SK.S).toBe("2026-03-09#daily");
    expect(item.capacity.N).toBe("3400");
    expect(item.depotId.S).toBe("haarlem");
  });

  it("stores weekly type correctly", async () => {
    dynamoMock.on(PutItemCommand).resolves({});

    await storeDepots(
      [{ depotId: "amsterdam", capacity: 2800 }],
      "weekly",
      "2026-03-06"
    );

    const item = (dynamoMock.calls()[0].args[0].input as any).Item;
    expect(item.depotCapacityType.S).toBe("weekly");
    expect(item.SK.S).toBe("2026-03-06#weekly");
  });

  it("daily and weekly on same date have different SKs", async () => {
    dynamoMock.on(PutItemCommand).resolves({});

    await storeDepots([{ depotId: "haarlem", capacity: 3200 }], "daily", "2026-03-06");
    await storeDepots([{ depotId: "haarlem", capacity: 3100 }], "weekly", "2026-03-06");

    const calls = dynamoMock.calls();
    const dailySK = (calls[0].args[0].input as any).Item.SK.S;
    const weeklySK = (calls[1].args[0].input as any).Item.SK.S;

    expect(dailySK).toBe("2026-03-06#daily");
    expect(weeklySK).toBe("2026-03-06#weekly");
  });

  it("does nothing for empty rows", async () => {
    dynamoMock.on(PutItemCommand).resolves({});

    await storeDepots([], "daily", "2026-03-09");

    expect(dynamoMock.calls()).toHaveLength(0);
  });

  it("throws error if database call fails", async () => {
    dynamoMock.on(PutItemCommand).rejects(new Error("DynamoDB error"));

    await expect(
      storeDepots([{ depotId: "haarlem", capacity: 3400 }], "daily", "2026-03-09")
    ).rejects.toThrow("DynamoDB error");
  });
});