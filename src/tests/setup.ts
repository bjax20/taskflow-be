import { PrismaClient } from "@prisma/client";

// Create a single Prisma instance for all tests
export const prisma = new PrismaClient({
    log: [
        {
            emit: "event",
            level: "query",
        },
        {
            emit: "stdout",
            level: "error",
        },
        {
            emit: "stdout",
            level: "warn",
        },
    ],
});

// Export cleanDatabase function
async function cleanDatabase() {
    try {
        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

        // robust approach: Wrap in try-catch or only delete if tables exist
        const tables = ["ProjectMember", "Task", "Project", "User", "Changelog"];
        
        for (const table of tables) {
            try {
                // Using executeRaw because it won't crash the whole process 
                // if the Prisma Client hasn't loaded the model yet
                await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
            } catch (e) {
                // Silently skip if table doesn't exist yet
            }
        }

        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    } catch (error) {
        console.error("Database cleanup failed:", error);
    }
}

// Optional: Listen to Prisma query logs for debugging
// prisma.$on("query", (e) => {
//     console.log("Query: " + e.query);
//     console.log("Params: " + JSON.stringify(e.params));
//     console.log("Duration: " + e.duration + "ms");
// });

// Global setup - runs once before all tests
beforeAll(async () => {
    try {
        // Test connection
        await prisma.$queryRaw`SELECT 1`;
        console.log("✓ Database connected for tests");

        // Run migrations
        // Note: Uncomment if using npx prisma migrate in test
        // const { spawn } = require('child_process');
        // await new Promise((resolve, reject) => {
        //     const proc = spawn('npx', ['prisma', 'migrate', 'deploy', '--skip-generate']);
        //     proc.on('close', resolve);
        //     proc.on('error', reject);
        // });
    } catch (error) {
        console.error("Failed to initialize test database:", error);
        throw error;
    }
});

// Global teardown - runs once after all tests
afterAll(async () => {
    try {
        // Ensure foreign keys are re-enabled
        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

        // Disconnect
        await prisma.$disconnect();
        console.log("✓ Database disconnected");
    } catch (error) {
        console.error("Error during test cleanup:", error);
    }
});