# Agentic Research Toolkit

A Next.js dashboard for prototyping, organizing, and evaluating agentic research workflows.

The app provides working sections for agents, workflows, tools, documents, memory, evaluations, and a dashboard backed by a local SQLite database through Prisma.

## Tech Stack

- Next.js, React, TypeScript
- Tailwind CSS and shadcn-style UI components
- Prisma with SQLite
- Zustand for client-side UI state

## Getting Started

Install dependencies:

```bash
pnpm install
```

Generate the Prisma client:

```bash
pnpm db:generate
```

Run the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Database

The local database is configured in `.env`:

```bash
DATABASE_URL=file:../db/custom.db
```

To sync the schema with the local SQLite database:

```bash
pnpm db:push
```

To reseed demo data, start the app and call:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Project Structure

```text
src/app/                 Next.js routes and API endpoints
src/components/toolkit/  Main toolkit views and command palette
src/components/ui/       Shared UI primitives
src/hooks/               Client-side state and hooks
src/lib/                 Database and utility helpers
prisma/                  Prisma schema
db/                      Local SQLite database
examples/                Example research toolkit content
```

## Useful Scripts

```bash
pnpm dev          # Start the local dev server
pnpm build        # Create a production build
pnpm start        # Run the production server
pnpm lint         # Run ESLint
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema changes to SQLite
```
