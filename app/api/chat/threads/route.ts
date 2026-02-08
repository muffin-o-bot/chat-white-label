import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// List threads
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const threads = await prisma.chatThread.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { content: true, role: true },
      },
    },
  });

  return NextResponse.json({ threads });
}

// Create thread
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = body.title || null;

  // Get user personalization for welcome message
  const personalization = await prisma.chatPersonalization.findUnique({
    where: { userId: user.id },
  });

  const displayName = personalization?.displayName || user.name || 'amigo';

  const thread = await prisma.chatThread.create({
    data: {
      userId: user.id,
      title: title || `Conversa com ${displayName}`,
    },
  });

  // Create welcome message from assistant
  const welcomeMessage = `Dae ${displayName}! Em que posso te ajudar?`;
  
  await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      role: 'assistant',
      content: welcomeMessage,
    },
  });

  return NextResponse.json({ thread, welcomeMessage });
}
