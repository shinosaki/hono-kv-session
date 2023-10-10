import { createClient } from "redis"

export const kvClient = (options = {}) => {
  return async (c, next) => {
    c.kv = createClient(options)
    await c.kv.connect()

    await next()
  }
}
