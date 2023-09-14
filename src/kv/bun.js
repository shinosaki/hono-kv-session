import { createClient } from "redis";

export const kvClient = () => {
  return async (c, next) => {
    c.kv = createClient();
    await c.kv.connect();

    await next()
  }
}
