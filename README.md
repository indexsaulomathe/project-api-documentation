# Employee Documentation API

REST API for managing employee documentation — linking document types to employees, tracking versioned file submissions, and monitoring pending documents.

[![CI](https://github.com/indexsaulomathe/project-api-documentation/actions/workflows/ci.yml/badge.svg)](https://github.com/indexsaulomathe/project-api-documentation/actions/workflows/ci.yml)

---

## Table of Contents

- [Stack](#stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Running Tests](#running-tests)
- [Observability](#observability)
- [Scripts Reference](#scripts-reference)
- [Data Model](#data-model)
- [Project Structure](#project-structure)

---

## Stack

| Technology                      | Role                           |
| ------------------------------- | ------------------------------ |
| **NestJS**                      | Framework                      |
| **TypeScript**                  | Language                       |
| **PostgreSQL 16**               | Relational database            |
| **TypeORM**                     | ORM + migrations               |
| **MinIO**                       | Object storage (S3-compatible) |
| **nestjs-pino**                 | Structured JSON logging        |
| **@willsoto/nestjs-prometheus** | Metrics endpoint               |
| **Swagger / OpenAPI**           | Auto-generated API docs        |
| **Jest**                        | Unit + E2E tests               |
| **Yarn**                        | Package manager                |
| **Docker Compose**              | Local infrastructure           |
| **GitHub Actions**              | CI/CD                          |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          NestJS App                             │
│                                                                 │
│  CorrelationIdMiddleware → Guards (JWT) → Controller            │
│                                              │                  │
│                                           Service               │
│                                         ┌────┴────┐            │
│                                    Repository   StorageService  │
│                                         │           │           │
│                                     PostgreSQL    MinIO         │
│                                                                 │
│  ResponseInterceptor  ← wraps all success responses             │
│  AllExceptionsFilter  ← normalises all error responses          │
│  MetricsInterceptor   ← records Prometheus metrics per request  │
└─────────────────────────────────────────────────────────────────┘
```

### Layered structure (per module)

```
Controller  → validates input (DTOs + pipes), delegates to Service
Service     → business logic, repository calls, atomic transactions
Entity      → TypeORM table mapping (no business logic)
Filter      → exception → standardised error envelope
Interceptor → success response → standardised success envelope
```

---

## Getting Started

### Prerequisites

- Node.js 24+
- Yarn
- Docker + Docker Compose

### Local development (databases only)

```bash
git clone https://github.com/indexsaulomathe/project-api-documentation
cd project-api-documentation

cp .env.example .env

# Start PostgreSQL (dev + test) and MinIO
yarn docker:up:db

yarn install
yarn migration:run
yarn seed
yarn start:dev
```

- **Swagger UI:** <http://localhost:3000/api/docs>
- **API base URL:** `http://localhost:3000/api/v1`

### Full stack (app + observability)

```bash
yarn docker:up
```

Starts: **app**, **postgres**, **postgres-test**, **minio**, **prometheus**, **grafana**.

| Service    | URL                              |
| ---------- | -------------------------------- |
| API        | <http://localhost:3000/api>      |
| Swagger    | <http://localhost:3000/api/docs> |
| MinIO UI   | <http://localhost:9001>          |
| Prometheus | <http://localhost:9090>          |
| Grafana    | <http://localhost:3001>          |

> **Grafana credentials:** `admin` / value of `GRAFANA_PASSWORD` (default: `admin`)
> The _Employee Docs API_ dashboard is provisioned automatically on first start.

---

## Environment Variables

Copy `.env.example` and fill in the required values.

```env
# Application
APP_PORT=3000
NODE_ENV=development
LOG_LEVEL=debug               # trace | debug | info | warn | error
ALLOWED_ORIGINS=              # comma-separated list, empty = CORS disabled

# Main database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=docs_management

# Test database (isolated — used only by E2E tests)
DB_TEST_HOST=localhost
DB_TEST_PORT=5433
DB_TEST_NAME=docs_management_test

# MinIO (object storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=employee-documents
MINIO_USE_SSL=false

# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-refresh-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Observability
METRICS_TOKEN=        # optional — if set, GET /api/metrics requires X-Metrics-Token header
GRAFANA_PASSWORD=admin
```

---

## API Endpoints

All routes are prefixed with `/api/v1`.

### Auth

| Method | Path             | Auth   | Description                                    |
| ------ | ---------------- | ------ | ---------------------------------------------- |
| POST   | `/auth/register` | Public | Register a new user                            |
| POST   | `/auth/login`    | Public | Login — returns `accessToken` + `refreshToken` |
| POST   | `/auth/refresh`  | Public | Rotate refresh token                           |
| POST   | `/auth/logout`   | Bearer | Invalidate refresh token                       |

### Employees

| Method | Path             | Auth   | Description                            |
| ------ | ---------------- | ------ | -------------------------------------- |
| POST   | `/employees`     | Bearer | Create employee                        |
| GET    | `/employees`     | Bearer | List employees (paginated, filterable) |
| GET    | `/employees/:id` | Bearer | Get employee by ID                     |
| PATCH  | `/employees/:id` | Bearer | Update employee                        |
| DELETE | `/employees/:id` | Bearer | Soft-delete employee                   |

### Document Types

| Method | Path                  | Auth   | Description                     |
| ------ | --------------------- | ------ | ------------------------------- |
| POST   | `/document-types`     | Bearer | Create document type            |
| GET    | `/document-types`     | Bearer | List document types (paginated) |
| GET    | `/document-types/:id` | Bearer | Get document type by ID         |
| PATCH  | `/document-types/:id` | Bearer | Update document type            |
| DELETE | `/document-types/:id` | Bearer | Soft-delete document type       |

### Employee ↔ Document Type (linking)

| Method | Path                                                    | Auth   | Description                                               |
| ------ | ------------------------------------------------------- | ------ | --------------------------------------------------------- |
| POST   | `/employees/:employeeId/document-types/:documentTypeId` | Bearer | Link document type to employee (creates pending document) |
| DELETE | `/employees/:employeeId/document-types/:documentTypeId` | Bearer | Unlink (soft-deletes link + pending document)             |

### Documents

| Method | Path                                                                       | Auth   | Description                                 |
| ------ | -------------------------------------------------------------------------- | ------ | ------------------------------------------- |
| POST   | `/employees/:employeeId/document-types/:documentTypeId/documents`          | Bearer | Upload document file (creates new version)  |
| GET    | `/employees/:employeeId/document-types/:documentTypeId/documents/download` | Bearer | Get signed download URL for active document |
| GET    | `/employees/:employeeId/document-types/:documentTypeId/documents/history`  | Bearer | Version history (paginated)                 |
| GET    | `/employees/:employeeId/documents`                                         | Bearer | List all active documents for employee      |

### Pendencies

| Method | Path          | Auth   | Description                                                |
| ------ | ------------- | ------ | ---------------------------------------------------------- |
| GET    | `/pendencies` | Bearer | Employees with at least one pending (unsubmitted) document |

### Statistics

| Method | Path          | Auth   | Description                |
| ------ | ------------- | ------ | -------------------------- |
| GET    | `/statistics` | Bearer | Global document statistics |

### System

| Method | Path       | Auth           | Description                   |
| ------ | ---------- | -------------- | ----------------------------- |
| GET    | `/health`  | Public         | Health check (app + database) |
| GET    | `/metrics` | Optional token | Prometheus metrics            |

---

## Authentication

The API uses **JWT Bearer tokens** with refresh token rotation.

```
POST /auth/login
  └─> accessToken  (30 min)  — sent as Authorization: Bearer <token>
  └─> refreshToken (7 days)  — stored securely client-side

POST /auth/refresh
  └─> new accessToken + new refreshToken (rotation)

POST /auth/logout
  └─> invalidates the current refreshToken
```

In **Swagger UI**, click the **Authorize** button (top right) and paste your `accessToken` to authenticate all requests.

---

## Running Tests

### Unit tests

```bash
yarn test
```

189 tests across 23 suites — controllers, services, filters, interceptors, middleware.

### Unit tests with coverage

```bash
yarn test:cov
```

Minimum targets: **Controllers 90%** · **Services 90%** · **Filters/Interceptors 80%**

### E2E tests

Requires PostgreSQL running (dev + test databases):

```bash
yarn docker:up:db
yarn test:e2e
```

85 E2E tests across 8 suites. Each suite spins up the full NestJS application against the isolated test database (`docs_management_test` on port 5433). Migrations run automatically on setup; tables are truncated between suites for isolation. `maxWorkers: 1` ensures suites run serially.

### CI

GitHub Actions runs on every push/PR to `main` or `dev`:

1. **lint-and-build** — ESLint + type check + `nest build`
2. **unit-tests** — full suite with coverage artifact (retained 7 days)
3. **e2e-tests** — PostgreSQL services + migrations + E2E suite (requires unit-tests to pass)

---

## Observability

### Structured logging (nestjs-pino)

All logs are emitted as **structured JSON** in production. Every log line includes a `correlationId` (from `X-Request-ID` header or auto-generated UUID).

In development, logs are pretty-printed via `pino-pretty` (set `LOG_LEVEL=debug`).

Sensitive fields are automatically redacted: `password`, `token`, `refreshToken`, `cpf`, `authorization`.

### Metrics (Prometheus)

```
GET /api/metrics
```

Exposes default Node.js process metrics plus:

| Metric                          | Type      | Labels                           |
| ------------------------------- | --------- | -------------------------------- |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` |
| `http_requests_total`           | Counter   | `method`, `route`, `status_code` |
| `http_active_requests`          | Gauge     | `method`, `route`                |

### Grafana

Pre-provisioned dashboard (_Employee Docs API_) includes: requests/sec, P50/P95/P99 latency, error rate, active requests, heap memory usage, and requests broken down by route.

---

## Scripts Reference

```bash
# Development
yarn start:dev           # Hot-reload dev server
yarn start:prod          # Production (requires yarn build first)
yarn build               # Compile TypeScript

# Database
yarn migration:run       # Run pending migrations (main DB)
yarn migration:run:test  # Run pending migrations (test DB)
yarn migration:revert    # Revert last migration
yarn migration:generate  # Generate migration from entity changes
yarn seed                # Seed default document types (main DB)
yarn seed:test           # Seed test database
yarn seed:all            # Seed both databases

# Tests
yarn test                # Unit tests
yarn test:cov            # Unit tests with coverage
yarn test:e2e            # E2E integration tests
yarn test:watch          # Watch mode

# Code quality
yarn lint                # ESLint with auto-fix
yarn format              # Prettier format

# Docker
yarn docker:up           # Start all services
yarn docker:up:db        # Start databases + MinIO only
yarn docker:down         # Stop all services
yarn docker:down:v       # Stop all services and remove volumes
```

---

## Data Model

```
┌──────────────┐       ┌────────────────────────┐       ┌──────────────────┐
│   Employee   │──────<│  EmployeeDocumentType  │>──────│   DocumentType   │
│              │       │                        │       │                  │
│ name         │       │ employeeId (FK)        │       │ name             │
│ email        │       │ documentTypeId (FK)    │       │ description      │
│ cpf          │       │ deletedAt              │       │ isRequired       │
│ department   │       └──────────┬─────────────┘       └──────────────────┘
│ position     │                  │ creates on link
│ deletedAt    │                  ▼
└──────────────┘       ┌──────────────────────────┐
                       │         Document          │
                       │                          │
                       │ employeeId (FK)           │
                       │ documentTypeId (FK)       │
                       │ version (int)             │
                       │ status (pending|submitted)│
                       │ isActive (bool)           │
                       │ fileName                  │
                       │ storageKey (MinIO)        │
                       │ fileSize                  │
                       │ contentType               │
                       │ contentHash (SHA-256)     │
                       │ submittedAt               │
                       │ deletedAt                 │
                       └──────────────────────────┘
```

**Key behaviours:**

- Linking a document type to an employee automatically creates a `PENDING` Document (version 1).
- Uploading a file deactivates the current version and creates a new one (`version + 1`, status `SUBMITTED`) inside database transaction.
- Uploading the **same file twice** (identical SHA-256) returns the existing document without creating a new version.
- Unlinking soft-deletes both the `EmployeeDocumentType` and any associated pending document.
- All entities use UUID primary keys and support soft delete (`deletedAt`).

---

## Project Structure

```
src/
├── auth/                    # JWT authentication (register, login, refresh, logout)
├── common/
│   ├── dto/                 # Shared DTOs (PaginationDto)
│   ├── entities/            # BaseEntity (uuid, createdAt, updatedAt, deletedAt)
│   ├── filters/             # AllExceptionsFilter
│   ├── guards/              # JwtAuthGuard, RolesGuard
│   ├── interceptors/        # ResponseInterceptor
│   ├── logger/              # nestjs-pino configuration (buildLoggerConfig)
│   └── middleware/          # CorrelationIdMiddleware
├── database/
│   ├── config/              # data-source.ts (TypeORM DataSource)
│   ├── migrations/          # TypeORM migration files
│   └── seeds/               # Document type seeds
├── document-types/          # DocumentType CRUD
├── documents/               # Document upload, download, versioning
├── employee-document-types/ # Employee ↔ DocumentType linking
├── employees/               # Employee CRUD
├── health/                  # Health check endpoint
├── metrics/                 # Prometheus metrics (module, interceptor, controller)
├── pendencies/              # Pending documents query
├── statistics/              # Global statistics
└── storage/                 # MinIO wrapper (StorageService)

docker/
├── docker-compose.yml
├── Dockerfile
├── prometheus.yml
└── grafana/
    ├── provisioning/        # Auto-provisioned datasource + dashboard config
    └── dashboards/          # api.json (Grafana dashboard definition)

test/
├── helpers/                 # createTestApp(), factories, clearDatabase()
└── modules/                 # E2E specs per module

.github/
└── workflows/
    └── ci.yml               # GitHub Actions CI pipeline
```
