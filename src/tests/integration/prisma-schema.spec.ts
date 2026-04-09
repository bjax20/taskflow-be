import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { createRegisterDto } from "../../tests/factories/auth.factory";
import { prisma, cleanDatabase } from "../setup";


describe("Prisma Schema Constraints (Integration)", () => {
    // Increase timeout for DB operations
    jest.setTimeout(20000);

    beforeEach(async () => {
        await cleanDatabase();
    });

    it("should enforce unique email constraint", async (): Promise<void> => {
        // Use Factory for base data
        const userData = createRegisterDto({
            email: "bill@billdev.online",
        });

        // Prisma needs the password but we don't want to expose it in the return
        // usually, but here we are testing the DB directly.
        await prisma.user.create({
            data: {
                email: userData.email,
                password: userData.password,
                fullName: userData.fullName,
            }
        });

        // TDD: This MUST fail due to unique constraint
        await expect(
            prisma.user.create({
                data: {
                    email: userData.email,
                    password: userData.password,
                    fullName: userData.fullName,
                }
            })
        ).rejects.toThrow();
    });

    it("should only allow valid TaskStatus enums", async (): Promise<void> => {
        // ✅ Use Factory to generate valid owner data for the nested create
        const ownerData = createRegisterDto();

        // 1. Atomic Create: Project and Owner in one transaction
        const projectWithUser = await prisma.project.create({
            data: {
                title: "Enum Test Project",
                owner: {
                    create: {
                        email: `schema-test-${Date.now()}@test.com`,
                        password: ownerData.password,
                        fullName: ownerData.fullName,
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
                    // @ts-expect-error - Intentionally breaking types to test DB enforcement
                    status: "INVALID_STATUS",
                    project: { connect: { id: projectWithUser.id } },
                },
            }),
        ).rejects.toThrow();
    });
});