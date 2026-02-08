import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createToken, setAuthCookie } from '@/lib/auth';
import { createHash } from 'crypto';

// Hash do codigo de acesso - mude isso para gerar um novo codigo
// Para gerar: echo -n "SEU_CODIGO" | sha256sum
const ACCESS_CODE_HASH = process.env.ACCESS_CODE_HASH || 
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // default: "123"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Codigo obrigatorio' },
        { status: 400 }
      );
    }

    // Hash the provided code
    const codeHash = createHash('sha256').update(code.trim()).digest('hex');

    // Check if code matches
    if (codeHash !== ACCESS_CODE_HASH) {
      return NextResponse.json(
        { error: 'Codigo invalido' },
        { status: 401 }
      );
    }

    // Find or create the shared user
    let user = await prisma.user.findUnique({ 
      where: { email: 'shared@chat.local' } 
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'shared@chat.local',
          passwordHash: 'code-based-auth',
          name: 'Usuario',
        },
      });

      // Create default personalization
      await prisma.chatPersonalization.create({
        data: {
          userId: user.id,
          displayName: 'Usuario',
          tone: 'friendly',
          model: 'gemini-2.0-flash-001',
        },
      });
    }

    // Create token and set cookie
    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    await setAuthCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
