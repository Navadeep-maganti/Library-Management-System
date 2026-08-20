import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

// Construct DATABASE_URL if not set in environment
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
    const user = process.env.DB_USER || "postgres";
    const password = encodeURIComponent(process.env.DB_PASSWORD || "");
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "5432";
    const dbName = process.env.DB_NAME || "library_management";
    process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=public`;
}

export const prisma = new PrismaClient();
export default prisma;