import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { kvClient } from '../src/kv/redis.js'

const app = new Hono()

app.use('*', kvClient())

import APP from './app.js'
app.route('/', APP)

app.get('/', (c) => c.text('Hello Hono!'))

serve(app)

console.log('http://localhost:3000')
