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
  valueColor: string; // CSS variable string e.g. "var(--income)"
  bg: string;
}

function StatCard({ title, value, icon, valueColor, bg }: StatCardProps) {
  return (
    <div className="rounded-xl border p-5 flex items-center gap-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
      <div className={`${bg} p-3 rounded-xl`}>{icon}</div>
      <div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{title}</p>
        <p className="text-xl font-bold" style={{ color: valueColor }}>{value}</p>
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
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h2>
        <div className="flex items-center gap-2">
          <Calendar size={18} style={{ color: "var(--text-muted)" }} />
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
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
          icon={<TrendingUp size={22} style={{ color: "var(--income)" }} />}
          valueColor="var(--income)"
          bg="bg-green-50"
        />
        <StatCard
          title={`รายจ่าย${monthLabel}`}
          value={formatCurrency(summary.total_expense)}
          icon={<TrendingDown size={22} style={{ color: "var(--expense)" }} />}
          valueColor="var(--expense)"
          bg="bg-red-50"
        />
        <StatCard
          title={`ยอดคงเหลือ${monthLabel}`}
          value={formatCurrency(summary.balance)}
          icon={<Wallet size={22} style={{ color: "var(--primary)" }} />}
          valueColor={summary.balance >= 0 ? "var(--income)" : "var(--expense)"}
          bg="bg-brand-50"
        />
        {/* Per-user OCR usage */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-purple-50 p-3 rounded-xl">
              <ImageIcon size={22} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>OCR ของฉันเดือนนี้</p>
              <p className="font-bold" style={{ color: "var(--text)" }}>{summary.ocr_quota_used} รูป</p>
            </div>
          </div>
        </div>
      </div>

      {/* Master Quota shared pool */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2.5 rounded-xl">
              <Users size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--text)" }}>โควต้า OCR รวม (Master Pool)</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                ทุก User ใช้ร่วมกัน — reset ต้นเดือน
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {summary.master_quota_remaining.toLocaleString()}
              <span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>รูปที่เหลือ</span>
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              ใช้ไปแล้ว {summary.master_quota_used} / {summary.master_quota_limit} รูป
            </p>
          </div>
        </div>
        <div className="w-full rounded-full h-3" style={{ backgroundColor: "var(--progress-track)" }}>
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
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <h3 className="font-semibold mb-4" style={{ color: "var(--text)" }}>
          รายการล่าสุด{monthLabel && ` — ${monthLabel.trim()}`}
        </h3>
        {recent.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>ไม่มีรายการในช่วงเวลานี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                  <th className="pb-2 pr-4 font-medium">วันที่</th>
                  <th className="pb-2 pr-4 font-medium">รายการ</th>
                  <th className="pb-2 pr-4 font-medium">หมวดหมู่</th>
                  <th className="pb-2 text-right font-medium">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((txn) => (
                  <tr key={txn.id} className="last:border-0 transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2.5 pr-4 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {formatDate(txn.date)}
                    </td>
                    <td className="py-2.5 pr-4 max-w-[200px] truncate" style={{ color: "var(--text)" }}>
                      {txn.description || "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {txn.category ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                          {txn.category}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td
                      className="py-2.5 text-right font-semibold whitespace-nowrap"
                      style={{ color: txn.type === "income" ? "var(--income)" : "var(--expense)" }}
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
