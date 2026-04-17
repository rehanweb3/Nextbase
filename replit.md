# DBCraft

A full-stack PostgreSQL database management tool with a React/Vite frontend and Node.js/Express/TypeScript backend. Features real-time metrics, SQL editing, table management, schema visualization, backups via pg_dump, and admin controls.

## Tech Stack

**Backend:**
- Node.js 20 with TypeScript
- Express.js v5
- PostgreSQL (Replit built-in) via `pg`
- Socket.io for real-time schema/table updates
- JWT auth (jsonwebtoken)
- pg_dump for backups via child_process

**Frontend:**
- React + Vite (port 5000)
- TailwindCSS + shadcn/ui components
- React Query (@tanstack/react-query) for server state
- Wouter for routing
- ReactFlow for schema visualizer

## Project Structure

```
Backend/
  src/
    index.ts               - Entry point (port 3001, localhost)
    routes/
      auth.ts              - JWT login, /api/auth/*
      db.ts                - Tables, rows, schema, stats, /api/db/*
      query.ts             - Raw SQL execution, /api/query/*
      admin.ts             - Backup (pg_dump), restore, pause/resume/reset
    middleware/
      auth.ts              - JWT authenticateToken middleware
    lib/
      db.ts                - pg Pool (uses DATABASE_URL or PG* env vars)
      config.ts            - postgres.yml fallback reader
      queryTracker.ts      - In-memory throughput tracking (queries/inserts/updates/deletes)
  backups/                 - Created at runtime; stores .sql backup files

Frontend/
  src/
    api/
      client.ts            - All real API fetch functions + React Query hooks
      mock.ts              - Re-exports from client.ts (no longer mock data)
    pages/
      login.tsx            - Real JWT auth via POST /api/auth/login
      dashboard.tsx        - Real-time DB metrics (overview, throughput, activity, tables)
      table-editor.tsx     - Full CRUD on tables and rows via real API
      sql-editor.tsx       - Multi-tab SQL editor with real query execution
      statistics.tsx       - DB stats (tables, rows, size, connections)
      visualizer.tsx       - ReactFlow schema diagram from /api/db/schema
      settings.tsx         - Connection strings, pause/resume DB, reset DB
      backup-restore.tsx   - pg_dump backups list/create/download/delete, SQL restore
    components/
      table-editor/        - TableExplorer, TableDataGrid, TableToolbar, panels
      sql-editor/          - SqlCodeEditor, ResultsPanel (supports error display)
      statistics/          - ChartLineInteractive
  vite.config.ts           - /api proxy → http://localhost:3001
```

## Workflows

- **Start application** → `cd Frontend && npm install && npm run dev` (port 5000, webview)
- **Backend** → `cd Backend && npm install && npx ts-node src/index.ts` (port 3001, console)

## Environment Variables

Automatically set by Replit:
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

Configured in postgres.yml (read by config.ts at runtime):
- `x-admin-user` / `ADMIN_USERNAME` - DBCraft login username
- `x-admin-pass` / `ADMIN_PASSWORD` - DBCraft login password
- `x-jwt-secret` / `JWT_SECRET` - JWT signing secret

## API Endpoints

**Auth:**
- `POST /api/auth/login` — Returns JWT token
- `GET /api/auth/me` — Current user (auth required)

**Database:**
- `GET /api/health` — Health check
- `GET /api/db/overview` — Active connections, DB size, table count
- `GET /api/db/throughput` — Query throughput time series
- `GET /api/db/activity` — Active PG queries
- `GET /api/db/tables` — Table names list
- `GET /api/db/tables-extended` — Tables with row counts and sizes
- `GET /api/db/tables/:name` — Schema + constraints
- `GET /api/db/tables/:name/data` — Paginated row data
- `POST /api/db/tables` — Create table
- `DELETE /api/db/tables/:name` — Drop table
- `PATCH /api/db/tables/:name/rename` — Rename table
- `POST /api/db/tables/:name/duplicate` — Duplicate table
- `POST /api/db/tables/:name/rows` — Insert row
- `PATCH /api/db/tables/:name/rows` — Update row
- `DELETE /api/db/tables/:name/rows` — Delete row
- `POST /api/db/tables/:name/columns` — Add column
- `DELETE /api/db/tables/:name/columns/:col` — Drop column
- `GET /api/db/schema` — Full schema for ReactFlow visualizer
- `GET /api/db/stats` — Aggregated DB stats
- `POST /api/query/run` — Execute raw SQL

**Admin:**
- `POST /api/admin/backup` — Run pg_dump, store in backups/
- `GET /api/admin/backups` — List all backups
- `GET /api/admin/backups/:id/download` — Download backup file
- `DELETE /api/admin/backups/:id` — Delete backup
- `POST /api/admin/restore` — Execute SQL restore
- `POST /api/admin/db/pause` — Suspend all connections
- `POST /api/admin/db/resume` — Resume connections
- `POST /api/admin/db/reset` — Drop all tables

## Deployment

- Target: VM (required for WebSocket support)
- Build: `cd Backend && npm install && npx tsc`
- Run: `cd Backend && node dist/index.js`
