# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Production build (~480 static pages)
npm run lint             # ESLint (Next.js + TypeScript)
npm run format           # Prettier formatting
npm run typecheck        # TypeScript type checking
npm run test             # Run Jest tests
npm run test:watch       # Jest watch mode
npm run test:coverage    # Coverage report (70% threshold)
```

## Database Commands

```bash
npm run db:setup:local   # Complete local setup (Supabase + seed)
npm run db:migrate       # Apply pending migrations
npm run db:push          # Sync schema to database
npm run db:seed          # Run all seed scripts
npm run db:reset         # Complete database reset
npm run db:generate:migration  # Create migration from schema changes
```

## Architecture Overview

**Stack:** Next.js 15, React 19, TypeScript, Drizzle ORM, PostgreSQL (Supabase), TailwindCSS

**Key Patterns:**

1. **React Server Components by default** - Pages in `src/app/` are RSCs. Use `'use client'` only for interactivity.

2. **Build-aware caching** - Cache keys include `NEXT_BUILD_ID` to prevent cross-deployment pollution. See `src/utils/fetchWorkoutLocations.ts` for the pattern using `getBuildAwareCacheKey()`.

3. **Static Generation with ISR** - `generateStaticParams()` in `[regionSlug]/page.tsx` pre-generates all region pages at build time.

4. **Chunk error recovery** - `ChunkErrorRecovery.tsx` auto-reloads on chunk loading failures from stale HTML/fresh assets mismatch.

## Key Files

- `drizzle/schema.ts` - Database schema (regions, workouts, seedRuns tables)
- `drizzle/db.ts` - Database instance
- `src/utils/fetchWorkoutLocations.ts` - Central data fetching with caching
- `src/app/[regionSlug]/page.tsx` - Region detail page with ISR
- `src/components/ChunkErrorRecovery.tsx` - Client-side error recovery

## Agent Skills

This repo has Vercel Labs agent skills installed in `.agents/skills/`:

- **vercel-react-best-practices** - 57 React/Next.js performance rules across 8 categories (async waterfalls, bundle optimization, server performance, re-render optimization). Apply when writing or reviewing React components.

- **vercel-composition-patterns** - React composition patterns for scalable components. Apply when refactoring components with boolean prop proliferation or designing reusable component APIs. Includes React 19 API guidance.

## Environment Setup

Requires Node.js 20.18.2 (see `.nvmrc`). Copy `.env.local.sample` to `.env.local` and configure:

- `POSTGRES_URL` - Supabase PostgreSQL connection
- `F3_DATA_WAREHOUSE_URL` - Data warehouse connection

## TypeScript

Path alias `@/*` maps to `./src/*`. Strict mode enabled.
