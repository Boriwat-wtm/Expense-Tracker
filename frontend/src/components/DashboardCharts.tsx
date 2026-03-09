import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { CategoryBreakdown, DashboardMonthly, DashboardSummary } from "@/types";
import { formatCurrency, shortMonth } from "@/lib/utils";

const CATEGORY_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
  "#a78bfa", "#fb923c",
];

interface Props {
  summary: DashboardSummary;
  monthly: DashboardMonthly;
  categoryBreakdown: CategoryBreakdown[];
}

export default function DashboardCharts({ monthly, categoryBreakdown }: Props) {
  const barData = monthly.data.map((d) => ({
    name: shortMonth(d.month),
    รายรับ: d.income,
    รายจ่าย: d.expense,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Doughnut Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">สัดส่วนรายจ่ายตามหมวดหมู่</h3>
        {categoryBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[260px] text-gray-400 gap-1">
            <p className="text-sm">ยังไม่มีข้อมูลหมวดหมู่</p>
            <p className="text-xs">แก้ไขรายการและเพิ่ม Category เพื่อดูกราฟนี้</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
                dataKey="total"
                nameKey="category"
                label={({ name, percent }) =>
                  percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                }
                labelLine={false}
              >
                {categoryBreakdown.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">
          รายรับ / รายจ่าย รายเดือน ({monthly.year})
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(val: number) => formatCurrency(val)} />
            <Legend />
            <Bar dataKey="รายรับ" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
