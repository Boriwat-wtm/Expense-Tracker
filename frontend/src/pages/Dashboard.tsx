import { TrendingUp, TrendingDown, Wallet, Users, ImageIcon } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import DashboardCharts from "@/components/DashboardCharts";
import { formatCurrency } from "@/lib/utils";

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
  const { summary, monthly, loading, error } = useDashboard();

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
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="รายรับทั้งหมด"
          value={formatCurrency(summary.total_income)}
          icon={<TrendingUp size={22} className="text-green-600" />}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          title="รายจ่ายทั้งหมด"
          value={formatCurrency(summary.total_expense)}
          icon={<TrendingDown size={22} className="text-red-500" />}
          color="text-red-500"
          bg="bg-red-50"
        />
        <StatCard
          title="ยอดคงเหลือ"
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
      <DashboardCharts summary={summary} monthly={monthly} />
    </div>
  );
}
