import { Hono } from 'hono'
import { kvClient } from '../src/kv/d1'

const app = new Hono()

app.use('*', kvClient())

import APP from './app'
app.route('/', APP)

export default app
