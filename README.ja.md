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
- Bun, Node.jsなど。
  1. Redisサーバを起動するだけ。  
     systemdの場合: `# systemctl start redis-server`

## 使い方
Githubの[`./dev`](./dev)ディレクトリに`hono-kv-session`を使ったサンプルコードがあります。

- `kvClient()`ミドルウェアの設定
   ```js
   // "Cloudflare Workers"か"Pages Functions"を利用している場合
   import { kvClient } from 'hono-kv-session/cloudflare';
   // "bun"か"node.js"を利用している場合
   import { kvClient } from 'hono-kv-session/bun';
   // "deno"を利用している場合
   import { kvClient } from 'npm:hono-kv-session/bun';
   
   app.use('*', kvClient());
   ```

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

<!-- - セッションの更新
   ```js
   app.get('/renew', async (c) => {
     const { value, key } = c.session;
   
     // セッションを更新
     await createSession(c, user, {
       session: key // 現在のセッションキーを指定すると、そのクッキーを更新できます
     })
     
     return c.redirect('/')
   })
   ``` -->

- セッションの削除
   KV上のデータとクライアントのCookieを削除します。
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

## サポートしているキーバリューストア
- Cloudflare KV
- Redis ([node-redis](https://github.com/redis/node-redis)を使用)

## サポートしているランタイム
| 対応 | ランタイム | 動作確認 |
| --- | --- | --- |
| ✔️ | Bun | ✔️ |
| ✔️ | Cloudflare Workers | ✔️ |
| ✔️ | Cloudflare Pages (Functions) | ❌ |
| ✔️ | Node.js | ✔️ |
| ✔️ | Deno | ✔️ |
| ❌ | DenoKV |  |

## 依存関係
- [hono](https://hono.dev/)
- [node-redis](https://github.com/redis/node-redis)

## ライセンス
MIT