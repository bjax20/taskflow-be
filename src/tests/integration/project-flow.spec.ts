import { describe, it, expect, beforeEach, afterAll, jest } from "@jest/globals";
import { createRegisterDto } from "../../tests/factories/auth.factory";
import { prisma, cleanDatabase } from "../setup";


describe("Project Logic Flow", () => {
    // Increase timeout for complex relationship operations
    jest.setTimeout(30000);

    beforeEach(async (): Promise<void> => {
        await cleanDatabase();
    });

    afterAll(async (): Promise<void> => {
        await cleanDatabase();
        await prisma.$disconnect();
    });

    it("should verify a user can be a member of multiple projects", async (): Promise<void> => {
        // Use Factory: Generates a valid user with all required fields
        const userData = createRegisterDto({
            email: `dev-${Date.now()}@billdev.online`,
        });

        // 1. Create the User first
        const user = await prisma.user.create({
            data: {
                email: userData.email,
                password: userData.password,
                fullName: userData.fullName,
            },
        });

        expect(user.id).toBeDefined();

        // 2. Create Project Alpha
        const projectAlpha = await prisma.project.create({
            data: {
                title: "Project Alpha",
                ownerId: user.id,
            },
        });

        expect(projectAlpha.id).toBeDefined();

        // 3. Create Project Beta
        const projectBeta = await prisma.project.create({
            data: {
                title: "Project Beta",
                ownerId: user.id,
            },
        });

        expect(projectBeta.id).toBeDefined();

        // 4. Verify projects exist
        const projectAlphaCheck = await prisma.project.findUnique({
            where: { id: projectAlpha.id },
        });
        expect(projectAlphaCheck).toBeDefined();

        // 5. Add memberships
        // No manual mapping needed for IDs
        await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId: projectAlpha.id,
            },
        });

        await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId: projectBeta.id,
            },
        });

        // 6. Query and verify with includes
        const userWithMemberships = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                projects: true,      // ProjectMember entries
                ownedProjects: true, // Projects owned
            },
        });

        // 7. Assertions
        expect(userWithMemberships).toBeDefined();
        // User should be a member of 2 projects and own 2 projects
        expect(userWithMemberships?.projects).toHaveLength(2);
        expect(userWithMemberships?.ownedProjects).toHaveLength(2);

        const projectIds = userWithMemberships?.projects.map((p) => p.projectId);
        expect(projectIds).toContain(projectAlpha.id);
        expect(projectIds).toContain(projectBeta.id);
    });
});