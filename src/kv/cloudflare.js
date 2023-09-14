export const kvClient = () => {
  return async (c, next) => {
    c.kv = c.env.SESSION
    await next()
  }
}
