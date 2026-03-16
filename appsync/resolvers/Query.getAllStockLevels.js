import { util } from "@aws-appsync/utils";

export function request(ctx) {
  return {
    operation: "Invoke",
    payload: {},
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message);
  return ctx.result;
}
