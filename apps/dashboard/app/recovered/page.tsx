import { MOCK_DISPUTES } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function RecoveredPage() {
  const resolved = MOCK_DISPUTES.filter((d) => d.status === 'resolved_won');

  const totalRecovered = resolved.reduce((sum, d) => sum + (d.amount_recovered ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Recovery Dashboard</h1>

      {/* Hero number */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <p className="text-lg text-green-700">
            {"You've recovered "}
            <span className="text-4xl font-bold text-green-800">
              {formatCurrency(totalRecovered)}
            </span>
            {` across ${resolved.length} dispute${resolved.length !== 1 ? 's' : ''}.`}
          </p>
        </CardContent>
      </Card>

      {/* Table of resolved disputes */}
      <Card>
        <CardHeader>
          <CardTitle>Won Disputes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {resolved.length === 0 ? (
            <p className="p-6 text-muted-foreground text-sm">No resolved disputes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Disputed</TableHead>
                  <TableHead>Recovered</TableHead>
                  <TableHead>Date Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolved.map((dispute) => {
                  const resolvedEvent = dispute.timeline
                    .slice()
                    .reverse()
                    .find((e) => e.event.toLowerCase().includes('resolved'));

                  return (
                    <TableRow key={dispute._id}>
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
                      <TableCell className="text-green-700 font-medium">
                        {dispute.amount_recovered != null
                          ? formatCurrency(dispute.amount_recovered)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {resolvedEvent
                          ? new Date(resolvedEvent.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : new Date(dispute.updated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
