# hono-kv-session
Stateful session middleware for [Hono](https://hono.dev/). Works on Cloudflare Workers, Node.js, Bun, etc.

ステートフルなセッションを提供するHonoのミドルウェアです。Cloudflare WorkersやNode.js、Bunなどの環境で動作します。

[日本語版ドキュメント](./README.ja.md)

## Installation
```
npm install hono-kv-session
```

## Setup KV
- Cloudflare Workers
  1. Create KV namespace the bind name `SESSION`.  
     `$ wrangler kv:namespace create SESSION`
  2. Set the UUID of the KV namespace generated in `1.` to `wrangler.toml`.  
     Like, `{ binding = "SESSION", id = "b80d8fc5924d43ba85b56aa6b6dbb1c3" }`
- Bun, Node.js, etc.
  1. Just start the Redis server.  
     For systemd: `# systemctl start redis-server`

## Usage
You can see the sample code in the [`./dev`](./dev) directory in Github.

1. Set `kvClient()` middleware.
   ```js
   // If you are using "Cloudflare Workers" or "Pages Functions".
   import { kvClient } from 'hono-kv-session/cloudflare';
   // If you are using "bun" or "node.js".
   import { kvClient } from 'hono-kv-session/bun';
   
   app.use('*', kvClient());
   ```

2. Set `SessionManager()` middleware.
   ```js
   import { SessionManager, createSession, deleteSession } from 'hono-kv-session'
   
   app.use('*', SessionManager({
     // Cookie's id
     name: 'session_cookie' // Default: 'id'
   
     // Secret for Hono's signed cookies
     secret: 'Strong_Secret_123' // Default: null
   }))
   ```
   - `secret` is secret of Hono's signed cookies (This feature has untested).  
     See Hono's [Cookie Helper](https://hono.dev/helpers/cookie) documentation for details.

3. Get session data
   ```js
   app.get('/', async (c) => {
     const { value, key, name } = c.session;
     return c.json({
       username: value,
       session_id: key, // Default: crypto.randomUUID()'s uuid
       cookie_id: name,
     })
   })
   ```

4. Create session
   ```js
   app.post('/login', async (c) => {
     // Extract client's username from FormData
     const { user } = await c.req.parseBody()
   
     // Create session
     await createSession(c, user, {
       ttl: 86400, // Session TTL. Set for both KV and cookies. Minimum 60.
       secret: 'Strong_Secret_123'// If you are using signed cookie
     })
   
     return c.redirect('/')
   })
   ```

5. Renewal session
   ```js
   app.get('/renew', async (c) => {
     const { value, key } = c.session;
   
     // Renewal session
     await createSession(c, user, {
       ttl: 86400, // Session TTL. Set for both KV and cookies. Minimum 60.
       session: key // You can update it by setting the current session key.
     })
     
     return c.redirect('/')
   })
   ```

6. Delete session
   ```js
   app.post('/logout', async (c) => {
     await deleteSession(c)
     return c.redirect('/')
   })
   ```

## Session Format
- in Key-Value store: `session:<hostname>:<uuid>` and `value`  
  Key: `session:www.example.com:49b0b962-5b95-43c6-9e00-94ce1313d0ed`  
  Value: `user01`  
- in Cookie: `id=49b0b962-5b95-43c6-9e00-94ce1313d0ed`  
- in `c.session`  
  ```js
  c.session = {
    session: 'user01' // KV value
    key: `49b0b962-5b95-43c6-9e00-94ce1313d0ed` // KV key
    name: 'id' // Cookie name
  }
  ```

## Supported Key-Value stores
- Cloudflare KV
- Redis (with [node-redis](https://github.com/redis/node-redis))

## Supported Runtimes
| Supported | Runtime | Tested |
| --- | --- | --- |
| ✔️ | Bun | ✔️ |
| ✔️ | Cloudflare Workers | ✔️ |
| ✔️ | Cloudflare Pages (Functions) | ❌ |
| ✔️ | Node.js | ❌ |
| ❌ | Deno |  |

## Dependecies
- [hono](https://hono.dev/)
- [node-redis](https://github.com/redis/node-redis)

## License
MIT