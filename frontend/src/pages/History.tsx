import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, CheckCircle, XCircle, Filter } from "lucide-react";
import api from "@/lib/api";
import type { Transaction, TransactionSource, TransactionType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
};

const SOURCE_LABELS: Record<TransactionSource, string> = {
  slip: "สลิป",
  pdf: "PDF",
  manual: "Manual",
};

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
    setEditFields({ date: txn.date, amount: txn.amount, description: txn.description ?? "", type: txn.type });
  };

  const saveEdit = async () => {
    if (!editId) return;
    await api.put(`/transactions/${editId}`, editFields);
    setEditId(null);
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/transactions/${id}`);
    setDeleteId(null);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900">ประวัติธุรกรรม</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600">
          <Filter size={16} /> ฟิลเตอร์
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="วันเริ่มต้น"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="วันสิ้นสุด"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | TransactionType)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">ทุกประเภท</option>
            <option value="income">รายรับ</option>
            <option value="expense">รายจ่าย</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as "" | TransactionSource)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">ทุก Source</option>
            <option value="slip">สลิป</option>
            <option value="pdf">PDF</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["วันที่", "คำอธิบาย", "ยอดเงิน", "ประเภท", "Source", "จัดการ"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  ยังไม่มีรายการ
                </td>
              </tr>
            ) : (
              transactions.map((txn) =>
                editId === txn.id ? (
                  <tr key={txn.id} className="bg-blue-50">
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={editFields.date ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, date: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-36"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editFields.description ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, description: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-48"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editFields.amount ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, amount: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-28"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editFields.type ?? "expense"}
                        onChange={(e) =>
                          setEditFields((p) => ({ ...p, type: e.target.value as TransactionType }))
                        }
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="income">รายรับ</option>
                        <option value="expense">รายจ่าย</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{SOURCE_LABELS[txn.source]}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                        <CheckCircle size={18} />
                      </button>
                      <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">
                        <XCircle size={18} />
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{formatDate(txn.date)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {txn.description ?? "-"}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        txn.type === "income" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "-"}
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          txn.type === "income"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {TYPE_LABELS[txn.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {SOURCE_LABELS[txn.source]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(txn)}
                          className="text-gray-400 hover:text-brand-600 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        {deleteId === txn.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(txn.id)}
                              className="text-red-600 hover:text-red-700 text-xs font-medium"
                            >
                              ยืนยัน
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(txn.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
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
