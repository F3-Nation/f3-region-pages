#!/usr/bin/env bash

pnpm supabase:start
cp .env.local.sample .env.local
pnpm db:reset
pnpm db:migrate
pnpm db:seed
