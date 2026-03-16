import { util } from "@aws-appsync/utils";
import { query } from "@aws-appsync/utils/dynamodb";

export function request(ctx) {
  const { date } = ctx.args;
  return query({
    index: "date-index",
    query: {
      expression: "#date = :date",
      expressionNames: { "#date": "date" },
      expressionValues: { ":date": date },
    },
  });
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message);
  return ctx.result.items;
}
