# Chat White Label

Plataforma de chat com IA, acesso por codigo compartilhado.

## Features

- Chat com IA (Gemini 2.0 Flash)
- Streaming de respostas em tempo real
- Historico de conversas
- Personalizacao (tom, instrucoes, modelo)
- Acesso por codigo secreto

## Stack

- Next.js 14 (App Router)
- PostgreSQL + Prisma
- Google Gemini via AI SDK
- Tailwind CSS

## Deploy na Vercel

### 1. Criar banco Postgres

Na Vercel:
1. Va em Storage > Create Database > Postgres
2. Copie a `DATABASE_URL`

### 2. Configurar variaveis

No projeto Vercel, add essas env vars:

```
DATABASE_URL=postgres://...
JWT_SECRET=uma-chave-secreta-longa-e-aleatoria
ACCESS_CODE_HASH=cf753ca3dd9d7b591f49cb1463968ff5d4b3feb7b71babd0eab3384487786c86
GOOGLE_GENERATIVE_AI_API_KEY=sua-api-key
```

### 3. Codigo de acesso

O codigo padrao e: `muffin2026`

Para mudar, gere um novo hash:
```bash
echo -n "SEU_NOVO_CODIGO" | sha256sum
```

E atualize `ACCESS_CODE_HASH` na Vercel.

## Setup Local

```bash
git clone https://github.com/muffin-o-bot/chat-white-label.git
cd chat-white-label
pnpm install
cp .env.example .env
# Editar .env
pnpm db:push
pnpm dev
```

## Estrutura

```
app/
├── api/
│   ├── auth/login/     # Login por codigo
│   ├── chat/           # Threads e streaming
│   └── settings/       # Preferencias
├── chat/               # Pagina do chat
├── login/              # Tela de login
└── settings/           # Preferencias
```

## API

```
POST /api/auth/login    # { code: "..." }
POST /api/auth/logout
GET  /api/auth/me
GET  /api/chat/threads
POST /api/chat/threads
POST /api/chat/stream   # { threadId, message }
GET/PUT /api/settings
```
