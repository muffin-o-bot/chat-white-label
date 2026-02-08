import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  const passwordHash = await hash('123456', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
      name: 'Usuario Teste',
    },
  });

  console.log('Created user:', user.email);

  // Create personalization
  await prisma.chatPersonalization.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      displayName: 'Usuario',
      tone: 'friendly',
      instructions: null,
      model: 'gemini-2.0-flash-001',
    },
  });

  console.log('Created personalization');

  // Create sample thread
  const thread = await prisma.chatThread.create({
    data: {
      userId: user.id,
      title: 'Conversa de teste',
    },
  });

  console.log('Created thread:', thread.id);

  // Create sample messages
  await prisma.chatMessage.createMany({
    data: [
      {
        threadId: thread.id,
        role: 'user',
        content: 'Ola! Como voce pode me ajudar?',
      },
      {
        threadId: thread.id,
        role: 'assistant',
        content: 'Ola! Sou seu assistente de IA. Posso ajudar com diversas tarefas como responder perguntas, escrever textos, analisar dados e muito mais. Como posso ajudar voce hoje?',
      },
    ],
  });

  console.log('Created sample messages');
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
