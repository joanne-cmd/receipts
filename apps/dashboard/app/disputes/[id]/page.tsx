import { notFound } from 'next/navigation';
import { MOCK_DISPUTES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DisputeStatus } from '@/lib/mock-data';

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

interface PageProps {
  params: { id: string };
}

export default function DisputeDetailPage({ params }: PageProps) {
  const dispute = MOCK_DISPUTES.find((d) => d._id === params.id);

  if (!dispute) notFound();

  const currentDraft = dispute.drafts.find(
    (d) => d.version === dispute.current_draft_version,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {dispute.merchant_display ?? dispute.merchant ?? 'Unknown Merchant'}
            {dispute.issue_type && (
              <span className="ml-2 text-muted-foreground font-normal text-lg capitalize">
                — {dispute.issue_type.replace(/_/g, ' ')}
              </span>
            )}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            {dispute.amount_disputed != null && (
              <Badge variant="outline" className="text-base px-3 py-1">
                {formatCurrency(dispute.amount_disputed)} disputed
              </Badge>
            )}
            <Badge variant={statusBadgeVariant(dispute.status)}>
              {dispute.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Badge>
          </div>
        </div>
        <a href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
          ← Back
        </a>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-border ml-2 space-y-4">
              {dispute.timeline.map((event, i) => (
                <li key={i} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-primary" />
                  <time className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  <p className="text-sm mt-0.5">{event.event}</p>
                  <span className="text-xs text-muted-foreground capitalize">{event.actor}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Receipt */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="rounded-md bg-muted p-4 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
              {dispute.receipt_raw}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Current draft */}
      {currentDraft && (
        <Card>
          <CardHeader>
            <CardTitle>
              Draft v{currentDraft.version}
              {currentDraft.approved_at && (
                <Badge variant="green" className="ml-2 text-xs">
                  Approved
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
              <p className="font-medium">{currentDraft.subject}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
              <Textarea
                readOnly
                value={currentDraft.body}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Draft actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => console.log('Approve draft', currentDraft.version)}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => console.log('Edit draft', currentDraft.version)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => console.log('Reject draft', currentDraft.version)}
              >
                Reject
              </Button>
            </div>

            {/* Citations */}
            {currentDraft.citations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Citations</p>
                <ul className="space-y-1">
                  {currentDraft.citations.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs capitalize">
                        {c.type}
                      </Badge>
                      <span>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Merchant responses */}
      {dispute.merchant_responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Merchant Responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dispute.merchant_responses.map((r, i) => (
              <div key={i} className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {r.classification.replace(/_/g, ' ')}
                  </Badge>
                  {r.amount_offered != null && (
                    <span className="text-sm text-green-600 font-medium">
                      {formatCurrency(r.amount_offered)} offered
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(r.received_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{r.raw_text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function generateStaticParams() {
  return MOCK_DISPUTES.map((d) => ({ id: d._id }));
}
