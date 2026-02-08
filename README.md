# Chat White Label

Plataforma de chat com IA white label, pronta para deploy.

## Features

- Chat com IA (Gemini 2.0 Flash)
- Streaming de respostas em tempo real
- Historico de conversas
- Personalizacao por usuario (tom, instrucoes, modelo)
- Upload de arquivos (em desenvolvimento)
- Auth com JWT (login/registro)
- UI responsiva (mobile + desktop)

## Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma
- **Auth:** JWT com cookies httpOnly
- **AI:** Google Gemini via AI SDK
- **Storage:** Vercel Blob (prod) / Local (dev)
- **Styling:** Tailwind CSS

## Setup Local

### 1. Clone e instale

```bash
git clone https://github.com/muffin-o-bot/chat-white-label.git
cd chat-white-label
pnpm install
```

### 2. Configure o banco

Crie um banco PostgreSQL (recomendado: [Neon](https://neon.tech) gratuito).

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 3. Configure a IA

Pegue uma API key do Google AI Studio: https://makersuite.google.com/app/apikey

Adicione no `.env`:
```
GOOGLE_GENERATIVE_AI_API_KEY=sua-key-aqui
```

### 4. Rode as migrations

```bash
pnpm db:push
```

### 5. (Opcional) Seed de teste

```bash
pnpm db:seed
```

Cria usuario de teste:
- Email: `test@example.com`
- Senha: `123456`

### 6. Rode o servidor

```bash
pnpm dev
```

Acesse: http://localhost:3000

## Deploy na Vercel

### 1. Conecte o repositorio

- Va em [vercel.com](https://vercel.com)
- Import o repositorio
- Configure as variaveis de ambiente:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - `BLOB_READ_WRITE_TOKEN` (para uploads)

### 2. Deploy

O build roda automaticamente:
```
prisma generate && next build
```

## Estrutura

```
chat-white-label/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, register, logout, me
│   │   ├── chat/          # Threads, messages, stream
│   │   └── settings/      # Personalizacao
│   ├── chat/              # Pagina principal do chat
│   ├── login/             # Pagina de login
│   ├── register/          # Pagina de registro
│   └── settings/          # Pagina de preferencias
├── lib/
│   ├── auth.ts            # JWT utils
│   └── prisma.ts          # Prisma client
├── prisma/
│   ├── schema.prisma      # Schema do banco
│   └── seed.ts            # Seed de teste
└── ...
```

## Banco de Dados

### Tabelas

- **users** - Usuarios
- **chat_threads** - Conversas
- **chat_messages** - Mensagens
- **chat_personalization** - Preferencias do chat
- **data** - Dados/arquivos do usuario
- **files** - Metadados de arquivos

## Personalizacao

Cada usuario pode configurar:

- **displayName:** Como o assistente chama o usuario
- **tone:** Tom de voz (amigavel, profissional, etc)
- **instructions:** Instrucoes personalizadas (agent.md)
- **model:** Modelo de IA (Gemini 2.0 Flash, 1.5 Pro, etc)

As instrucoes sao incluidas no system prompt de todas as conversas.

## API

### Auth

```
POST /api/auth/register   # Criar conta
POST /api/auth/login      # Login
POST /api/auth/logout     # Logout
GET  /api/auth/me         # Usuario atual
```

### Chat

```
GET  /api/chat/threads                    # Listar conversas
POST /api/chat/threads                    # Criar conversa
GET  /api/chat/threads/:id/messages       # Mensagens de uma conversa
POST /api/chat/stream                     # Enviar mensagem (SSE)
```

### Settings

```
GET  /api/settings        # Obter preferencias
PUT  /api/settings        # Salvar preferencias
```

## Licenca

MIT
