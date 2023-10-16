import { Hono } from 'hono'
import { getRuntimeKey } from 'hono/adapter'
import { SessionManager, createSession, deleteSession, renewSession, regenerateSession } from '../src'

const app = new Hono()

app.use('*', SessionManager({
  ttl: 60,
  renew: false,
  // regenerate: true,
}))

app.get('/', async (c) => {
  const { value: user } = c.session
  const runtime = getRuntimeKey()

  let keys, kvLists;

  if (runtime === 'workerd') {
    keys = (await c.kv.list()).keys;

    kvLists = await Promise.all(
      keys.map(async ({ name, expiration }) => {
        const value = await c.kv.get(name)

        const timestamp = expiration * 1000
        const date = new Date(timestamp)
        const now = Date.now()

        return [ name, value, date.toISOString(), (date - now) / 1000 ]
      })
    )
  } else {
    keys = await c.kv.keys('*');

    kvLists = await Promise.all(
      keys.map(async (name) => {
        const [ expiration, value ] = await c.kv.multi().ttl(name).get(name).exec()

        const now = Date.now()
        const date = new Date(now + (expiration * 1000)).toISOString()

        return [ name, value, date, expiration ]
      })
    )
  }

  return c.html(
    <div>
      <h1>hono-kv-session Demo</h1>
      <ul>
        <li>Source Code: <a href="https://github.com/shinosaki/hono-kv-session">Github</a></li>
        <li>Author: <a href="https://shinosaki.com">@shinosaki</a></li>
      </ul>
      <form method="POST">
        <input name="user" placeholder="username" />
        <button>Get Session</button>
        <p>{(user) ? `User: ${user}` : 'Session not found'}</p>
        <hr />
        <h2>KV DATA</h2>
        <table>
          <thead>
            <tr>
              <th>KV Key</th>
              <td>KV Value</td>
              <td>Expiration Date (after n sec)</td>
            </tr>
          </thead>
          <tbody>
            {kvLists.map(([ key, data, expire, diff ]) => 
              <tr>
                <th>{key}</th>
                <td>{data}</td>
                <td>{expire} ({diff})</td>
              </tr>
            )}
          </tbody>
        </table>
      </form>
      <hr />
      <form action="/delete" method="POST">
        <button>Delete Session</button>
      </form>
      <form action="/renew" method="POST">
        <button>Renew Session</button>
      </form>
      <form action="/regen" method="POST">
        <button>Regenerate Session</button>
      </form>
    </div>
  )
})

app.post('/', async (c) => {
  const { user } = await c.req.parseBody()
  await createSession(c, user)
  return c.redirect('/')
})

app.post('/delete', async (c) => {
  await deleteSession(c)
  return c.redirect('/')
})

app.post('/renew', async (c) => {
  await renewSession(c)
  return c.redirect('/')
})

app.post('/regen', async (c) => {
  await regenerateSession(c)
  return c.redirect('/')
})

export default app
