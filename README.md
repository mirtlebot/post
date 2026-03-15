![Logo](logo.webp)

[Go version API server](https://github.com/mirtlecn/post-go) | [CLI client](https://github.com/mirtlecn/post-cli) | [Skills for AI Agents](https://github.com/mirtlecn/post-cli/tree/master/skills)

# Post

Lightweight file, text, URL, HTML, and topic sharing service with a local admin UI.

## Routes

- Public read: `GET /<path>`
- Management API: `GET|POST|PUT|DELETE /`
- Admin UI: `/admin`
- Admin API: `/api/admin`
- Admin session: `/api/admin/session`

## Data model

All content is stored in Redis as JSON under `surl:<path>`:

```json
{
  "type": "text",
  "content": "hello",
  "title": "Greeting"
}
```

Stored runtime types:

- `url`
- `text`
- `html`
- `file`
- `topic`

Write-time aliases:

- `md2html` stores `type=html`
- `qrcode` stores `type=text`
- `convert` is accepted as an alias of `type`

Topic storage:

- topic home: `surl:<topic>`
- topic members: `surl:<topic>/<relative-path>`
- topic index: `topic:<topic>:items`
- empty topics keep `__topic_placeholder__` in the zset

File read cache:

- `cache:file:<path>`
- `cache:filemeta:<path>`

## Admin UI

The admin UI is available at `http://localhost:<PORT>/admin`.

When running through `vercel dev`, `GET /admin` redirects to `/admin/`.

Login password:

- `ADMIN_KEY`, if set
- otherwise `SECRET_KEY`

Development mode:

- `npm run dev:web` starts Vite on port `5173`
- the Vite dev server proxies `'/api/admin'` to:
  - `POST_ADMIN_API_TARGET`, when set
  - otherwise `http://127.0.0.1:${PORT:-3000}`

This keeps the frontend aligned with the same local API port used by `npm start`.

## HTTP API

Write operations require:

```text
Authorization: Bearer <SECRET_KEY>
```

Suggested shell variables:

```bash
export POST_BASE_URL="http://localhost:3000"
export POST_TOKEN="demo"
```

### Create a regular item

```bash
curl "$POST_BASE_URL" \
  -X POST \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "note",
    "url": "hello",
    "type": "text",
    "title": "Greeting",
    "ttl": 10
  }'
```

Notes:

- `ttl` unit is minutes
- `ttl = 0` means no expiration
- invalid TTL returns `400 invalid_request`

### Create rendered HTML from Markdown

```bash
curl "$POST_BASE_URL" \
  -X POST \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "docs/readme",
    "url": "# Title\n\nHello from Markdown",
    "type": "md2html",
    "title": "Readme"
  }'
```

### Upload a file

```bash
curl "$POST_BASE_URL" \
  -X POST \
  -H "Authorization: Bearer $POST_TOKEN" \
  -F "file=@./photo.jpg" \
  -F "path=uploads/photo"
```

File uploads require configured S3-compatible storage.

### Create a topic

```bash
curl "$POST_BASE_URL" \
  -X POST \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "anime",
    "type": "topic"
  }'
```

### Create a topic member

```bash
curl "$POST_BASE_URL" \
  -X POST \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "anime",
    "path": "castle-notes",
    "url": "# Castle\n\nHello",
    "type": "md2html",
    "title": "Castle Notes"
  }'
```

Or use a full path directly:

```bash
curl "$POST_BASE_URL" \
  -X POST \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "anime/castle-notes",
    "url": "# Castle\n\nHello",
    "type": "md2html",
    "title": "Castle Notes"
  }'
```

### Update an item

```bash
curl "$POST_BASE_URL" \
  -X PUT \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "note",
    "url": "updated body",
    "type": "text"
  }'
```

### Refresh a topic

```bash
curl "$POST_BASE_URL" \
  -X PUT \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "anime",
    "type": "topic"
  }'
```

This rebuilds the topic home and removes stale topic members.

### List all items

```bash
curl "$POST_BASE_URL" \
  -H "Authorization: Bearer $POST_TOKEN"
```

### List all topics

```bash
curl "$POST_BASE_URL" \
  -X GET \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"topic"}'
```

### Lookup one item

```bash
curl "$POST_BASE_URL" \
  -X GET \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"note"}'
```

### Lookup one topic

```bash
curl "$POST_BASE_URL" \
  -X GET \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"anime","type":"topic"}'
```

### Export full content

The `x-export: true` header is supported on:

- create
- update
- delete
- lookup
- list

Example:

```bash
curl "$POST_BASE_URL" \
  -X GET \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-export: true" \
  -d '{"path":"note"}'
```

### Delete an item

```bash
curl "$POST_BASE_URL" \
  -X DELETE \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"note"}'
```

### Delete a topic

```bash
curl "$POST_BASE_URL" \
  -X DELETE \
  -H "Authorization: Bearer $POST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"anime","type":"topic"}'
```

## Public reads

Public route:

```text
GET /<path>
```

Behavior by stored type:

- `url`: `302` redirect
- `text`: `text/plain`
- `html`: `text/html`
- `file`: streamed from S3 or cache
- `topic`: topic home HTML

Public responses set:

```text
Cache-Control: public, max-age=86400, s-maxage=86400
```

Authenticated JSON responses do not set public cache headers.

## Local development

Prerequisites:

- Node.js 24+
- Redis
- S3-compatible storage if file uploads are needed

Install:

```bash
npm install
cp .env.example .env.local
```

Run the local integrated app:

```bash
npm start
```

Default local URL:

- `http://localhost:3000/admin`

Run API and Vite separately:

```bash
npm run dev:api
npm run dev:web
```

## Environment variables

Required:

- `LINKS_REDIS_URL`
- `SECRET_KEY`

Optional:

- `ADMIN_KEY`
- `PORT`
- `POST_ADMIN_API_TARGET`
- `MAX_CONTENT_SIZE_KB`
- `MAX_FILE_SIZE_MB`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_REGION`

Redis notes:

- use `rediss://` for TLS-enabled providers
- use `redis://` only for non-TLS Redis

## Tests

Unit tests:

```bash
npm test
```

Unified API functional smoke:

```bash
npm run test:functional:api:local
```

Admin UI and local integration smoke:

```bash
npm run test:functional:local
```

Vercel integration smoke:

```bash
npm run test:functional:vercel
```

The Vercel smoke follows the real local `vercel dev` behavior:

- `GET /admin` returns a redirect to `/admin/`
- `/admin/*` is served by the frontend dev server

## Related projects

- [CLI client](https://github.com/mirtlecn/post-cli)
- [Go version API server](https://github.com/mirtlecn/post-go)

## License

MIT

© Mirtle together with OpenAI Codex
