import { TrendingUp, TrendingDown, Wallet, Image } from "lucide-react";
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

  const quotaPct = Math.min(
    100,
    Math.round((summary.ocr_quota_used / summary.ocr_quota_limit) * 100)
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
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-50 p-3 rounded-xl">
              <Image size={22} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">โควต้า OCR</p>
              <p className="font-bold text-gray-900">
                {summary.ocr_quota_used} / {summary.ocr_quota_limit} รูป
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                quotaPct >= 80 ? "bg-red-500" : "bg-purple-500"
              }`}
              style={{ width: `${quotaPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">เหลือ {summary.ocr_quota_remaining} รูป</p>
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts summary={summary} monthly={monthly} />
    </div>
  );
}
