<div align="center">

# meet-id

**A self-hosted OpenID Connect Identity Provider**

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat-square&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](./LICENSE)

</div>

---

## Overview

**meet-id** is a OpenID Connect (OIDC) Identity Provider you can self-host. Register your applications, let users sign in once, and let any of your services verify their identity via standard OIDC tokens — no third-party auth vendor required.

It implements the full **Authorization Code Flow** with RS256-signed ID tokens, HMAC access tokens, and bcrypt-hashed refresh tokens, with a built-in consent UI.

---

## Features

- **Full OIDC Authorization Code Flow** — authorization, token exchange, userinfo endpoint
- **OIDC Discovery** — `.well-known/openid-configuration` & `.well-known/jwks.json`
- **RSA-signed ID Tokens** — RS256 via `node-jose`; public key exposed at `/jwks.json` for client verification
- **Developer Portal** — register and manage OAuth applications with redirect URL allowlists
- **Consent UI** — EJS-rendered consent page with approve/deny; auto-approved on repeat visits
- **Secure token storage** — auth codes stored as SHA-256 hashes (5-min TTL, single-use); refresh tokens as bcrypt hashes (30-day TTL)
- **Helmet + CORS + Zod** — hardened HTTP headers, configurable origins, and validated request schemas throughout

---

## Tech Stack

| Layer           | Technology                  |
| --------------- | --------------------------- |
| Runtime         | Node.js (ESM)               |
| Language        | TypeScript 6                |
| Framework       | Express 5                   |
| Database        | PostgreSQL 17               |
| ORM             | Drizzle ORM                 |
| Tokens          | `jsonwebtoken`, `node-jose` |
| Validation      | Zod 4                       |
| Templating      | EJS 5                       |
| Package Manager | pnpm                        |

---

## Architecture

```
Browser / Client App
       │
       ▼
  Express App (app.ts)
       │
       ├─ AuthMiddleware          — decodes accessToken cookie or Bearer header → req.user
       ├─ GET /oidc/authorize     — consent check → show EJS page or auto-redirect
       ├─ POST /oidc/authorize    — user approves/denies → redirect with auth code
       │
       ├─ POST /api/v1/oidc/token      — exchange auth code for access + id + refresh tokens
       ├─ GET  /api/v1/oidc/userinfo   — return standard OIDC claims (Bearer required)
       ├─ GET  /api/v1/oidc/authenticate  — check consent status for a user+app pair
       ├─ POST /api/v1/oidc/consent       — generate auth code via API (no redirect)
       │
       ├─ /api/v1/auth           — register, login, logout, refresh
       ├─ /api/v1/user           — user profile management
       ├─ /api/v1/application    — CRUD for registered OAuth applications
       │
       ├─ GET /.well-known/openid-configuration
       └─ GET /.well-known/jwks.json
```

---

## Database Schema

```
user               → platform accounts (id, email, firstName, lastName, avatar)
applications       → registered OAuth apps (clientId, clientSecret hash, redirectURL[])
authorization      → short-lived auth codes (codeHash, 5-min TTL, single-use)
app_access         → consent records + refresh token hashes per user per app (30-day TTL)
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10
- Docker (for PostgreSQL)

### 1. Clone & install

```bash
git clone https://github.com/thatsmanmeet/meet-id.git
cd meet-id
pnpm install
```

### 2. Generate RSA key pair

```bash
bash key-gen.sh
```

This writes `cert/private-key.pem` and `cert/public-key.pub`.

### 3. Configure environment

Create a `.env` file at the project root:

```env
PORT=8055
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meetId

ACCESS_TOKEN=your-hmac-access-token-secret
REFRESH_TOKEN=your-hmac-refresh-token-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d

CORS_ORIGIN=http://localhost:3000
```

### 4. Start the database

```bash
docker compose up -d
```

### 5. Run migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 6. Start the server

```bash
# development (watch mode)
pnpm dev

# production
pnpm build && pnpm start
```

The server starts at `http://localhost:8055`.

---

## OIDC Flow

```
1. Client app redirects user to:
   GET /oidc/authorize?client_id=<id>&redirect_uri=<uri>&state=<random>

2. User logs in (if not already), sees consent page, approves.

3. meet-id redirects back to client:
   <redirect_uri>?code=<auth_code>&state=<state>

4. Client backend exchanges code for tokens:
   POST /api/v1/oidc/token
   { client_id, client_secret, code, redirect_uri }

5. Response:
   { access_token, id_token, refresh_token, token_type: "Bearer" }

6. Client verifies id_token signature using:
   GET /.well-known/jwks.json

7. Client fetches user profile:
   GET /api/v1/oidc/userinfo
   Authorization: Bearer <access_token>
```

---

## API Reference

### Auth

| Method | Endpoint                | Description                      |
| ------ | ----------------------- | -------------------------------- |
| `POST` | `/api/v1/auth/register` | Create a new account             |
| `POST` | `/api/v1/auth/login`    | Login, receive tokens as cookies |
| `POST` | `/api/v1/auth/logout`   | Clear session                    |
| `POST` | `/api/v1/auth/refresh`  | Rotate access token              |

### OIDC

| Method | Endpoint                    | Auth   | Description                        |
| ------ | --------------------------- | ------ | ---------------------------------- |
| `GET`  | `/oidc/authorize`           | Cookie | Show consent page or auto-redirect |
| `POST` | `/oidc/authorize`           | Cookie | Approve / deny consent             |
| `POST` | `/api/v1/oidc/token`        | None   | Exchange code for tokens           |
| `GET`  | `/api/v1/oidc/userinfo`     | Bearer | Standard OIDC user claims          |
| `GET`  | `/api/v1/oidc/authenticate` | Bearer | Check consent status               |
| `POST` | `/api/v1/oidc/consent`      | Bearer | Generate auth code via API         |
| `GET`  | `/api/v1/oidc/app-info`     | None   | Get application metadata           |

### Discovery

| Endpoint                                | Description                 |
| --------------------------------------- | --------------------------- |
| `GET /.well-known/openid-configuration` | OIDC metadata document      |
| `GET /.well-known/jwks.json`            | RSA public key (JWK format) |

---

## Security

- **Client secrets** — stored as SHA-256 hashes
- **Auth codes** — stored as SHA-256 hashes; raw value is one-way through redirect URL only; expires in 5 minutes; single-use enforced via `usedAt`
- **Refresh tokens** — stored as bcrypt hashes (cost 12); 30-day TTL
- **ID tokens** — RS256-signed with `cert/private-key.pem`; clients verify against public key at `/jwks.json`
- **Access tokens** — HMAC-signed JWT with symmetric secret
- **Redirect URI validation** — every token exchange validates `redirect_uri` against the registered allowlist

---

## Project Structure

```
meet-id/
├── src/
│   ├── modules/
│   │   ├── Auth/           # register, login, logout, refresh
│   │   ├── OIDC/           # authorization code flow, token exchange, userinfo
│   │   ├── Application/    # OAuth application CRUD
│   │   ├── User/           # user profile
│   │   └── Views/          # EJS page routes + auth middleware
│   ├── db/
│   │   ├── schema.ts       # Drizzle table definitions
│   │   └── index.ts        # database client
│   ├── middlewares/
│   │   └── auth.middleware.ts
│   ├── utils/
│   │   ├── TokenUtils.ts   # HMAC JWT helpers
│   │   ├── cert.ts         # RSA key pair loader
│   │   ├── APIResponse.ts
│   │   └── APIError.ts
│   ├── app.ts              # Express factory
│   └── env.ts              # Zod-validated environment config
├── views/                  # EJS templates
├── cert/                   # RSA key pair (git-ignored)
├── drizzle/                # Generated SQL migrations
├── docker-compose.yaml
├── key-gen.sh
└── tsconfig.json
```

---

<div align="center">

Built with TypeScript · Express · PostgreSQL · Drizzle ORM

</div>
