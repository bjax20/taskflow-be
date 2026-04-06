import { describe, it, expect, beforeEach } from "@jest/globals";
import { prisma } from "../setup";
import { cleanDatabase } from "../setup";

describe("Prisma Schema Constraints (Integration)", () => {
    jest.setTimeout(20000); // Give it 20 seconds instead of 5
    beforeEach(async () => {
        await cleanDatabase();
    });

    it("should enforce unique email constraint", async () => {
        const userData = {
            email: "bill@billdev.online",
            password: "hashed_password",
        };
        await prisma.user.create({ data: userData });

        // TDD: This MUST fail
        await expect(prisma.user.create({ data: userData })).rejects.toThrow();
    });

    it("should only allow valid TaskStatus enums", async () => {
        // 1. Atomic Create: Project and Owner in one transaction
        const projectWithUser = await prisma.project.create({
            data: {
                title: "Enum Test Project",
                owner: {
                    create: {
                        email: `schema-test-${Date.now()}-${Math.random()}@test.com`,
                        password: "123",
                    },
                },
            },
        });

        // 2. Test Valid Enum
        const task = await prisma.task.create({
            data: {
                title: "Valid Task",
                status: "TODO",
                project: { connect: { id: projectWithUser.id } },
            },
        });

        expect(task.status).toBe("TODO");

        // 3. Test Invalid Enum

        await expect(
            prisma.task.create({
                data: {
                    title: "Invalid Task",
                    // @ts-expect-error because we are INTENTIONALLY breaking the type
                    // to verify that the DATABASE (Prisma/MySQL) enforces the constraint.
                    status: "INVALID_STATUS",
                    project: { connect: { id: projectWithUser.id } },
                },
            }),
        ).rejects.toThrow();
    });
});
