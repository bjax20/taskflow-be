import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Create or find the user first
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
       password: 'password123', // hash this
    },
  });

  // Create the project independently, linking the owner and members
  const project = await prisma.project.create({
    data: {
      title: 'Onboarding Project', 
      description: 'My first project created via seed',
      ownerId: user.id,            
      members: {
        create: {
          userId: user.id,         // Adds the creator to the ProjectMember join table
        },
      },
      tasks: {
        create: [
          { 
            title: 'Setup database', 
            status: TaskStatus.DONE, // Using the Enum for type safety
            assigneeId: user.id      // Optional: assigning it to the user
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

  console.log('Seed successful:', { user, project });
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