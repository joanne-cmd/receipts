'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Dispute, DisputeStatus } from '@/lib/mock-data';

function statusBadgeVariant(
  status: DisputeStatus,
): 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'gray' {
  switch (status) {
    case 'pending_approval':
    case 'pending_classification':
      return 'yellow';
    case 'approved':
    case 'sent':
      return 'blue';
    case 'awaiting_response':
    case 'drafting_escalation':
      return 'purple';
    case 'resolved_won':
      return 'green';
    case 'resolved_lost':
    case 'referred_to_lawyer':
      return 'red';
    default:
      return 'gray';
  }
}

function statusLabel(status: DisputeStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

const CLOSED_STATUSES = new Set([
  'resolved_won',
  'resolved_lost',
  'resolved_partial',
  'cancelled',
  'referred_to_lawyer',
]);

type Extracted = {
  merchant_name: string | null;
  merchant_support_email: string | null;
  amount: number | null;
  issue_type: string | null;
};

const EMPTY_FORM = {
  receipt_raw: '',
  amount_disputed: '',
};

const EMPTY_EXTRACTED: Extracted = {
  merchant_name: null,
  merchant_support_email: null,
  amount: null,
  issue_type: null,
};

export default function InboxPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted>(EMPTY_EXTRACTED);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    fetch('/api/disputes')
      .then((r) => r.json())
      .then((data: Dispute[]) => setDisputes(data))
      .catch(() => setDisputes([]))
      .finally(() => setLoading(false));
  }, []);

  const openCount = disputes.filter((d) => !CLOSED_STATUSES.has(d.status)).length;
  const totalDisputed = disputes.reduce((sum, d) => sum + (d.amount_disputed ?? 0), 0);
  const totalRecovered = disputes.reduce((sum, d) => sum + (d.amount_recovered ?? 0), 0);

  async function handleReceiptBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    if (text.length < 50) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_raw: text }),
      });
      if (!res.ok) return;
      const data = await res.json() as Extracted;
      setExtracted(data);
      if (data.amount != null && !form.amount_disputed) {
        setForm((f) => ({ ...f, amount_disputed: String(data.amount) }));
      }
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        receipt_raw: form.receipt_raw,
        merchant_email: extracted.merchant_support_email ?? '',
        merchant_display: extracted.merchant_name ?? '',
      };
      if (form.amount_disputed.trim()) body.amount_disputed = parseFloat(form.amount_disputed);
      if (extracted.issue_type) body.issue_type = extracted.issue_type;

      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed to create dispute');
      }

      const created = await res.json() as Dispute;
      setDisputes((prev) => [created, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setExtracted(EMPTY_EXTRACTED);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Disputes</h1>
        <Button onClick={() => { setShowForm((v) => !v); setFormError(null); setExtracted(EMPTY_EXTRACTED); }}>
          New Dispute
        </Button>
      </div>

      {/* New dispute form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Dispute</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Receipt / Order Email</label>
                <Textarea
                  required
                  placeholder="Paste the receipt or order confirmation email here..."
                  className="min-h-[150px]"
                  value={form.receipt_raw}
                  onChange={(e) => setForm((f) => ({ ...f, receipt_raw: e.target.value }))}
                  onBlur={handleReceiptBlur}
                />
                {extracting && (
                  <p className="text-xs text-muted-foreground">Detecting merchant…</p>
                )}
                {!extracting && extracted.merchant_name && (
                  <p className="text-xs text-green-600">✓ Merchant detected: {extracted.merchant_name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Amount Disputed (USD) <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="89.99"
                  value={form.amount_disputed}
                  onChange={(e) => setForm((f) => ({ ...f, amount_disputed: e.target.value }))}
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Dispute'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setFormError(null); setForm(EMPTY_FORM); setExtracted(EMPTY_EXTRACTED); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? '—' : openCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Disputed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? '—' : formatCurrency(totalDisputed)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recovered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {loading ? '—' : formatCurrency(totalRecovered)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Disputes table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-muted-foreground text-sm">Loading disputes…</p>
          ) : disputes.length === 0 ? (
            <p className="p-6 text-muted-foreground text-sm">No disputes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={String(dispute._id)}>
                    <TableCell className="font-medium">
                      {dispute.merchant_display ?? dispute.merchant ?? '—'}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {dispute.issue_type?.replace(/_/g, ' ') ?? '—'}
                    </TableCell>
                    <TableCell>
                      {dispute.amount_disputed != null
                        ? formatCurrency(dispute.amount_disputed)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(dispute.status)}>
                        {statusLabel(dispute.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(dispute.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/disputes/${String(dispute._id)}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
