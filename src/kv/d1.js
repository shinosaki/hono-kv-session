export const kvClient = () => {
  return async (c, next) => {
    c.kv = c.env.SESSION_DB
    c.kvType = 'd1'
    await next()
  }
}
