import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: 'password123',
      projects: {
        create: {
          name: 'Onboarding Project',
          description: 'My first project created via seed',
          tasks: {
            create: [
              { title: 'Setup database', status: 'Done' },
              { title: 'Create login page', status: 'In Progress' },
            ],
          },
        },
      },
    },
  });
  console.log({ user });
}

main()
  .then(async () => { await prisma.$disconnect();})
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });