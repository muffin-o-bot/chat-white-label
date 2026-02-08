'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

interface SettingsClientProps {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  personalization: {
    displayName: string | null;
    tone: string | null;
    instructions: string | null;
    model: string | null;
  } | null;
}

export default function SettingsClient({
  user,
  personalization,
}: SettingsClientProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    personalization?.displayName || user.name || ''
  );
  const [tone, setTone] = useState(personalization?.tone || 'friendly');
  const [instructions, setInstructions] = useState(
    personalization?.instructions || ''
  );
  const [model, setModel] = useState(
    personalization?.model || 'gemini-2.0-flash-001'
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, tone, instructions, model }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao salvar');
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Erro de conexao');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <header className="h-14 border-b border-gray-800 flex items-center px-4 gap-3">
        <button
          onClick={() => router.push('/chat')}
          className="p-2 hover:bg-surface-alt rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-heading font-medium">Preferencias do Chat</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-4">
            Preferencias salvas com sucesso!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-medium text-heading mb-4">
              Personalizacao
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">
                  Como o chat deve te chamar
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-alt border border-gray-700 rounded-lg text-heading focus:outline-none focus:border-primary"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">
                  Tom de voz
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-alt border border-gray-700 rounded-lg text-heading focus:outline-none focus:border-primary"
                >
                  <option value="friendly">Amigavel</option>
                  <option value="professional">Profissional</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">
                  Instrucoes personalizadas (agent.md)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-surface-alt border border-gray-700 rounded-lg text-heading focus:outline-none focus:border-primary resize-none"
                  placeholder="Instrucoes especificas para o assistente..."
                />
                <p className="text-xs text-muted mt-1">
                  Essas instrucoes serao incluidas em todas as conversas.
                </p>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">
                  Modelo de IA
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-alt border border-gray-700 rounded-lg text-heading focus:outline-none focus:border-primary"
                >
                  <option value="gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {loading ? 'Salvando...' : 'Salvar Preferencias'}
          </button>
        </form>
      </main>
    </div>
  );
}
