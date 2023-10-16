export const kvClient = (options = {}) => {
  return async (c, next) => {
    c.kv = await Deno.openKv()
    c.kvType = 'denokv'

    await next()
  }
}
