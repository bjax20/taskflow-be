import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { prisma, cleanDatabase } from "../setup";

describe("Project Logic Flow", () => {

    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
        await prisma.$disconnect();
    });

    it("should verify a user can be a member of multiple projects", async () => {
        // 1. Create the User first (Stand-alone)
        const user = await prisma.user.create({
            data: {
                email: `dev-${Date.now()}-${Math.random().toString(36).substring(7)}@billdev.online`,
                password: "hashed_password",
            },
        });

        // Verify user was created
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

        // 4. Verify projects exist before creating memberships
        const projectAlphaCheck = await prisma.project.findUnique({
            where: { id: projectAlpha.id },
        });
        expect(projectAlphaCheck).toBeDefined();

        const projectBetaCheck = await prisma.project.findUnique({
            where: { id: projectBeta.id },
        });
        expect(projectBetaCheck).toBeDefined();

        // 5. Add memberships
        const membership1 = await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId: projectAlpha.id,
            },
        });

        expect(membership1.userId).toBeDefined();

        const membership2 = await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId: projectBeta.id,
            },
        });

        expect(membership2.userId).toBeDefined();

        // 6. Query and verify
        const userWithMemberships = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                projects: true,      // ProjectMember entries
                ownedProjects: true, // Projects owned
            },
        });

        // 7. Assertions
        expect(userWithMemberships).toBeDefined();
        expect(userWithMemberships?.projects).toHaveLength(2);
        expect(userWithMemberships?.ownedProjects).toHaveLength(2);

        const projectIds = userWithMemberships?.projects.map(p => p.projectId);
        expect(projectIds).toContain(projectAlpha.id);
        expect(projectIds).toContain(projectBeta.id);
    });
});