export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="border-b bg-white px-6 py-3 flex items-center gap-6">
        <a href="/" className="font-semibold text-lg tracking-tight">🧾 Receipts</a>
        <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          Disputes
        </a>
        <a href="/recovered" className="text-sm text-muted-foreground hover:text-foreground">
          Recovery
        </a>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </>
  );
}
