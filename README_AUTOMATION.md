Quick start (local)

1. Clone this repo and copy `.env.example` → `.env` with values:
   - `WEBHOOK_SECRET` (random string)
   - `GITHUB_TOKEN` (test PAT with issues write scope)

2. Install and run:

```bash
npm install
WEBHOOK_SECRET=shh GITHUB_TOKEN=ghp_xxx npm start
```

3. Expose locally with ngrok:

```bash
ngrok http 3000
```

4. Create a webhook in your GitHub repo (Settings → Webhooks):
   - Payload URL: `https://<NGROK_HOST>/webhook`
   - Content type: `application/json`
   - Secret: same as `WEBHOOK_SECRET`
   - Events: select `Issues` (or Issues -> opened)

5. Open an issue; the service will post an acknowledgement comment.

Notes

- For production use a GitHub App (preferred) instead of a PAT.
- Keep `WEBHOOK_SECRET` and tokens in secret store (do not commit `.env`).
- The script adds a marker comment (`<!-- ciam-ack -->`) to avoid duplicates.
