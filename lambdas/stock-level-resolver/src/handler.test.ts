import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "./handler";

const dynamoMock = mockClient(DynamoDBClient);

function makeContainer(containerId: string, destination: string, status: string) {
  return {
    PK: { S: `RC#${containerId}` },
    ...marshall({ destination, status, iotUpdatedAt: "2026-03-09T10:00:00.000Z" }),
  };
}

describe("stock-level-resolver handler", () => {
  beforeEach(() => {
    dynamoMock.reset();
    process.env.TABLE_NAME = "test-table";
  });

  describe("stock level for single depot", () => {
    it("returns stock counts for a depot", async () => {
      dynamoMock.on(QueryCommand).resolves({
        Items: [
          makeContainer("1", "haarlem", "IN_TRANSIT"),
          makeContainer("2", "haarlem", "IN_TRANSIT"),
          makeContainer("3", "haarlem", "EMPTY"),
          makeContainer("4", "haarlem", "UNKNOWN"),
        ],
      });

      const result = await handler({ depotId: "haarlem" }) as any;

      expect(result.depotId).toBe("haarlem");
      expect(result.containersInTransit).toBe(2);
      expect(result.containersEmpty).toBe(1);
      expect(result.containersUnknown).toBe(1);
    });

    it("queries correct GSI with depotId", async () => {
      dynamoMock.on(QueryCommand).resolves({ Items: [] });

      await handler({ depotId: "haarlem" });

      const input = dynamoMock.calls()[0].args[0].input as any;
      expect(input.IndexName).toBe("destination-index");
      expect(input.ExpressionAttributeValues[":depot"].S).toBe("haarlem");
    });

    it("returns zero counts when no containers found", async () => {
      dynamoMock.on(QueryCommand).resolves({ Items: [] });

      const result = await handler({ depotId: "haarlem" }) as any;

      expect(result.containersInTransit).toBe(0);
      expect(result.containersEmpty).toBe(0);
      expect(result.containersUnknown).toBe(0);
    });

    it("includes asOf timestamp", async () => {
      dynamoMock.on(QueryCommand).resolves({ Items: [] });

      const before = new Date().toISOString();
      const result = await handler({ depotId: "haarlem" }) as any;
      const after = new Date().toISOString();

      expect(result.asOf >= before).toBe(true);
      expect(result.asOf <= after).toBe(true);
    });
  });

  describe("stock level for all depots", () => {
    function makeCapacityItem(depotId: string) {
      return marshall({ depotId, capacity: 3000, date: new Date().toISOString().split("T")[0] });
    }

    it("returns stock for all depots found in DynamoDB", async () => {
      dynamoMock
        .on(QueryCommand, { IndexName: "date-index" })
        .resolves({
          Items: [makeCapacityItem("haarlem"), makeCapacityItem("amsterdam")],
        })
        .on(QueryCommand, { IndexName: "destination-index" })
        .resolves({ Items: [] });

      const result = await handler({}) as any[];

      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.depotId)).toEqual(["haarlem", "amsterdam"]);
    });

    it("queries DynamoDB once for depots + once per depot for stock", async () => {
      dynamoMock
        .on(QueryCommand, { IndexName: "date-index" })
        .resolves({
          Items: [makeCapacityItem("haarlem"), makeCapacityItem("amsterdam")],
        })
        .on(QueryCommand, { IndexName: "destination-index" })
        .resolves({ Items: [] });

      await handler({});

      expect(dynamoMock.calls()).toHaveLength(3);
    });

    it("returns empty array when no depots found", async () => {
      dynamoMock
        .on(QueryCommand, { IndexName: "date-index" })
        .resolves({ Items: [] });

      const result = await handler({}) as any[];

      expect(result).toHaveLength(0);
    });

    it("aggregates containers correctly per depot", async () => {
      dynamoMock
        .on(QueryCommand, { IndexName: "date-index" })
        .resolves({
          Items: [makeCapacityItem("haarlem"), makeCapacityItem("amsterdam")],
        })
        .on(QueryCommand, {
          ExpressionAttributeValues: { ":depot": { S: "haarlem" } },
        })
        .resolves({
          Items: [
            makeContainer("1", "haarlem", "IN_TRANSIT"),
            makeContainer("2", "haarlem", "IN_TRANSIT"),
          ],
        })
        .on(QueryCommand, {
          ExpressionAttributeValues: { ":depot": { S: "amsterdam" } },
        })
        .resolves({
          Items: [makeContainer("3", "amsterdam", "EMPTY")],
        });

      const result = await handler({}) as any[];
      const haarlem = result.find((r: any) => r.depotId === "haarlem");
      const amsterdam = result.find((r: any) => r.depotId === "amsterdam");

      expect(haarlem.containersInTransit).toBe(2);
      expect(amsterdam.containersEmpty).toBe(1);
    });
  });
});