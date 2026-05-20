import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Receipts — AI Dispute Agent',
  description: 'Manage your consumer disputes with AI assistance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <nav className="border-b bg-white px-6 py-3 flex items-center gap-6">
          <span className="font-semibold text-lg tracking-tight">Receipts</span>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Disputes
          </a>
          <a href="/recovered" className="text-sm text-muted-foreground hover:text-foreground">
            Recovery
          </a>
        </nav>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
