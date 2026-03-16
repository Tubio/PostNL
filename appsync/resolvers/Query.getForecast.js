import { util } from "@aws-appsync/utils";
import { query } from "@aws-appsync/utils/dynamodb";

export function request(ctx) {
  const { depotId, date } = ctx.args;
  return query({
    query: {
      expression: "PK = :pk AND begins_with(SK, :date)",
      expressionValues: {
        ":pk": `FORECAST#${depotId}`,
        ":date": date,
      },
    },
  });
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message);
  return ctx.result.items;
}
