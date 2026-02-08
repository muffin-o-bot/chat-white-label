import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createToken, setAuthCookie } from '@/lib/auth';
import { createHash } from 'crypto';

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
    const codeHash = createHash('sha256').update(code.trim().toUpperCase()).digest('hex');

    // Find access code in database
    const accessCode = await prisma.accessCode.findUnique({
      where: { codeHash },
      include: { user: true },
    });

    if (!accessCode || !accessCode.active) {
      return NextResponse.json(
        { error: 'Codigo invalido' },
        { status: 401 }
      );
    }

    // Update last used
    await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: { usedAt: new Date() },
    });

    const user = accessCode.user;

    // Create token and set cookie
    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    await setAuthCookie(token);

    return NextResponse.json({ 
      success: true,
      name: user.name || accessCode.label,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
