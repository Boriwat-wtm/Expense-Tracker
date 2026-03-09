import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, Download, Calendar, Filter } from "lucide-react";
import api from "@/lib/api";
import type { Transaction, TransactionSource, TransactionType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function generateMonthOptions(): Array<{ value: string; label: string }> {
  const opts: Array<{ value: string; label: string }> = [{ value: "all", label: "ทั้งหมด" }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    opts.push({
      value: `${y}-${String(m).padStart(2, "0")}`,
      label: `${THAI_MONTHS[m - 1]} ${y + 543}`,
    });
  }
  return opts;
}

const MONTH_OPTIONS = generateMonthOptions();

const TYPE_LABELS: Record<TransactionType, string> = { income: "รายรับ", expense: "รายจ่าย" };
const SOURCE_LABELS: Record<TransactionSource, string> = { slip: "สลิป", pdf: "PDF", manual: "Manual" };

export default function Report() {
  const now = new Date();
  const [filterValue, setFilterValue] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [typeFilter, setTypeFilter] = useState<"" | TransactionType>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const selectedYear = filterValue === "all" ? undefined : parseInt(filterValue.split("-")[0]);
  const selectedMonth = filterValue === "all" ? undefined : parseInt(filterValue.split("-")[1]);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (selectedMonth) p.set("month", String(selectedMonth));
    if (selectedYear) p.set("year", String(selectedYear));
    if (typeFilter) p.set("type", typeFilter);
    return p.toString();
  }, [selectedMonth, selectedYear, typeFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ascending (oldest first) with high limit
      const params = new URLSearchParams();
      if (selectedMonth) params.set("month", String(selectedMonth));
      if (selectedYear) params.set("year", String(selectedYear));
      if (typeFilter) params.set("type", typeFilter);
      params.set("limit", "500");
      // Use start/end date range from month
      if (selectedMonth && selectedYear) {
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        params.set("start_date", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`);
        params.set("end_date", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
      }
      const { data } = await api.get<Transaction[]>(`/transactions?${params}`);
      // Sort ascending by date
      const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
      setTransactions(sorted);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = buildParams();
      const token = localStorage.getItem("access_token");
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${baseUrl}/transactions/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const label =
        selectedMonth && selectedYear
          ? `${THAI_MONTHS[selectedMonth - 1]}_${selectedYear}`
          : "ทั้งหมด";
      a.href = url;
      a.download = `รายงาน_${label}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const monthLabel =
    selectedMonth && selectedYear
      ? `${THAI_MONTHS[selectedMonth - 1]} ${selectedYear + 543}`
      : "ทั้งหมด";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-50 p-2.5 rounded-xl">
            <FileSpreadsheet size={22} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">สรุปรายงาน</h2>
            <p className="text-sm text-gray-400">{monthLabel}</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || transactions.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Download size={16} />
          {downloading ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด Excel"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600">
          <Filter size={15} /> ฟิลเตอร์
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {MONTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | TransactionType)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">ทุกประเภท</option>
            <option value="income">รายรับ</option>
            <option value="expense">รายจ่าย</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">รายรับรวม</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">รายจ่ายรวม</p>
          <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">ยอดคงเหลือ</p>
          <p className={`text-lg font-bold ${balance >= 0 ? "text-brand-700" : "text-red-600"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["#", "วันที่", "คำอธิบาย", "หมวดหมู่", "ประเภท", "Source", "จำนวนเงิน"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">กำลังโหลด...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">ไม่มีรายการในช่วงเวลานี้</td>
              </tr>
            ) : (
              <>
                {transactions.map((txn, i) => (
                  <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(txn.date)}</td>
                    <td className="px-4 py-2.5 text-gray-700 max-w-[220px] truncate">
                      {txn.description ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {txn.category ? (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {txn.category}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          txn.type === "income"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {TYPE_LABELS[txn.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{SOURCE_LABELS[txn.source]}</td>
                    <td
                      className={`px-4 py-2.5 font-semibold whitespace-nowrap text-right ${
                        txn.type === "income" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "−"}{formatCurrency(parseFloat(txn.amount))}
                    </td>
                  </tr>
                ))}
                {/* Summary footer */}
                <tr className="bg-green-50 border-t-2 border-green-200">
                  <td colSpan={6} className="px-4 py-2.5 text-right text-sm font-semibold text-green-700">
                    รายรับรวม
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-green-700">
                    {formatCurrency(totalIncome)}
                  </td>
                </tr>
                <tr className="bg-red-50">
                  <td colSpan={6} className="px-4 py-2.5 text-right text-sm font-semibold text-red-600">
                    รายจ่ายรวม
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-red-600">
                    {formatCurrency(totalExpense)}
                  </td>
                </tr>
                <tr className="bg-brand-50 border-t border-brand-200">
                  <td colSpan={6} className="px-4 py-2.5 text-right text-sm font-bold text-brand-700">
                    ยอดคงเหลือ
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right text-base font-bold ${
                      balance >= 0 ? "text-brand-700" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(balance)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        แสดง {transactions.length} รายการ • เรียงจากวันแรก → วันสุดท้าย
      </p>
    </div>
  );
}
