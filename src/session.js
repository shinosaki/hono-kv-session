import { HTTPException } from 'hono/http-exception'
import { getCookie, getSignedCookie, setCookie, setSignedCookie, deleteCookie } from 'hono/cookie'

export const SessionManager = (options = {}) => {
  const {
    name = 'id',
    ttl = 604800, // 1 week
    secret,
    renew = true,
    regenerate,
  } = options

  return async (c, next) => {
    c.session = { name }
    const url = new URL(c.req.url)
    const { kv } = c

    if (!kv) {
      throw new HTTPException(500, { message: 'SessionManager Error: Key-Value store not available' }) 
    }

    c.session.ttl = ttl
    c.session.key = (secret) ? await getSignedCookie(c, secret, name) : getCookie(c, name)
    if (c.session.key) {
      switch (c.kvType) {
        case 'cloudflare':
        case 'redis':
          c.session.value = await kv.get(`session:${url.hostname}:${c.session.key}`)
          break

        case 'denokv':
          const entry = await kv.get(['session', url.hostname, c.session.key]);
          c.session.value = entry.value;
          break

        default:
          throw new Error('Invalid kvType')
      }
    }

    c.session.status = (!c.session.value) ? false : true;

    if (regenerate) {
      await regenerateSession(c)
    } else if (renew) {
      renewSession(c)
    }

    await next();
  }
}

export const denyAccess = (options = {}) => {
  const {
    type = 'json',
    status = 401,
    response = { status: false, message: 'Invalid session' }
  } = options;

  return async (c, next) => {
    if (!c.session.status) {
      return c[type](response, status);
    };

    await next();
  }
}

export const createSession = async (c, value, options = {}) => {
  let {
    session = crypto.randomUUID(),
    secret
  } = options;

  const { kv } = c
  const url = new URL(c.req.url)

  if (c.session.ttl < 60) {
    c.session.ttl = 60
  }

  switch (c.kvType) {
    case 'cloudflare':
      await kv.put(`session:${url.hostname}:${session}`, value, { expirationTtl: c.session.ttl })
      break

    case 'redis':
      await kv.set(`session:${url.hostname}:${session}`, value, { EX: c.session.ttl })
      break

    case 'denokv':
      await kv.set(['session', url.hostname, session], value, { expireIn: c.session.ttl * 1000 })
      break

    default:
      throw new Error('Invalid kvType')
  }

  const cookieOptions = {
    path: '/',
    secure: true,
    domain: url.hostname,
    httpOnly: true,
    maxAge: c.session.ttl,
    // expires: ,
    sameSite: 'Strict',
  }

  if (secret) {
    setSignedCookie(c, c.session.name, session, secret, cookieOptions)
  } else {
    setCookie(c, c.session.name, session, cookieOptions)
  }

  return session
}

export const deleteSession = async (c) => {
  const { kv } = c
  const { name, key } = c.session
  const url = new URL(c.req.url)

  switch (c.kvType) {
    case 'cloudflare':
      await kv.delete(`session:${url.hostname}:${key}`)
      break

    case 'redis':
      await kv.del(`session:${url.hostname}:${key}`)
      break

    case 'denokv':
      await kv.delete(['session', url.hostname, key])
      break

    default:
      throw new Error('Invalid kvType')
  }

  deleteCookie(c, name, {
    path: '/',
    secure: true,
    domain: url.hostname,
  })

  return true
}

export const renewSession = async (c) => {
  const { status, value, ttl, key } = c.session;

  if (status) {
    await createSession(c, value, { ttl, session: key });
  }

  return true
}

export const regenerateSession = async (c) => {
  const { status, value, ttl } = c.session;

  if (status) {
    await deleteSession(c);
    await createSession(c, value, { ttl });
  }

  return true
}
