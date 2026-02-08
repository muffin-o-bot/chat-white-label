'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Codigo invalido');
        return;
      }

      router.push('/chat');
      router.refresh();
    } catch {
      setError('Erro de conexao');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-heading mb-2 text-center">
            Chat IA
          </h1>
          <p className="text-muted text-center mb-6">
            Digite o codigo de acesso
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-4 bg-surface-alt border border-gray-700 rounded-lg text-heading text-center text-xl tracking-widest focus:outline-none focus:border-primary"
                placeholder="CODIGO"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
