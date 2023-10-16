import { Hono } from 'hono'
import { kvClient } from '../src/kv/redis'

const app = new Hono()

app.use('*', kvClient())

import APP from './app'
app.route('/', APP)

export default app
