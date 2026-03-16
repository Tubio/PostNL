import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { generatedAt, intervals } = ctx.args.input;

  return {
    operation: "BatchPutItem",
    tables: {
      [ctx.env.TABLE_NAME]: intervals.map((interval) => ({
        key: {
          PK: { S: `FORECAST#${interval.depotId}` },
          SK: { S: interval.intervalStart },
        },
        attributeValues: {
          depotId: { S: interval.depotId },
          intervalStart: { S: interval.intervalStart },
          expectedParcels: { N: String(interval.expectedParcels) },
          generatedAt: { S: generatedAt },
          date: { S: interval.intervalStart.substring(0, 10) },
        },
      })),
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message);
  return true;
}
