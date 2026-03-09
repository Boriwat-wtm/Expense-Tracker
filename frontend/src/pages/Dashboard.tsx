import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Users, ImageIcon, Calendar } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import DashboardCharts from "@/components/DashboardCharts";
import { formatCurrency, formatDate } from "@/lib/utils";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function generateMonthOptions(): Array<{ value: string; label: string }> {
  const opts: Array<{ value: string; label: string }> = [{ value: "all", label: "ทั้งหมด" }];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
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

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

function StatCard({ title, value, icon, color, bg }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`${bg} p-3 rounded-xl`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const now = new Date();
  const [filterValue, setFilterValue] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const selectedYear = filterValue === "all" ? undefined : parseInt(filterValue.split("-")[0]);
  const selectedMonth = filterValue === "all" ? undefined : parseInt(filterValue.split("-")[1]);

  const { summary, monthly, recent, categoryBreakdown, loading, error } = useDashboard(
    selectedMonth,
    selectedYear
  );

  const monthLabel =
    selectedMonth && selectedYear
      ? ` ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear + 543}`
      : "";

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error || !summary || !monthly)
    return <p className="text-red-500">{error ?? "ไม่สามารถโหลดข้อมูลได้"}</p>;

  const masterPct = Math.min(
    100,
    Math.round((summary.master_quota_used / summary.master_quota_limit) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Header with month filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={`รายรับ${monthLabel}`}
          value={formatCurrency(summary.total_income)}
          icon={<TrendingUp size={22} className="text-green-600" />}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          title={`รายจ่าย${monthLabel}`}
          value={formatCurrency(summary.total_expense)}
          icon={<TrendingDown size={22} className="text-red-500" />}
          color="text-red-500"
          bg="bg-red-50"
        />
        <StatCard
          title={`ยอดคงเหลือ${monthLabel}`}
          value={formatCurrency(summary.balance)}
          icon={<Wallet size={22} className="text-brand-600" />}
          color={summary.balance >= 0 ? "text-brand-700" : "text-red-600"}
          bg="bg-brand-50"
        />
        {/* Per-user OCR usage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-purple-50 p-3 rounded-xl">
              <ImageIcon size={22} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">OCR ของฉันเดือนนี้</p>
              <p className="font-bold text-gray-900">{summary.ocr_quota_used} รูป</p>
            </div>
          </div>
        </div>
      </div>

      {/* Master Quota shared pool */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2.5 rounded-xl">
              <Users size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">โควต้า OCR รวม (Master Pool)</p>
              <p className="text-xs text-gray-500">
                ทุก User ใช้ร่วมกัน — reset ต้นเดือน
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {summary.master_quota_remaining.toLocaleString()}
              <span className="text-sm font-normal text-gray-500 ml-1">รูปที่เหลือ</span>
            </p>
            <p className="text-xs text-gray-400">
              ใช้ไปแล้ว {summary.master_quota_used} / {summary.master_quota_limit} รูป
            </p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              masterPct >= 90
                ? "bg-red-500"
                : masterPct >= 70
                ? "bg-orange-400"
                : "bg-green-500"
            }`}
            style={{ width: `${masterPct}%` }}
          />
        </div>
        {masterPct >= 90 && (
          <p className="text-xs text-red-500 mt-2 font-medium">
            ⚠️ โควต้าใกล้หมด! เหลือ {summary.master_quota_remaining} รูปเท่านั้น
          </p>
        )}
        {summary.master_quota_remaining === 0 && (
          <p className="text-xs text-red-600 mt-2 font-bold">
            🚫 โควต้าหมดแล้ว — ไม่สามารถใช้ OCR ได้จนกว่าจะถึงต้นเดือนหน้า
          </p>
        )}
      </div>

      {/* Charts */}
      <DashboardCharts
        summary={summary}
        monthly={monthly}
        categoryBreakdown={categoryBreakdown}
      />

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">
          รายการล่าสุด{monthLabel && ` — ${monthLabel.trim()}`}
        </h3>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">ไม่มีรายการในช่วงเวลานี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 text-left">
                  <th className="pb-2 pr-4 font-medium">วันที่</th>
                  <th className="pb-2 pr-4 font-medium">รายการ</th>
                  <th className="pb-2 pr-4 font-medium">หมวดหมู่</th>
                  <th className="pb-2 text-right font-medium">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((txn) => (
                  <tr key={txn.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                      {formatDate(txn.date)}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700 max-w-[200px] truncate">
                      {txn.description || "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {txn.category ? (
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {txn.category}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 text-right font-semibold whitespace-nowrap ${
                        txn.type === "income" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "-"}
                      {formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
