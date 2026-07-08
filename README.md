# Collaborative Document Editor

A real-time collaborative rich-text document editor built from first principles. This project is structured as a mono-repo containing a Node.js + Socket.IO backend, a React + Quill.js frontend, and load testing scripts.

---

## 🛠️ Technology Stack

### Frontend (`apps/frontend`)
* **Framework:** React 19 + TypeScript + Vite 5.x
* **Rich Text Editor:** Quill.js 2.x (with Delta operations)
* **Real-time Sync:** Socket.IO Client 4.x
* **Styling:** Custom Vanilla CSS with HSL variables (dark-mode glassmorphic theme)
* **Routing:** React Router 7.x

### Backend (`apps/server`)
* **Runtime:** Node.js 20 + TypeScript
* **REST API:** Express.js 4.x (with Zod validation & JWT Authentication)
* **WebSocket Server:** Socket.IO 4.x
* **Database Client:** node-postgres (pg)
* **OT Library:** quill-delta (used for server-side OT transforms)

### Infrastructure
* **Database:** PostgreSQL 15 (run containerized via Docker)
* **Orchestration:** Docker Compose
* **Load Testing:** k6

---

## 🚀 How to Run the Project Locally

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed and running.
* [Node.js](https://nodejs.org/) v20+ installed locally (for running the frontend).

### Step 1: Start the Backend & Database (via Docker)
From the project root directory, run:
```bash
docker compose up --build -d
```
This command will:
1. Spin up a PostgreSQL 15 database mapped on host port **`5435`**.
2. Run database migrations to construct the schema (`users`, `documents`, `collaborators`).
3. Start the backend API and WebSocket server on host port **`4000`**.

### Step 2: Start the Frontend React App
Open a separate terminal window, navigate to the frontend folder, and run:
```bash
cd apps/frontend
npm install
npm run dev
```
This runs the development server on **`http://localhost:3000`**.

---

## 👥 Demo Flow

1. Open **`http://localhost:3000`** in your browser.
2. Click **Register** and create a test user (e.g. `usera@example.com`).
3. In the Dashboard, type a title and click **Create** to initialize a new document.
4. Copy the editor URL from your address bar (e.g. `http://localhost:3000/docs/<uuid>`).
5. Open an **Incognito / Private Window** (or a different browser), register as a second user (`userb@example.com`), and paste the copied URL.
6. Type in both editors simultaneously — text merges automatically and colored cursors show each user's name badge in real-time.

---

## 🧪 Testing & Performance Benchmarks

### 1. Backend OT Unit Tests
To verify the operational transformation (OT) engine correctness:
```bash
cd apps/server
npm test
```
The Jest tests cover concurrent inserts tie-breaking, inserts vs deletes, and multi-operation transformations.

### 2. k6 Baseline Benchmark
To run the 150-user load test:
1. Ensure the user `test@example.com` with password `testpass123` is registered.
2. Create a document and copy its UUID.
3. Run the benchmark:
   ```bash
   k6 run -e TEST_DOC_ID=<your-document-uuid> benchmarks/scripts/phase1-baseline.js
   ```
