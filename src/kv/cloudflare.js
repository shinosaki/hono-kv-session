export const kvClient = () => {
  return async (c, next) => {
    c.kv = c.env.SESSION
    c.kvType = 'cloudflare'
    await next()
  }
}
