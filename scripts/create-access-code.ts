import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function createAccessCode(label: string) {
  // Gera codigo aleatorio: LABEL-XXXXXX
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  const code = `${label.toUpperCase().slice(0, 4)}-${suffix}`;
  const codeHash = createHash('sha256').update(code).digest('hex');

  // Cria usuario
  const email = `${label.toLowerCase().replace(/\s/g, '')}@chat.local`;
  
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'access-code-auth',
        name: label,
      },
    });

    // Cria personalizacao padrao
    await prisma.chatPersonalization.create({
      data: {
        userId: user.id,
        displayName: label,
        tone: 'friendly',
        model: 'gemini-2.0-flash-001',
      },
    });
  }

  // Cria ou atualiza codigo de acesso
  const accessCode = await prisma.accessCode.upsert({
    where: { userId: user.id },
    update: { code, codeHash, label, active: true },
    create: {
      code,
      codeHash,
      label,
      userId: user.id,
    },
  });

  console.log('-----------------------------------');
  console.log(`Codigo criado para: ${label}`);
  console.log(`Codigo: ${code}`);
  console.log(`Hash: ${codeHash}`);
  console.log('-----------------------------------');

  return { code, label, userId: user.id };
}

async function main() {
  const label = process.argv[2];
  
  if (!label) {
    console.error('Uso: npx tsx scripts/create-access-code.ts "Nome do Amigo"');
    process.exit(1);
  }

  await createAccessCode(label);
  await prisma.$disconnect();
}

main().catch(console.error);
