import { util } from "@aws-appsync/utils";
import { get } from "@aws-appsync/utils/dynamodb";

export function request(ctx) {
  const { depotId, date } = ctx.args;
  return get({
    key: {
      PK: `DEPOT#${depotId}`,
      SK: `${date}#daily`,
    },
  });
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message);
  return ctx.result;
}
