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
export async function cleanDatabase() {
    try {
        // Disable foreign key checks to allow deletion in any order
        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

        // Delete in order of dependencies (most dependent first)
        await prisma.projectMember.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        // Re-enable foreign key checks
        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    } catch (error) {
        console.error("Database cleanup failed:", error);
        throw error;
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