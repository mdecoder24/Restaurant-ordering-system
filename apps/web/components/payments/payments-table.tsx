"use client";

import { formatInr, paiseToInput, parseInr } from "@krudex/core/format";
import { CreditCard, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { refundPayment } from "@/lib/payments/actions";

export type PaymentRow = {
  id: string;
  method: string;
  provider: string;
  amount: number;
  refunded: number;
  pendingRefund: number;
  status: string;
  createdAt: string;
  reference: string | null;
  where: string;
};

const tone = { captured: "success", authorized: "info", failed: "danger", refunded: "neutral", created: "neutral" } as const;
const methodLabel: Record<string, string> = { cash: "Cash", card: "Card", upi: "UPI", online: "Online" };

export function PaymentsTable({ rows, page, pageCount }: { rows: PaymentRow[]; page: number; pageCount: number }) {
  const router = useRouter();
  const [target, setTarget] = useState<PaymentRow | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  return (
    <PageBody>
      <PageHeader title="Payments" description="Online, card, UPI and cash payments for this outlet. Refund from here." />
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments yet" description="Payments appear here as guests pay or staff settle bills." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Refunded</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const refundable = r.amount - r.refunded - r.pendingRefund;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap tabular">{new Date(r.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</TableCell>
                    <TableCell>{r.where}</TableCell>
                    <TableCell>
                      {methodLabel[r.method] ?? r.method}
                      {r.provider === "fake" ? <span className="ml-1 text-caption text-muted">(test)</span> : null}
                    </TableCell>
                    <TableCell>
                      <Badge tone={tone[r.status as keyof typeof tone] ?? "neutral"}>{r.status}</Badge>
                      {r.pendingRefund ? <span className="ml-2 text-caption text-muted">refund pending</span> : null}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatInr(r.amount)}</TableCell>
                    <TableCell className="text-right tabular">{r.refunded ? formatInr(r.refunded) : "–"}</TableCell>
                    <TableCell className="text-right">
                      {refundable > 0 && (r.status === "captured" || r.status === "refunded") ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTarget(r);
                            setAmount(paiseToInput(refundable));
                            setReason("");
                          }}
                        >
                          <Undo2 aria-hidden /> Refund
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {pageCount > 1 ? (
        <div className="flex justify-end">
          <Pagination page={page} pageCount={pageCount} onPageChange={(p) => router.push(`/app/payments?page=${p}`)} />
        </div>
      ) : null}

      <Dialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Refund payment"
        description={target?.provider === "manual" ? "Records a refund you hand back in person." : "Sends the refund through the payment gateway."}
        actions={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => {
                const paise = parseInr(amount);
                if (!paise || !target) return toast.error("Enter an amount.");
                start(async () => {
                  const r = await refundPayment(target.id, { amount: paise, reason });
                  if (r.ok) {
                    toast.success(`Refund of ${formatInr(paise)} started`);
                    setTarget(null);
                  } else toast.error(r.error);
                });
              }}
            >
              Refund
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Amount (₹)">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Reason">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Order cancelled" />
          </Field>
        </div>
      </Dialog>
    </PageBody>
  );
}
