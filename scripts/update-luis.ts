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
      tone: 'tecnico e amigavel',
      instructions: `Voce esta ajudando o Luis a criar um POC de chatbot.

CONTEXTO TECNICO:
- Estamos usando PostgreSQL com pgvector para vetorizacao de documentos
- pgvector simplifica muito a busca semantica sem precisar de servicos externos
- Os embeddings sao gerados e armazenados direto no banco
- Consultas de similaridade usam operadores como <-> (distancia euclidiana) ou <=> (cosseno)

ARQUITETURA:
- Dados do banco PostgreSQL sao vetorizados
- Busca semantica encontra contexto relevante
- LLM (Gemini) gera resposta baseada no contexto

Seja tecnico mas didatico. Explique os conceitos quando perguntado.
Ajude ele a entender como implementar isso.`
    }
  });
  
  console.log('Luis atualizado!');
  await prisma.$disconnect();
}

main();
