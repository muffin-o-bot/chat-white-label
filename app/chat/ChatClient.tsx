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
  Paperclip,
  FileText,
  Image as ImageIcon,
  Mic,
  MicOff,
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

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
    if ((!input.trim() && attachments.length === 0) || streaming) return;

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

    // Build message content with attachment info
    let messageContent = input.trim();
    const attachmentNames = attachments.map(f => f.name);
    
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageContent + (attachmentNames.length > 0 ? `\n\n[Anexos: ${attachmentNames.join(', ')}]` : ''),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
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
      // Convert files to base64 for processing
      const attachmentsWithData = await Promise.all(
        currentAttachments.map(async (file) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // Remove data URL prefix to get just base64
              resolve(result.split(',')[1] || '');
            };
            reader.readAsDataURL(file);
          });
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
          };
        })
      );

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          message: messageContent || `[Enviou ${currentAttachments.length} arquivo(s)]`,
          attachments: attachmentsWithData,
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
  }, [input, streaming, currentThreadId, attachments]);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      setAttachments(prev => [...prev, ...Array.from(files)]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  function getFileIcon(file: File) {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  }

  async function toggleRecording() {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setIsRecording(false);
      setRecordingTime(0);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // Add as attachment with transcription note
            const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
            setAttachments(prev => [...prev, audioFile]);
            setInput(prev => prev + (prev ? ' ' : '') + '[Audio gravado - clique enviar]');
          }
        };
        
        mediaRecorder.start(1000); // Collect data every second
        setIsRecording(true);
        
        // Update recording time
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Nao foi possivel acessar o microfone. Verifique as permissoes.');
      }
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
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  {file.type.startsWith('image/') ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-alt">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeAttachment(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface-alt rounded-lg text-sm">
                      {getFileIcon(file)}
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-muted hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            {/* Attachment button using label for better iOS support */}
            <label
              className="px-3 py-3 bg-surface-alt hover:bg-gray-700 text-muted rounded-xl transition-colors cursor-pointer"
              title="Anexar arquivo"
            >
              <Paperclip className="w-5 h-5" />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,audio/*,video/*"
              />
            </label>
            
            {/* Voice recording button */}
            <button
              onClick={toggleRecording}
              className={`px-3 py-3 rounded-xl transition-colors flex items-center gap-2 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-surface-alt hover:bg-gray-700 text-muted'
              }`}
              title={isRecording ? "Parar gravacao" : "Gravar audio"}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5" />
                  <span className="text-sm">{recordingTime}s</span>
                </>
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
            
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
              disabled={(!input.trim() && attachments.length === 0) || streaming}
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
