

#  Getting Started

Follow these steps to set up the development environment on your local machine.

## 1. Prerequisites
Ensure you have the following installed:
* **Docker & Docker Desktop** (Required for the MySQL database)
* **Node.js** (v18 or higher)
* **npm** (v9 or higher)

---

## 2. Environment Configuration
1. Clone the repository.
2. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and verify the `DATABASE_URL` matches your local Docker settings:
   `DATABASE_URL="mysql://dev_user:dev_password@localhost:3306/taskflow_db"`

---

## 3. Infrastructure Setup (Docker)
Fire up the database container. This runs in the background.
```bash
docker-compose up -d db
```

> **Note for First-Time Setup:** If you encounter a `P3014` error regarding permissions, run the following to grant the dev user "Architect" privileges:
> `docker exec -it taskflow_db mysql -u root -prootpassword -e "GRANT ALL PRIVILEGES ON *.* TO 'dev_user'@'%'; FLUSH PRIVILEGES;"`

---

## 4. Database Initialization
This command handles three critical steps: generating the TypeSafe client, applying all SQL "patches" (migrations), and inserting mock data.
```bash
npm run db:setup
```



---

## 5. Running the Application
Once the database is synced, start the NestJS server in watch mode:
```bash
npm run start:dev
```
The API will be available at `http://localhost:3000/api/v1`.

---

# 🛠 Development Workflow

### Changing the Database
If you need to modify the database structure (e.g., adding a new column):
1. Update `prisma/schema.prisma`.
2. Run `npm run migrate:dev`.
3. Provide a descriptive name for the "patch" (e.g., `add_due_date_to_tasks`).
4. **Commit** the newly generated folder in `prisma/migrations` to Git.



### Useful Commands
| Command | Purpose |
| :--- | :--- |
| `npm run start:dev` | Starts the API with Hot-Reloading. |
| `npm run db:setup` | Full reset: Generates client, runs migrations, and seeds data. |
| `npx prisma studio` | Opens a browser-based UI to view/edit your database data. |
| `npm run lint` | Runs ESLint to keep code style consistent. |

**Is there any specific part of your `taskflow` logic (like a specific service or guard) that needs special instructions in this file?**