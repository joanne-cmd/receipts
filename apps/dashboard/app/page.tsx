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
import { buttonVariants } from '@/components/ui/button';
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

export default function InboxPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Your Disputes</h1>

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
