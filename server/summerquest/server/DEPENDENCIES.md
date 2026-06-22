# Summer Quest — dependencies

This module's server code needs:

- `bcryptjs` — password + player code hashing
- `jsonwebtoken` — Summer Quest JWT (separate secret from any other
  JWT use in the app, via `SQ_JWT_SECRET`)

Both are already in your stack per the original spec (section 2), so
this is likely a no-op — but if either is missing from
`server/package.json`:

```bash
npm install bcryptjs jsonwebtoken --save
```

No other new dependencies are needed for Phase 1–2.
