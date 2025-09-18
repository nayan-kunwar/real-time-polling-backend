###  **How to Run the Backend**

Follow these steps to set up and run the backend locally:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/nayan-kunwar/real-time-polling-backend
   cd <your-backend-repo-folder>
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Create the Environment File**
   In the project root, create a file named `.env` and add the following variables:

   ```env
   PORT=8000
   DATABASE_URL="postgresql://testuser:test@localhost:5432/polling"
   ```

4. **Start PostgreSQL Database with Docker**
   Ensure Docker is running, then start the database container:

   ```bash
   docker compose up -d
   ```

5. **Apply Prisma Migrations**

   ```bash
   npx prisma migrate dev
   ```

6. **Generate Prisma Client**

   ```bash
   npx prisma generate
   ```

7. **(Optional) Open Prisma Studio**
   To inspect the database visually:

   ```bash
   npx prisma studio
   ```

8. **Start the Backend Server**

   ```bash
   npm run dev
   ```

9. **Import Postman Collection**
   - A Postman collection JSON file (`<collection-name>.json`) is included in the repository for testing API endpoints.
   - To import:
     1. Open **Postman** → Click **Import**.
     2. Select the provided JSON file.
     3. Use the collection to test the backend APIs.

---

**Your backend should now be running at**: `http://localhost:8000`
