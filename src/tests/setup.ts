/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { PrismaClient, Prisma } from "../generated/client";

// Define options with explicit types to help the compiler
const prismaOptions: Prisma.PrismaClientOptions = {
    log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "error" },
        { emit: "stdout", level: "warn" },
    ],
};

// Export the single Prisma instance for all tests
export const prisma = new PrismaClient(prismaOptions);

/**
 * Clean the database between tests.
 * Using Raw queries and foreign key disabling to ensure a fresh state.
 */
export async function cleanDatabase() {
    try {
        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

        const tables = [
            "ProjectMember",
            "Task",
            "Project",
            "User",
            "Changelog",
        ];

        for (const table of tables) {
            try {
                // Use backticks for table names to handle MySQL reserved words
                await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
            } catch (e) {
                // Skips if table doesn't exist yet
            }
        }

        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    } catch (error) {
        console.error("Database cleanup failed:", error);
    }
}

/**
 * Global setup - runs once before the entire test suite
 */
beforeAll(async () => {
    try {
        // Simple heartbeat check
        await prisma.$queryRaw`SELECT 1`;
        console.log("✓ Database connected for tests");
    } catch (error) {
        console.error("Failed to initialize test database:", error);
        throw error;
    }
});

/**
 * Global teardown - runs once after all tests complete
 */
afterAll(async () => {
    try {
        // Ensure foreign keys are back on before closing
        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
        await prisma.$disconnect();
        console.log("✓ Database disconnected");
    } catch (error) {
        console.error("Error during test cleanup:", error);
    }
});