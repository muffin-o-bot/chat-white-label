'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Plus,
  Send,
  Menu,
  X,
  Settings,
  LogOut,
  Loader2,
  User,
  Bot,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface Thread {
  id: string;
  title: string | null;
  updatedAt: string;
  messages?: { content: string; role: string }[];
}

interface ChatClientProps {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function ChatClient({ user }: ChatClientProps) {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load threads
  useEffect(() => {
    fetchThreads();
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    if (currentThreadId) {
      fetchMessages(currentThreadId);
    }
  }, [currentThreadId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchThreads() {
    try {
      const res = await fetch('/api/chat/threads');
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error('Error fetching threads:', error);
    }
  }

  async function fetchMessages(threadId: string) {
    try {
      const res = await fetch(`/api/chat/threads/${threadId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }

  async function createThread() {
    try {
      const res = await fetch('/api/chat/threads', { method: 'POST' });
      const data = await res.json();
      setCurrentThreadId(data.thread.id);
      setMessages([]);
      await fetchThreads();
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    let threadId = currentThreadId;

    // Create thread if none exists
    if (!threadId) {
      try {
        const res = await fetch('/api/chat/threads', { method: 'POST' });
        const data = await res.json();
        threadId = data.thread.id;
        setCurrentThreadId(threadId);
      } catch (error) {
        console.error('Error creating thread:', error);
        return;
      }
    }

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setStreaming(true);

    // Add placeholder for assistant
    const assistantPlaceholder: Message = {
      id: `streaming-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          message: userMessage.content,
        }),
      });

      if (!res.ok) {
        throw new Error('Stream failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                content += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantPlaceholder.id
                      ? { ...m, content }
                      : m
                  )
                );
              }
              if (data.done) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantPlaceholder.id
                      ? { ...m, id: data.messageId || m.id }
                      : m
                  )
                );
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      await fetchThreads();
    } catch (error) {
      console.error('Stream error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantPlaceholder.id
            ? { ...m, content: 'Erro ao gerar resposta. Tente novamente.' }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, currentThreadId]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 h-full w-72 bg-surface border-r border-gray-800 flex flex-col transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h1 className="text-lg font-bold text-heading">Chat</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-surface-alt rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={createThread}
            className="w-full flex items-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => {
                setCurrentThreadId(thread.id);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
                currentThreadId === thread.id
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-surface-alt text-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {thread.title || 'Nova conversa'}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 px-3 py-2 text-muted">
            <User className="w-5 h-5" />
            <span className="truncate flex-1">{user.name || user.email}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => router.push('/settings')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-surface-alt rounded-lg text-muted"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-surface-alt rounded-lg text-muted"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-gray-800 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-surface-alt rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-heading font-medium truncate">
            {currentThreadId
              ? threads.find((t) => t.id === currentThreadId)?.title ||
                'Nova conversa'
              : 'Selecione ou crie uma conversa'}
          </h2>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !currentThreadId && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Clique em "Nova Conversa" para comecar</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-surface-alt text-heading'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content || '...'}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 px-4 py-3 bg-surface-alt border border-gray-700 rounded-xl text-heading placeholder-muted resize-none focus:outline-none focus:border-primary"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {streaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
