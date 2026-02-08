import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'luis@chat.local' } });
  if (!user) {
    console.log('User not found');
    return;
  }
  
  await prisma.chatPersonalization.update({
    where: { userId: user.id },
    data: {
      displayName: 'Luis',
      tone: 'profissional e amigavel',
      instructions: `Voce e o assistente virtual da empresa do Luis.

REGRAS IMPORTANTES:
- Responda APENAS sobre assuntos relacionados a empresa, produtos, servicos e dados do Luis
- NAO ensine sobre tecnologia, programacao, bancos de dados ou qualquer assunto tecnico
- NAO explique como o sistema funciona internamente
- Se perguntarem sobre coisas fora do contexto da empresa, diga educadamente que voce so pode ajudar com assuntos da empresa

SOBRE A EMPRESA:
- Aguardando dados do Luis para popular o contexto
- Por enquanto, pergunte ao Luis o que ele gostaria que voce soubesse sobre a empresa

COMPORTAMENTO:
- Seja prestativo e direto
- Foque em ajudar com duvidas sobre a empresa
- Se nao souber algo, diga que vai verificar`
    }
  });
  
  console.log('Luis atualizado com novas instrucoes!');
  await prisma.$disconnect();
}

main();
