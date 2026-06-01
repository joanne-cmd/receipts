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

type FilterPill = 'all' | 'pending' | 'approved' | 'sent' | 'resolved';

const FILTER_STATUSES: Record<FilterPill, DisputeStatus[] | null> = {
  all: null,
  pending: ['pending_classification', 'pending_approval'],
  approved: ['approved'],
  sent: ['sent', 'awaiting_response', 'drafting_escalation'],
  resolved: ['resolved_won', 'resolved_lost', 'resolved_partial', 'referred_to_lawyer', 'cancelled'],
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
  const [activeFilter, setActiveFilter] = useState<FilterPill>('all');

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

  const filterStatuses = FILTER_STATUSES[activeFilter];
  const visibleDisputes = filterStatuses
    ? disputes.filter((d) => (filterStatuses as DisputeStatus[]).includes(d.status))
    : disputes;

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
      {/* Back link */}
      <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors block mb-1">
        ← Back to home
      </a>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your Disputes</h1>
        <Button
          onClick={() => { setShowForm((v) => !v); setFormError(null); setExtracted(EMPTY_EXTRACTED); }}
        >
          New Dispute
        </Button>
      </div>

      {/* New dispute form */}
      {showForm && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">New Dispute</CardTitle>
              <button
                type="button"
                aria-label="Close"
                onClick={() => { setShowForm(false); setFormError(null); setForm(EMPTY_FORM); setExtracted(EMPTY_EXTRACTED); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Receipt / Order Email</label>
                <Textarea
                  required
                  placeholder="Paste the receipt or order confirmation email here..."
                  className="min-h-[150px]"
                  value={form.receipt_raw}
                  onChange={(e) => setForm((f) => ({ ...f, receipt_raw: e.target.value }))}
                  onBlur={handleReceiptBlur}
                />
                {extracting && (
                  <p className="text-xs text-gray-400 italic">Detecting merchant…</p>
                )}
                {!extracting && extracted.merchant_name && (
                  <p className="text-xs font-medium text-green-600">
                    ✓ Merchant detected: {extracted.merchant_name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Amount Disputed (USD){' '}
                  <span className="font-normal text-gray-400">(optional)</span>
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

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowForm(false); setFormError(null); setForm(EMPTY_FORM); setExtracted(EMPTY_EXTRACTED); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Dispute'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Open Disputes
          </p>
          <p className="text-4xl font-bold text-gray-900">{loading ? '—' : openCount}</p>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Total Disputed
          </p>
          <p className="text-4xl font-bold text-gray-900">
            {loading ? '—' : formatCurrency(totalDisputed)}
          </p>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Total Recovered
          </p>
          <p className="text-4xl font-bold text-green-600">
            {loading ? '—' : formatCurrency(totalRecovered)}
          </p>
        </div>
      </div>

      {/* Filter pills + disputes table */}
      {(loading || disputes.length > 0) && (
        <>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'sent', 'resolved'] as FilterPill[]).map((pill) => (
              <button
                key={pill}
                onClick={() => setActiveFilter(pill)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors',
                  activeFilter === pill
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {pill}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading disputes…</p>
          ) : visibleDisputes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No disputes match this filter.</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Merchant
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Last Updated
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDisputes.map((dispute) => (
                    <TableRow key={String(dispute._id)} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="py-4">
                        <span className="font-semibold text-gray-900">
                          {dispute.merchant_display ?? dispute.merchant ?? '—'}
                        </span>
                        {dispute.issue_type && (
                          <span className="block text-xs text-gray-400 font-normal capitalize mt-0.5">
                            {dispute.issue_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700">
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
                      <TableCell className="text-right">
                        <Link
                          href={`/disputes/${String(dispute._id)}`}
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'sm' }),
                            'text-xs text-gray-500 hover:text-gray-900',
                          )}
                        >
                          View →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

