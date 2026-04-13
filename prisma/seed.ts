import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seed ---');

  // 1. Upsert User (Prevents duplicate email error)
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: 'password123', // In production, this would be hashed
    },
  });

  // 2. Upsert Project
  // We use the title as a unique check for the seed, or find by owner + title
  const projectTitle = 'Onboarding Project';

  // We look for an existing project by this title owned by this user
  const existingProject = await prisma.project.findFirst({
    where: { title: projectTitle, ownerId: user.id }
  });

  let project;

  if (!existingProject) {
    project = await prisma.project.create({
      data: {
        title: projectTitle,
        description: 'My first project created via seed',
        ownerId: user.id,
        // 3. Add the owner as a member automatically
        members: {
          create: {
            userId: user.id,
          },
        },
        // 4. Create initial tasks
        tasks: {
          create: [
            {
              title: 'Setup database',
              status: TaskStatus.DONE,
              assigneeId: user.id
            },
            {
              title: 'Create login page',
              status: TaskStatus.IN_PROGRESS,
              assigneeId: user.id
            },
          ],
        },
      },
    });
    console.log(`Created new project: ${project.title}`);
  } else {
    project = existingProject;
    console.log(`Project "${project.title}" already exists, skipping create.`);
  }

  // 5. Create a Log entry for the seed action
  await prisma.changelog.create({
    data: {
      action: 'SYSTEM_SEED',
      details: 'Database initialized via seed script',
      projectId: project.id,
      userId: user.id,
    }
  });

  console.log('--- Seed successful ---');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });