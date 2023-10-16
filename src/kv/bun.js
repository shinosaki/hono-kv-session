import { createClient } from "redis"

export const kvClient = (options = {}) => {
  return async (c, next) => {
    c.kv = createClient(options)
    c.kvType = 'redis'
    await c.kv.connect()

    await next()
  }
}
