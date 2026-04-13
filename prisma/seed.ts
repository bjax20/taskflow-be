import { PrismaClient, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seed Process ---');

  // 1Hash password to match AuthService standards
  // This ensures the seeded user can actually log in via API
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Upsert User
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      fullName: 'Test Candidate',
    },
  });
  console.log(`User: ${user.email} is ready.`);

  // Define Project Data (Synced with SeedService)
  const projectTitle = 'Zenith Pay Evolution';

  const existingProject = await prisma.project.findFirst({
    where: { title: projectTitle, ownerId: user.id },
  });

  let project;

  if (!existingProject) {
    project = await prisma.project.create({
      data: {
        title: projectTitle,
        description: 'High-priority development sprint initialized via seed.',
        owner: { connect: { id: user.id } },
        members: {
          create: { userId: user.id },
        },
        tasks: {
          create: [
            {
              title: 'Setup database schema',
              status: TaskStatus.DONE,
              assigneeId: user.id,
              position: 1000,
            },
            {
              title: 'Implement JWT Authentication',
              status: TaskStatus.IN_PROGRESS,
              assigneeId: user.id,
              position: 2000,
            },
            {
              title: 'Integrate Seed API Endpoint',
              status: TaskStatus.TODO,
              assigneeId: user.id,
              position: 3000,
            },
          ],
        },
      },
    });
    console.log(`Created new project: "${project.title}" with 3 tasks.`);
  } else {
    project = existingProject;
    console.log(`Project "${project.title}" already exists, skipping creation.`);
  }

  // Create a Changelog entry
  await prisma.changelog.create({
    data: {
      action: 'SYSTEM_SEED',
      details: 'Database initialized/synced via seed script',
      projectId: project.id,
      userId: user.id,
    },
  });

  console.log('--- Seed successful ---');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });