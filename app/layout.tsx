import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chat White Label',
  description: 'AI Chat Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#0f0f1a]">{children}</body>
    </html>
  );
}
