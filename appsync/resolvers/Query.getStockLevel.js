import { util } from "@aws-appsync/utils";

export function request(ctx) {
  return {
    operation: "Invoke",
    payload: { depotId: ctx.args.depotId },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message);
  return ctx.result;
}
