"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { accountService } from "@/services/account.service";
import { useAuthStore } from "@/stores/auth.store";

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: string;
  subtotal: string;
  shipping_cost: string;
  po_number: string | null;
  order_notes: string | null;
  tracking_number: string | null;
  carrier: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

interface Comment {
  id: string;
  body: string;
  is_admin: boolean;
  author_name: string | null;
  created_at: string;
}

const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

const PAYMENT_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-yellow-100 text-yellow-700",
  pending: "bg-yellow-100 text-yellow-700",
  refunded: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-700",
};

function StatusTimeline({ status }: { status: string }) {
  const isCancelled = status === "cancelled" || status === "refunded";
  const currentIdx = STATUS_STEPS.indexOf(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-3">
        <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <span className="text-sm font-medium text-red-600 capitalize">{status}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-1 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? active
                      ? "bg-brand-600 text-white ring-2 ring-brand-300"
                      : "bg-brand-100 text-brand-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done && !active ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`text-xs capitalize whitespace-nowrap ${done ? "text-brand-700 font-medium" : "text-gray-400"}`}>
                {step}
              </span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-8 mt-[-12px] ${idx < currentIdx ? "bg-brand-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [loading, setLoading] = useState(true);
  const commentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated()) return;
    async function load() {
      setLoading(true);
      try {
        const [orderData, commentsData] = await Promise.all([
          accountService.getOrder(id) as Promise<Order>,
          accountService.getOrderComments(id) as Promise<Comment[]>,
        ]);
        setOrder(orderData);
        setComments(commentsData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, authLoading]);

  async function handleReorder() {
    setIsReordering(true);
    try {
      await accountService.reorder(id);
      router.push("/cart");
    } finally {
      setIsReordering(false);
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSendingComment(true);
    try {
      const newComment = await accountService.addOrderComment(id, commentBody.trim()) as Comment;
      setComments((prev) => [...prev, newComment]);
      setCommentBody("");
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } finally {
      setSendingComment(false);
    }
  }

  async function downloadPdf(type: "confirmation" | "invoice" | "ship-confirmation" | "pack-slip") {
  try {
    const session = sessionStorage.getItem("af_session");
    const token = session ? JSON.parse(session).token : null;
    if (!token) return;

    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders/${id}/pdf/${type}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) throw new Error("Failed");

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${order?.order_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert("Failed to download PDF. Please try again.");
  }
}

  if (loading || !order) {
    return <div className="py-12 text-center text-gray-400">Loading order…</div>;
  }

  const isShipped = ["shipped", "delivered"].includes(order.status);

  return (
    <div className="space-y-4">
      {/* Back + header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/account/orders")}
          className="text-sm text-brand-600 hover:text-brand-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Orders
        </button>
        <button
          onClick={handleReorder}
          disabled={isReordering}
          className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {isReordering ? "Adding…" : "Reorder"}
        </button>
      </div>

      {/* Order number + meta */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 font-mono">{order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Placed {new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
              {order.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${PAYMENT_COLORS[order.payment_status] ?? "bg-gray-100 text-gray-600"}`}>
              {order.payment_status}
            </span>
          </div>
        </div>

        <StatusTimeline status={order.status} />

        {/* PO / tracking */}
        {(order.po_number || order.tracking_number) && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
            {order.po_number && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">PO Number</p>
                <p className="text-sm font-medium text-gray-800">{order.po_number}</p>
              </div>
            )}
            {order.tracking_number && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Tracking</p>
                <p className="text-sm font-mono font-medium text-gray-800">{order.tracking_number}</p>
                {order.carrier && <p className="text-xs text-gray-400">{order.carrier}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF downloads */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Documents</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadPdf("confirmation")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Order Confirmation
          </button>
          <button
            onClick={() => downloadPdf("invoice")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Invoice
          </button>
          {isShipped && (
            <button
              onClick={() => downloadPdf("ship-confirmation")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Ship Confirmation
            </button>
          )}
          <button
            onClick={() => downloadPdf("pack-slip")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Packing Slip
          </button>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Items ({order.items.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">SKU</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Product</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs">Qty</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs">Unit</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku}</td>
                <td className="px-4 py-3 text-gray-800">
                  {item.product_name}
                  {(item.color || item.size) && (
                    <span className="text-gray-400 text-xs ml-1.5">
                      {[item.color, item.size].filter(Boolean).join(" / ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-600">${Number(item.unit_price).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">${Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Totals */}
        <div className="px-4 py-4 border-t border-gray-100 text-sm text-right space-y-1.5">
          <p className="text-gray-500">
            Subtotal: <span className="text-gray-800 font-medium">${Number(order.subtotal).toFixed(2)}</span>
          </p>
          <p className="text-gray-500">
            Shipping: <span className="text-gray-800 font-medium">${Number(order.shipping_cost).toFixed(2)}</span>
          </p>
          <p className="text-base font-bold text-gray-900">
            Total: ${Number(order.total).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Notes */}
      {order.order_notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Order Notes</h2>
          <p className="text-sm text-gray-600">{order.order_notes}</p>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Messages {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No messages yet. Add a note or question about this order.</p>
        ) : (
          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg p-3 text-sm ${
                  c.is_admin
                    ? "bg-blue-50 border border-blue-100"
                    : "bg-gray-50 border border-gray-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {c.is_admin && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      AF Apparels
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {c.author_name ?? (c.is_admin ? "Support" : "You")} ·{" "}
                    {new Date(c.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
            <div ref={commentEndRef} />
          </div>
        )}

        <form onSubmit={handleSendComment} className="flex gap-2">
          <input
            type="text"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a note or question…"
            maxLength={2000}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={!commentBody.trim() || sendingComment}
            className="rounded-md bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingComment ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
