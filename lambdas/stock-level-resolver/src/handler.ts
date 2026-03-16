import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { ContainerStock, StockLevelEvent } from "./types";

const dynamo = new DynamoDBClient({});

async function getDepotIds(): Promise<string[]> {
  const today = new Date().toISOString().split("T")[0];

  const result = await dynamo.send(new QueryCommand({
    TableName: process.env.TABLE_NAME!,
    IndexName: "date-index",
    KeyConditionExpression: "#date = :date",
    ExpressionAttributeNames: { "#date": "date" },
    ExpressionAttributeValues: { ":date": { S: today } },
  }));

  return (result.Items ?? [])
    .map((item) => unmarshall(item).depotId as string)
    .filter(Boolean);
}

async function getStockForDepot(depotId: string): Promise<ContainerStock> {
  const params: QueryCommandInput = {
    TableName: process.env.TABLE_NAME!,
    IndexName: "destination-index",
    KeyConditionExpression: "destination = :depot",
    ExpressionAttributeValues: {
      ":depot": { S: depotId },
    },
  };

  const result = await dynamo.send(new QueryCommand(params));
  const items = (result.Items ?? []).map((item) => unmarshall(item));

  const containersInTransit = items.filter((i) => i.status === "IN_TRANSIT").length;
  const containersEmpty = items.filter((i) => i.status === "EMPTY").length;
  const containersUnknown = items.filter((i) => i.status === "UNKNOWN").length;

  return {
    depotId,
    containersInTransit,
    containersEmpty,
    containersUnknown,
    asOf: new Date().toISOString(),
  };
}

export const handler = async (event: StockLevelEvent): Promise<ContainerStock | ContainerStock[]> => {
  if (event.depotId) {
    return getStockForDepot(event.depotId);
  }
  const depotIds = await getDepotIds();
  return Promise.all(depotIds.map(getStockForDepot));
};