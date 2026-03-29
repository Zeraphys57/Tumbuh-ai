# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test framework is configured.

## Architecture Overview

**Tumbuh AI** is a multi-tenant AI customer service SaaS platform for Indonesian SMEs and enterprises. It uses Next.js 14 App Router, Supabase (PostgreSQL + Auth), and Google Gemini API.

### Key Flows

**Authentication & Routing**
- `src/middleware.ts` guards all `/dashboard` routes via Supabase session
- Role-based redirect: `super_admin` → `/dashboard/admin`, regular clients → `/dashboard/leads`
- Each business client has a unique `clientId` (slug) stored in the `clients` table

**Chat Pipeline**
1. Frontend (web chat or WhatsApp webhook) → `POST /api/chat`
2. `src/services/ai-orchestrator.ts` performs intent classification via Gemini
3. Intent routes to one of 15 agentic tools in `src/app/agentic/agentic-tools/`
4. Quota is atomically deducted via Supabase RPC `safe_deduct_quota` (`src/lib/quotaManager.ts`)
5. Response returned to user; telemetry logged (tokens, latency)

**Multi-tenant System**
- Each client has its own `system_prompt`, enabled features, and quota tracked in Supabase
- `NEXT_PUBLIC_SUPER_ADMIN_EMAILS` env var controls super admin access
- API routes that need elevated DB access use `SUPABASE_SERVICE_ROLE_KEY`

### Directory Structure

```
src/
├── app/
│   ├── (auth)/           # Login, register, forgot-password, impersonate
│   ├── (marketing)/      # Public landing pages (home, pricing, demo)
│   ├── agentic/
│   │   └── agentic-tools/  # 15 specialized tool files (stock, booking, orders, etc.)
│   ├── api/
│   │   ├── addons-api/   # 10+ AI addon endpoints (AIAnalyst, AILeadScorer, etc.)
│   │   ├── chat/         # Main chat endpoint with agentic routing
│   │   ├── upload-knowledge/ / delete-knowledge/
│   │   ├── generate-insight/
│   │   ├── transaction/  # Midtrans payment integration
│   │   └── webhook/      # WhatsApp / Meta webhook
│   └── dashboard/
│       ├── admin/        # Super admin only: system analytics, kill switch
│       └── leads/        # Per-client: lead management, usage analytics
├── components/
│   ├── chat/             # Chat UI
│   ├── dashboard/        # Dashboard UI
│   ├── landings/         # Marketing page components
│   └── ui/               # Reusable components
├── lib/
│   ├── gemini.ts         # Gemini model initialization (gemini-2.5-flash / flash-lite)
│   ├── supabase.ts       # Supabase client helpers
│   └── quotaManager.ts   # Quota tracking & atomic deduction
├── services/
│   └── ai-orchestrator.ts  # Intent detection + tool selection logic
└── middleware.ts           # Auth & RBAC routing
```

### Agentic Tools

Each file in `src/app/agentic/agentic-tools/` implements one tool callable by the orchestrator:
`toolCheckStock`, `toolMakeOrder`, `toolCalculateShipping`, `toolCheckSchedule`, `toolMakeBooking`, `toolCalculateCustomPrice`, `toolCheckOrderStatus`, `toolRegisterMember`, `toolCheckPoints`, `toolPanggilAdmin`, and others.

### Environment Variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend Supabase access |
| `SUPABASE_SERVICE_ROLE_KEY` | Elevated backend DB access |
| `WHATSAPP_TOKEN` / `WHATSAPP_VERIFY_TOKEN` | Meta WhatsApp Business API |
| `VARIABLE_PHONE_NUMBER` | WhatsApp business phone number ID |
| `MIDTRANS_SERVER_KEY` / `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Payment gateway (currently sandbox) |
| `NEXT_PUBLIC_SUPER_ADMIN_EMAILS` | Comma-separated super admin emails |
| `NEXT_PUBLIC_SITE_URL` | Production URL (`https://tumbuh.tech`) |

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
