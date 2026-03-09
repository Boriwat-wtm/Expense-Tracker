import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, CheckCircle, XCircle, Filter } from "lucide-react";
import api from "@/lib/api";
import type { Transaction, TransactionSource, TransactionType } from "@/types";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "à¸£à¸²à¸¢à¸£à¸±à¸š",
  expense: "à¸£à¸²à¸¢à¸ˆà¹ˆà¸²à¸¢",
};

const SOURCE_CONFIG: Record<TransactionSource, { label: string; bg: string; color: string }> = {
  slip:   { label: "à¸ªà¸¥à¸´à¸›",        bg: "#EFF6FF", color: "#2563EB" },
  pdf:    { label: "Statement",   bg: "#F0FDF4", color: "#16A34A" },
  merged: { label: "à¸¢à¸·à¸™à¸¢à¸±à¸™à¹à¸¥à¹‰à¸§ âœ“", bg: "#F5F3FF", color: "#7C3AED" },
  manual: { label: "Manual",      bg: "var(--badge-bg)", color: "var(--badge-text)" },
};

const CATEGORIES = [
  "", "à¸­à¸²à¸«à¸²à¸£", "à¹€à¸”à¸´à¸™à¸—à¸²à¸‡", "à¸Šà¹‰à¸­à¸›à¸›à¸´à¹‰à¸‡", "à¸„à¸§à¸²à¸¡à¸šà¸±à¸™à¹€à¸—à¸´à¸‡",
  "à¸ªà¸¸à¸‚à¸ à¸²à¸ž", "à¸à¸²à¸£à¸¨à¸¶à¸à¸©à¸²", "à¸—à¸µà¹ˆà¸žà¸±à¸", "à¸ªà¸²à¸˜à¸²à¸£à¸“à¸¹à¸›à¹‚à¸ à¸„", "à¸­à¸­à¸¡à¸—à¸£à¸±à¸žà¸¢à¹Œ", "à¸­à¸·à¹ˆà¸™à¹†",
];

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Transaction>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | TransactionType>("");
  const [sourceFilter, setSourceFilter] = useState<"" | TransactionSource>("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (typeFilter) params.set("type", typeFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      const { data } = await api.get<Transaction[]>(`/transactions?${params}`);
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, typeFilter, sourceFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const startEdit = (txn: Transaction) => {
    setEditId(txn.id);
    setEditFields({
      date: txn.date,
      transaction_time: txn.transaction_time ?? "",
      amount: txn.amount,
      description: txn.description ?? "",
      merchant_name: txn.merchant_name ?? "",
      category: txn.category ?? "",
      type: txn.type,
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const payload = {
      ...editFields,
      transaction_time: editFields.transaction_time || null,
      description: editFields.description || null,
      merchant_name: editFields.merchant_name || null,
      category: editFields.category || null,
    };
    await api.put(`/transactions/${editId}`, payload);
    setEditId(null);
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/transactions/${id}`);
    setDeleteId(null);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const patchCategory = async (id: string, category: string) => {
    await api.put(`/transactions/${id}`, { category: category || null });
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: category || null } : t))
    );
  };

  const COLS = 7; // total columns

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸˜à¸¸à¸£à¸à¸£à¸£à¸¡</h2>

      {/* Filters */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-3 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          <Filter size={16} /> à¸Ÿà¸´à¸¥à¹€à¸•à¸­à¸£à¹Œ
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | TransactionType)}
            className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
          >
            <option value="">à¸—à¸¸à¸à¸›à¸£à¸°à¹€à¸ à¸—</option>
            <option value="income">à¸£à¸²à¸¢à¸£à¸±à¸š</option>
            <option value="expense">à¸£à¸²à¸¢à¸ˆà¹ˆà¸²à¸¢</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as "" | TransactionSource)}
            className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
          >
            <option value="">à¸—à¸¸à¸ Source</option>
            <option value="slip">à¸ªà¸¥à¸´à¸›</option>
            <option value="pdf">Statement</option>
            <option value="merged">à¸¢à¸·à¸™à¸¢à¸±à¸™à¹à¸¥à¹‰à¸§</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--nav-hover)", borderBottom: "1px solid var(--border)" }}>
            <tr>
              {["à¸§à¸±à¸™à¸—à¸µà¹ˆ/à¹€à¸§à¸¥à¸²", "à¸£à¸²à¸¢à¸à¸²à¸£", "à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™", "à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆ", "à¸›à¸£à¸°à¹€à¸ à¸—", "Source", "à¸ˆà¸±à¸”à¸à¸²à¸£"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={COLS} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£
                </td>
              </tr>
            ) : (
              transactions.map((txn) =>
                editId === txn.id ? (
                  /* â”€â”€ Edit row â”€â”€ */
                  <tr key={txn.id} style={{ backgroundColor: "var(--primary-light)", borderBottom: "1px solid var(--border)" }}>
                    {/* Date + Time */}
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={editFields.date ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, date: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-34 block mb-1"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                      />
                      <input
                        type="time"
                        value={editFields.transaction_time ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, transaction_time: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-28 block"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                      />
                    </td>
                    {/* Description + Merchant */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={editFields.description ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, description: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-44 block mb-1"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                        placeholder="à¸šà¸±à¸™à¸—à¸¶à¸à¸Šà¹ˆà¸§à¸¢à¸ˆà¸³"
                      />
                      <input
                        type="text"
                        value={editFields.merchant_name ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, merchant_name: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-44 block"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                        placeholder="à¸Šà¸·à¹ˆà¸­à¸£à¹‰à¸²à¸™/à¸œà¸¹à¹‰à¸£à¸±à¸š"
                      />
                    </td>
                    {/* Amount */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={editFields.amount ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, amount: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-28"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                        step="0.01"
                      />
                    </td>
                    {/* Category */}
                    <td className="px-3 py-2">
                      <select
                        value={editFields.category ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, category: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c || "â€” à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸ â€”"}</option>
                        ))}
                      </select>
                    </td>
                    {/* Type */}
                    <td className="px-3 py-2">
                      <select
                        value={editFields.type ?? "expense"}
                        onChange={(e) => setEditFields((p) => ({ ...p, type: e.target.value as TransactionType }))}
                        className="border rounded px-2 py-1 text-sm"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                      >
                        <option value="income">à¸£à¸²à¸¢à¸£à¸±à¸š</option>
                        <option value="expense">à¸£à¸²à¸¢à¸ˆà¹ˆà¸²à¸¢</option>
                      </select>
                    </td>
                    {/* Source (read-only in edit) */}
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      {SOURCE_CONFIG[txn.source]?.label ?? txn.source}
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={saveEdit} style={{ color: "var(--income)" }} className="hover:opacity-70">
                          <CheckCircle size={18} />
                        </button>
                        <button onClick={() => setEditId(null)} style={{ color: "var(--text-muted)" }} className="hover:opacity-70">
                          <XCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* â”€â”€ View row â”€â”€ */
                  <tr key={txn.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                    {/* Date + Time */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm" style={{ color: "var(--text)" }}>{formatDate(txn.date)}</p>
                      {txn.transaction_time && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{formatTime(txn.transaction_time)}</p>
                      )}
                    </td>
                    {/* Description + Merchant */}
                    <td className="px-4 py-3 max-w-[240px]">
                      {txn.description && (
                        <p className="font-medium truncate" style={{ color: "var(--text)" }}>{txn.description}</p>
                      )}
                      {txn.merchant_name && (
                        <p className={`text-xs truncate ${txn.description ? "mt-0.5" : ""}`} style={{ color: "var(--text-muted)" }}>
                          {txn.merchant_name}
                        </p>
                      )}
                      {!txn.description && !txn.merchant_name && (
                        <span style={{ color: "var(--text-muted)" }}>â€”</span>
                      )}
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: txn.type === "income" ? "var(--income)" : "var(--expense)" }}>
                      {txn.type === "income" ? "+" : "âˆ’"}{formatCurrency(txn.amount)}
                    </td>
                    {/* Category â€” inline editable */}
                    <td className="px-4 py-3">
                      <select
                        value={txn.category ?? ""}
                        onChange={(e) => patchCategory(txn.id, e.target.value)}
                        className="text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c || "â€” à¸£à¸°à¸šà¸¸ â€”"}</option>
                        ))}
                      </select>
                    </td>
                    {/* Type badge */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: txn.type === "income" ? "var(--income-bg)" : "var(--expense-bg)",
                          color: txn.type === "income" ? "var(--income)" : "var(--expense)",
                        }}
                      >
                        {TYPE_LABELS[txn.type]}
                      </span>
                    </td>
                    {/* Source badge */}
                    <td className="px-4 py-3">
                      {(() => {
                        const cfg = SOURCE_CONFIG[txn.source] ?? SOURCE_CONFIG.manual;
                        return (
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(txn)}
                          className="hover:opacity-70 transition-opacity"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Pencil size={16} />
                        </button>
                        {deleteId === txn.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(txn.id)}
                              className="text-xs font-medium hover:opacity-80"
                              style={{ color: "var(--expense)" }}
                            >
                              à¸¢à¸·à¸™à¸¢à¸±à¸™
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="text-xs hover:opacity-80"
                              style={{ color: "var(--text-muted)" }}
                            >
                              à¸¢à¸à¹€à¸¥à¸´à¸
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(txn.id)}
                            className="hover:opacity-70 transition-opacity"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
