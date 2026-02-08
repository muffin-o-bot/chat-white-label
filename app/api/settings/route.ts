import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const settingsSchema = z.object({
  displayName: z.string().max(100).optional(),
  tone: z.string().max(50).optional(),
  instructions: z.string().max(10000).optional(),
  model: z.string().max(50).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const personalization = await prisma.chatPersonalization.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({ personalization });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = settingsSchema.parse(body);

    const personalization = await prisma.chatPersonalization.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: data.displayName || null,
        tone: data.tone || null,
        instructions: data.instructions || null,
        model: data.model || null,
      },
      update: {
        displayName: data.displayName || null,
        tone: data.tone || null,
        instructions: data.instructions || null,
        model: data.model || null,
      },
    });

    return NextResponse.json({ personalization });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Settings error:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar preferencias' },
      { status: 500 }
    );
  }
}
