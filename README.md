# Tapos.work | Project Management Backend

A robust, enterprise-grade NestJS API designed for team collaboration. This system is architected with a focus on **Type Safety**, **Automated Orchestration**, and **CI/CD**.

## 🏗 Key Architectural Pillars
* **NestJS (Fastify):** High-performance, low-overhead framework for scalable I/O.
* **Prisma ORM:** Strictly typed database interactions with a centralized schema.
* **Dockerized Infrastructure:** Containerized MySQL environment for consistent local and production parity.
* **Professional Test Suite:** Full coverage using **Jest** with a clear separation between unit, integration, and E2E layers.

---

## 🛠 Quick Start (The "One-Command" Setup)

I've optimized the onboarding process to ensure you can go from `git clone` to a fully functional, seeded environment in under two minutes.

### 1. Environment & Infrastructure
```bash
cp .env.example .env
docker-compose up -d tapos_db
```

### 2. Automated Initialization
This script automates Docker permissions, Prisma client generation, database migrations, and idempotent data seeding.
```bash
pnpm run db:setup
```

### 3. Run the Service
```bash
pnpm run start:dev
```
* **API Entry:** `http://localhost:3000/api/v1`
* **Interactive Documentation:** `/api/v1/docs` (Swagger/OpenAPI)

---

## 🧪 Testing Strategy (Jest & Docker)

Reliability is non-negotiable. This project implements a rigorous testing lifecycle that utilizes dedicated Docker environments to prevent side effects on development data.

| Command | Suite | Focus |
| :--- | :--- | :--- |
| `pnpm run test` | **Unit** | Business logic and Service-level isolation. |
| `pnpm run test:int` | **Integration** | DB Repository patterns and Prisma hooks. |
| `pnpm run test:e2e` | **E2E** | Full HTTP lifecycle using a dedicated test database. |

> **Note:** Run `pnpm run test:setup` to automatically spin up the `tapos_test` database within your MySQL container before running integration or E2E suites.

---

## 🔄 Professional Workflow & CI/CD

This repository is built for **Continuous Integration**. On every pull request or push to `main`, a GitHub Actions workflow executes the following:

1.  **Static Analysis:** Runs **ESLint** for code quality and **Prettier** for formatting.
2.  **Infrastructure Sync:** Initializes a transient MySQL service in the runner.
3.  **Automated Validation:** Executes the full Jest test suite.
4.  **Docker Build & Push:** Compiles a production-ready image and pushes it to Docker Hub.
5.  **Automated Deployment:** Deploys via SSH to a Singapore-based VPS, performs a health check, and runs zero-downtime migrations.

---

## 🚧 Status & Maintenance

### Known Issues & Incomplete Functionality
The following areas are currently under development or identified for future optimization:

* **[SLOT: FEATURE/BUG NAME]** — *e.g., Real-time notification socket integration is currently in the architectural phase.*
* **[SLOT: FEATURE/BUG NAME]** — *e.g., Rate limiting is partially implemented; currently evaluating Redis-based global throttling.*
* **[SLOT: FEATURE/BUG NAME]** — *e.g., Password recovery flow requires an SMTP provider configuration.*

---

## 📜 Technical Utility Scripts

| Script | Purpose |
| :--- | :--- |
| `pnpm run seed` | Idempotent data injection (safe to run multiple times). |
| `pnpm run db:grant` | Fixes Docker MySQL permission bottlenecks (P3014) automatically. |
| `pnpm exec prisma studio` | Visual database explorer. |
| `pnpm run test:all` | Pre-flight check (Lint + Unit + E2E + Build). |

---

**Architecture Note:** The project uses **Bcrypt** for secure password hashing and **JWT** for stateless authentication. All responses are standardized via NestJS Interceptors to ensure a consistent API contract for frontend consumers.