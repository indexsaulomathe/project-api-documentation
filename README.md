# Employee Documentation API

REST API for managing employee documentation — linking document types to employees, tracking submission versions, and monitoring pending documents.

---

## Stack

| Technology     | Role            | Why                                                |
| -------------- | --------------- | -------------------------------------------------- |
| **NestJS**     | Framework       | Modular architecture, native DI, decorators        |
| **TypeScript** | Language        | Type safety, better IDE support                    |
| **PostgreSQL** | Database        | ACID transactions, indexes, constraints            |
| **TypeORM**    | ORM             | Typed repositories, migrations, native soft delete |
| **Swagger**    | Docs            | Auto-generated from decorators                     |
| **Jest**       | Tests           | Unit + E2E, native NestJS support                  |
| **Yarn**       | Package manager | Deterministic installs via yarn.lock               |

---

## Prerequisites

- Node.js 24+
- Yarn
- Docker + Docker Compose

---

## Getting Started

```bash
git clone <repo-url>
cd project-api-documentation

cp .env.example .env

# Start databases (main + test)
yarn docker:up:db

yarn install
yarn migration:run
yarn seed
yarn start:dev
```

Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## Environment Variables

```env
APP_PORT=3000
NODE_ENV=development

# Main database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=docs_management

# Test database (isolated, used by E2E tests)
DB_TEST_HOST=localhost
DB_TEST_PORT=5433
DB_TEST_NAME=docs_management_test
```

---

## Available Scripts

```bash
yarn start:dev        # Development with hot reload
yarn start:prod       # Production (requires build)
yarn build            # Compile TypeScript

yarn migration:run    # Run pending migrations
yarn migration:revert # Revert last migration
yarn seed             # Populate default document types

yarn test             # Unit tests
yarn test:cov         # Unit tests with coverage report
yarn test:e2e         # E2E integration tests
yarn lint             # Lint and auto-fix
yarn format           # Prettier format

yarn docker:up        # Start all services (app + DBs)
yarn docker:up:db     # Start databases only
yarn docker:down      # Stop all services
```

---

## Running Tests

### Unit tests

```bash
yarn test
```

122 tests across 16 suites covering controllers, services, filters, interceptors and middleware.

### E2E tests

```bash
# Make sure the test database is running first
yarn docker:up:db

yarn test:e2e
```

57 E2E tests across 7 suites. Each suite spins up the full NestJS app, runs migrations against the isolated test database, and truncates between tests for isolation.

### Coverage

```bash
yarn test:cov
```

Minimum coverage targets: Controllers 90% · Services 90% · Filters/Interceptors/Middlewares 80%

---

## Data Model

```
Employee ──< EmployeeDocumentType >── DocumentType
                     │
                     └──> Document (versioned)
```

- **Employee** — name, email (unique), CPF (unique), department, position
- **DocumentType** — name (unique), description, isRequired
- **EmployeeDocumentType** — link between employee and document type; creates a pending Document on link
- **Document** — versioned submission; each resubmission deactivates the previous version and increments version number

All entities use UUID primary keys and support soft delete (`deletedAt`).

---
