import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { threadId, message, attachments } = body;

    if (!threadId || !message) {
      return NextResponse.json(
        { error: 'threadId and message required' },
        { status: 400 }
      );
    }

    // Verify thread belongs to user
    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, userId: user.id },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Get personalization
    const personalization = await prisma.chatPersonalization.findUnique({
      where: { userId: user.id },
    });

    // Get previous messages for context
    const previousMessages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        threadId,
        role: 'user',
        content: message,
        metadata: attachments ? { attachments } : undefined,
      },
    });

    // Build system prompt
    const displayName = personalization?.displayName || user.name || 'Usuario';
    const tone = personalization?.tone || 'friendly';
    const instructions = personalization?.instructions || '';

    let systemPrompt = `Voce e um assistente de IA util e ${tone}. O usuario se chama ${displayName}.`;
    if (instructions) {
      systemPrompt += `\n\nInstrucoes especificas:\n${instructions}`;
    }

    // Build messages array
    const llmMessages = previousMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
    llmMessages.push({ role: 'user', content: message });

    // Create assistant message placeholder
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        threadId,
        role: 'assistant',
        content: '',
        metadata: { status: 'streaming' },
      },
    });

    // Update thread title if first message
    if (previousMessages.length === 0) {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { title },
      });
    }

    // Update thread timestamp
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          const model = personalization?.model || 'gemini-2.0-flash-001';
          const result = await streamText({
            model: google(model),
            system: systemPrompt,
            messages: llmMessages,
          });

          for await (const textPart of result.textStream) {
            if (textPart) {
              fullContent += textPart;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: textPart })}\n\n`
                )
              );
            }
          }

          // Update assistant message with full content
          await prisma.chatMessage.update({
            where: { id: assistantMessage.id },
            data: {
              content: fullContent,
              metadata: { status: 'completed' },
            },
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, messageId: assistantMessage.id })}\n\n`
            )
          );
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
