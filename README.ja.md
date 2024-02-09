## サポートしているキーバリューストア
- Cloudflare KV
- Redis ([node-redis](https://github.com/redis/node-redis)を使用)
- Deno KV
- **New!** Cloudflare D1 (sqlite)

## サポートしているランタイム
| 対応 | ランタイム | 動作確認 |
| --- | --- | --- |
| ✔️ | Bun | ✔️ |
| ✔️ | Cloudflare Workers | ✔️ |
| ✔️ | Cloudflare Pages (Functions) |  |
| ✔️ | Node.js | ✔️ |
| ✔️ | Deno (with Redis) | ✔️ |
| ✔️ | Deno KV | ✔️ |

## インストール
```
npm install hono-kv-session
```

## KVのセットアップ
- Cloudflare Workers
  1. バインド名が`SESSION`のKVネームスペースを`wrangler`で作成します。  
     `$ wrangler kv:namespace create SESSION`
  2. `1.`で生成されたUUIDを`wrangler.toml`に設定します。  
     こんな感じ: `{ binding = "SESSION", id = "b80d8fc5924d43ba85b56aa6b6dbb1c3" }`
- Bun, Node.js, Denoなど
  1. Redisサーバを起動するだけ。  
     systemdの場合: `# systemctl start redis-server`
- Deno KV  
  **[Deno KVは現在ベータ版です](https://docs.deno.com/kv/manual)**  
  このように、Denoプログラムに`--unstable`フラグを付けて実行してください。  
  ```bash
  $ deno run --allow-net --watch --unstable app.ts
  ```
- Cloudflare D1
  1. D1データベースを作成します
     `$ wrangler d1 create session-db`
  2. `wrangler.toml`の`database_id`を**1.**で出力されたIDと置き換えます
     ```toml
     [[ d1_databases ]]
     binding = "SESSION_DB"
     database_name = "session-db"
     database_id = "<ここにIDを入力します>"
     preview_database_id = "local"
     ```
  3. `$ npm run d1:init`を実行します

## 使い方
Githubの[`./dev`](./dev)ディレクトリに`hono-kv-session`を使ったサンプルコードがあります。

### KVクライアント
- **Cloudflare Workers, Cloudflare Pages**
  ```js
  import { kvClient } from 'hono-kv-session/cloudflare';
  app.use('*', kvClient());
  ```

- **Node.js, Bun, Deno (with Redis)**
  ```js
  import { kvClient } from 'hono-kv-session/redis';
  app.use('*', kvClient());

  // もしくは、node-redisのcreateClient()のオプションを指定できます
  app.use('*', kvClient({
    url: 'redis://alice:foobared@awesome.redis.server:6380'
  }));
  ```

- **Deno KV**
  ```js
  import { kvClient } from 'https://deno.land/x/hono_kv_session/kv/denokv.js';
  app.use('*', kvClient());
  ```

- **Cloudflare D1**
  ```js
  import { kvClient } from 'hono-kv-session/d1';
  app.use('*', kvClient());
  ```

### SessionManagerを利用する

- `SessionManager()`ミドルウェアの設定
   ```js
   import { SessionManager, createSession, deleteSession } from 'hono-kv-session' // Denoを利用している場合、モジュール名を'npm:hono-kv-session'に置き換えてください
   
   app.use('*', SessionManager({
     // Cookieの名前
     name: 'session_cookie' // デフォルト: 'id'
   
     // HonoのSigned cookie用のシークレット
     secret: 'Strong_Secret_123' // デフォルト: null

     // セッションのTTL（有効期限の秒数）。 KVとCookieの両方に設定される。 最低値は60（下回る場合は60に設定）
     ttl: 60, // デフォルト: 604800 (一週間)

     // アクセス毎にセッションの有効期限(TTL)を延長する。
     renew: true, // デフォルト: true

     // アクセス毎にセッションIDを再生成する。
     regenerate: true, // デフォルト: false
   }))
   ```
   - `secret`にはHonoのSigned cookie用のシークレットを設定します （ただし、この機能は動作未確認です）。  
     Signed Cookieの詳細は、Honoの[Cookie Helper](https://hono.dev/helpers/cookie)ドキュメントを参照してください。

- セッションデータを取得
   ```js
   app.get('/', async (c) => {
     const { value, key, name, status } = c.session;
     return c.json({
       username: value,
       session_id: key, // デフォルト: crypto.randomUUID() で設定されたUUID
       cookie_id: name,
       status,
     })
   })
   ```

- アクセス拒否
  `denyAccess()`ミドルウェアを挟まないと、不正なセッションを拒否せずアクセスされてしまいます。
  `c.session.status = true|false`を参照することで、特定のルートやHTTPメソッドのみを対象としたアクセス制限が可能です。
  ```js
  import { denyAccess } from 'hono-kv-session';

  // If JSON
  app.use('*', denyAccess({
    type: 'json', // 'json' or 'html' or 'text'
    status: 401, // status code
    response: { status: false, message: 'Invalid session' }
  }))

  // If HTML
  app.use('*', denyAccess({
    type: 'html', // 'json' or 'html' or 'text'
    status: 401, // status code
    response: '<p>Invalid session</p>'
  }));
  ```

- セッションの作成
   ```js
   app.post('/login', async (c) => {
     // FormDataからユーザ名を取得
     const { user } = await c.req.parseBody()
   
     // セッションを作成
     await createSession(c, user, {
       secret: 'Strong_Secret_123'// Signed Cookieを使う場合はsecretを設定して
     })
   
     return c.redirect('/')
   })
   ```

- セッションの更新
   ```js
   app.post('/renew', async (c) => {
     await renewSession(c)
     return c.redirect('/')
   })
   ```

- セッションの削除
   ```js
   app.post('/logout', async (c) => {
     await deleteSession(c)
     return c.redirect('/')
   })
   ```

## セッションの形式
- KVストア: `session:<ホスト名>:<uuid>` と `value`  
  キー: `session:www.example.com:49b0b962-5b95-43c6-9e00-94ce1313d0ed`  
  値: `user01`  
- Cookie: `id=49b0b962-5b95-43c6-9e00-94ce1313d0ed`  
- `c.session`の中身  
  ```js
  c.session = {
    session: 'user01' // KVの値
    key: `49b0b962-5b95-43c6-9e00-94ce1313d0ed` // KVのキー
    name: 'id' // Cookieの名前
  }
  ```

## 依存関係
- [hono](https://hono.dev/)
- [node-redis](https://github.com/redis/node-redis)

## ライセンス
MIT