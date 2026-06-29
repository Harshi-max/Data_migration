# 🗄️ MongoDB → MySQL Migration Tool

<div align="center">

![Migration Tool](https://img.shields.io/badge/MongoDB-→-MySQL-green?style=for-the-badge&logo=mongodb)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Playwright](https://img.shields.io/badge/Tested%20with-Playwright-2EAD33?style=for-the-badge&logo=playwright)

**A production-grade, full-stack tool to migrate MongoDB collections to MySQL with zero data loss, real-time progress streaming, and automatic schema inference.**

[Live Demo](https://data-migration-tool-ivory.vercel.app) · [Report a Bug](https://github.com/dixitshubham93/data_migration_tool/issues) · [Request Feature](https://github.com/dixitshubham93/data_migration_tool/issues)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔌 **Visual Connection Manager** | Connect to MongoDB (local/Atlas) and MySQL with real-time ping |
| 🔍 **Smart Schema Discovery** | Hybrid `$sample` + tail cursor scan — no `.toArray()`, O(1) memory |
| 📊 **Data Preview** | Paginated table view of every collection before migrating |
| ⚡ **Batch Insertion** | 500 rows per `INSERT` — ~500× fewer MySQL round trips |
| 🔄 **Real-time SSE Progress** | Live per-collection progress bars via Server-Sent Events |
| 🏛️ **ER Diagram** | Auto-generated entity–relationship diagram after migration |
| 🔁 **Resume Capability** | File-persisted checkpoints — resume from exactly where it stopped |
| 🔀 **Transaction Safety** | Per-collection `BEGIN/COMMIT/ROLLBACK` — failed collection reverts cleanly |
| 🔗 **FK Detection & Apply** | Heuristic foreign key detection with user-confirmed application |
| 🧪 **Dry-Run Mode** | Preview schema and DDL without touching MySQL |
| 📜 **Migration History** | Disk-persisted log of all past migrations |
| 🛡️ **Input Validation** | Per-route middleware rejects bad requests before any DB call |

---

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    subgraph Frontend["🖥️ Frontend (React + Vite)"]
        UI[Connection Forms]
        Preview[Data Preview Table]
        Progress[Migration Progress + SSE]
        ER[ER Diagram Panel]
    end

    subgraph Backend["⚙️ Backend (Express + Node.js)"]
        Router[Express Router]
        
        subgraph Controllers
            ConnCtrl[connection.controller]
            MigCtrl[migrate.controller]
            PreviewCtrl[preview.controller]
        end

        subgraph Services["services/migration/"]
            Orch[orchestrator.js]
            Schema[schemaDiscovery.js]
            DDL[ddl.js — DDLManager]
            Batch[batchInserter.js]
            Checkpoint[checkpointStore.js]
            DryRun[dryRun.js]
            FKMgr[foreignKeyManager.js]
        end

        subgraph Connections
            MongoConn[mongo.connection.js]
            MySQLConn[mysql.connection.js]
        end

        SSE[SSE EventEmitter]
    end

    subgraph Storage
        MongoDB[(MongoDB Source)]
        MySQL[(MySQL Target)]
        Disk[📁 data/checkpoints/]
    end

    UI -->|POST /check| ConnCtrl
    Preview -->|POST /preview| PreviewCtrl
    Progress -->|POST /start| MigCtrl
    Progress -->|GET /progress/:id SSE| SSE
    ER -->|GET /:id/er-diagram| MigCtrl

    ConnCtrl --> MongoConn
    MigCtrl --> Orch
    Orch --> Schema
    Orch --> DDL
    Orch --> Batch
    Orch --> Checkpoint
    Orch --> SSE

    Schema --> MongoConn --> MongoDB
    Batch --> MySQLConn --> MySQL
    Checkpoint --> Disk
```

### Migration Data Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Express API
    participant Orch as Orchestrator
    participant Mongo as MongoDB
    participant MySQL as MySQL

    FE->>API: POST /migrate/start
    API-->>FE: 202 + migrationId
    FE->>API: GET /progress/:id (SSE open)

    loop For each collection
        Orch->>Mongo: $sample(500) aggregate
        Orch->>Mongo: tail cursor scan (last 500)
        Note over Orch: Merge schemas, detect FKs
        
        Orch->>MySQL: CREATE TABLE (DDL)
        MySQL-->>Orch: OK

        Orch->>MySQL: BEGIN TRANSACTION
        
        loop cursor.batchSize(1000) — O(1) memory
            Orch->>Mongo: fetch batch of docs
            Orch->>MySQL: INSERT IGNORE (500 rows)
            API-->>FE: SSE progress event
        end

        Orch->>MySQL: COMMIT
        API-->>FE: SSE collection_done
    end

    Orch->>Disk: save checkpoint + ER diagram
    API-->>FE: SSE complete + erDiagram
```

### Schema Discovery Strategy

```mermaid
flowchart LR
    Start([Collection]) --> Phase1

    subgraph Phase1["Phase 1 — $sample"]
        S1[aggregate $sample 500 docs]
        S1 --> S2[Infer field types]
        S2 --> S3[Detect nested objects → child tables]
        S3 --> S4[Detect FK references]
    end

    Phase1 --> Decision{totalDocs > 1000?}
    
    Decision -->|Yes| Phase2
    Decision -->|No| Finalize

    subgraph Phase2["Phase 2 — Tail Scan"]
        T1[find.sort _id desc .limit 500]
        T1 --> T2[Merge with Phase 1 schema]
        T2 --> T3[Resolve type conflicts INT→TEXT]
    end

    Phase2 --> Finalize
    Finalize([fieldTypeMap + nestedSchemas + foreignKeys])
```

---

## 🗂️ Project Structure

```
migration_tool/
├── backend/
│   └── src/
│       ├── connections/
│       │   ├── mongo.connection.js     # URI builder + MongoClient factory
│       │   └── mysql.connection.js     # mysql2 pool + ping utility
│       ├── controllers/
│       │   ├── connection.controller.js # check, listDatabases, listCollections
│       │   ├── migrate.controller.js    # start, resume, dryRun, history, SSE, ER, FK
│       │   └── preview.controller.js   # paginated collection preview
│       ├── middlewares/
│       │   ├── error.middleware.js      # global error handler
│       │   └── validate.middleware.js   # per-route input validation
│       ├── services/
│       │   ├── migration/
│       │   │   ├── orchestrator.js      # top-level coordinator
│       │   │   ├── schemaDiscovery.js   # hybrid $sample + tail cursor
│       │   │   ├── ddl.js              # DDLManager: CREATE/ALTER TABLE
│       │   │   ├── batchInserter.js    # 500-row INSERT batching
│       │   │   ├── typeMapper.js       # SQL type inference + conflict resolution
│       │   │   ├── flattener.js        # nested → flat, FK heuristics
│       │   │   ├── checkpointStore.js  # file-persisted resume state
│       │   │   ├── dryRun.js           # schema preview, no MySQL writes
│       │   │   └── foreignKeyManager.js # detect + apply FK constraints
│       │   └── preview/
│       │       └── previewService.js   # paginated MongoDB preview
│       ├── routes/
│       │   └── migrateRouter.js
│       └── App.js
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── DatabaseConnectionForm.tsx  # credential inputs + DB/collection picker
│       │   ├── DataPreview.tsx             # sortable table component
│       │   ├── getData.tsx                 # preview data fetcher
│       │   ├── MigrationProgress.tsx       # SSE stream + ER diagram panel
│       │   └── ConfigurationSummary.tsx
│       ├── types/
│       │   └── database.ts
│       └── App.tsx
├── tests/
│   └── smoke.spec.ts                   # Playwright end-to-end smoke tests
├── data/
│   └── checkpoints/                    # per-migration JSON state files
├── playwright.config.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| MongoDB | 6+ (or Atlas) |
| MySQL | 8+ |
| npm | 9+ |

### 1. Clone & Install

```bash
git clone https://github.com/Harshi-max/Data_migration.git
cd Data_migration

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
FRONTEND_URL=http://localhost:5173
PORT=3000
```

### 3. Start Development Servers

```bash
# Terminal 1 — Backend
cd backend
npm run server        # nodemon, auto-restart on changes

# Terminal 2 — Frontend
cd frontend
npm run dev           # Vite dev server at http://localhost:5173
```

---

## 📡 API Reference

### Connection

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/migrate/check` | Ping source or target DB |
| `POST` | `/migrate/databases` | List MongoDB databases |
| `POST` | `/migrate/collections` | List collections in a DB |

### Migration

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/migrate/start` | Start migration → 202 + `migrationId` |
| `POST` | `/migrate/resume/:id` | Resume failed/partial migration |
| `POST` | `/migrate/dry-run` | Schema preview, no MySQL writes |
| `GET` | `/migrate/status/:id` | Polling status (checkpoint state) |
| `GET` | `/migrate/progress/:id` | **SSE** — real-time per-collection events |
| `GET` | `/migrate/history` | All past migrations (disk-persisted) |

### Post-Migration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/migrate/:id/er-diagram` | Stored ER diagram as JSON |
| `GET` | `/migrate/:id/foreign-keys` | Detected FK relationships |
| `POST` | `/migrate/:id/apply-fk` | Apply confirmed FK constraints |

### Preview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/migrate/preview` | Paginated collection data preview |

---

## 🧪 Testing

Tests run against the live Vercel deployment in CI, and against `localhost:5173` locally.

```bash
# Install Playwright browsers (first time only)
npx playwright install --with-deps

# Run all tests
npx playwright test

# Interactive UI mode
npx playwright test --ui

# Specific browser
npx playwright test --project=chromium
```

CI runs on every push to `main`, `master`, and `work` branches via GitHub Actions.

---

## ⚙️ Configuration Options

Pass `options` inside the migration request body to tune behaviour:

```json
{
  "data": {
    "source": { ... },
    "target": { ... },
    "options": {
      "scanMode": "hybrid",       // "sample" | "hybrid" | "full_scan"
      "stopOnError": false,       // abort all remaining collections on first failure
      "sampleSize": 500,          // docs to $sample in schema discovery
      "tailSize": 500             // docs for tail scan phase
    }
  }
}
```

| `scanMode` | Accuracy | Speed | Use when |
|---|---|---|---|
| `sample` | Good | Fastest | Dev / small collections |
| `hybrid` | Better | Fast | **Default — recommended** |
| `full_scan` | Perfect | Slow | Critical accuracy required |

---

## 🔁 Resume a Failed Migration

If a migration fails mid-way (network drop, MySQL timeout, etc.):

1. The checkpoint is saved to `data/checkpoints/<migrationId>.json` automatically
2. Already-completed collections are preserved
3. Call `POST /migrate/resume/:migrationId` with the same source/target config
4. The orchestrator skips completed collections and continues from where it stopped

---

## 🏛️ ER Diagram

After a successful migration, the ER diagram is:
- Returned in the `complete` SSE event
- Stored in the checkpoint file
- Available via `GET /migrate/:id/er-diagram`
- Rendered in the frontend as expandable table cards with column types, PK/FK badges, and relationship arrows

---

<img width="1680" height="741" alt="Screenshot 2026-06-29 173507" src="https://github.com/user-attachments/assets/d6839479-3c2c-431c-ae65-63a934d1f354" />
<img width="1408" height="738" alt="Screenshot 2026-06-29 173458" src="https://github.com/user-attachments/assets/6a0995f3-73e7-4807-898d-91ce184a250d" />
<img width="1914" height="755" alt="Screenshot 2026-06-29 173447" src="https://github.com/user-attachments/assets/d8c917c4-5963-4f0a-aca5-09cb50cede04" />
<img width="1794" height="692" alt="Screenshot 2026-06-29 173440" src="https://github.com/user-attachments/assets/623249e5-35dd-498b-8db9-4573c60ad2bd" />
<img width="1875" height="788" alt="Screenshot 2026-06-29 173418" src="https://github.com/user-attachments/assets/939ae88e-2d48-4ea4-853a-edf4d7570095" />
<img width="1659" height="432" alt="Screenshot 2026-06-29 173515" src="https://github.com/user-attachments/assets/41e32f7d-1f98-45d8-8341-4fc660c4c2e9" />
<img width="1887" height="616" alt="Screenshot 2026-06-29 173521" src="https://github.com/user-attachments/assets/51765429-bc85-4f2e-b140-27d1692470ca" />
<img width="670" height="469" alt="Screenshot 2026-06-29 173608" src="https://github.com/user-attachments/assets/80bf12f8-20a4-49e0-864f-05802ed7171e" />

