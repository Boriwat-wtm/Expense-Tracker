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
import type { DashboardMonthly, DashboardSummary } from "@/types";
import { formatCurrency, shortMonth } from "@/lib/utils";

const PIE_COLORS = ["#22c55e", "#ef4444"];

interface Props {
  summary: DashboardSummary;
  monthly: DashboardMonthly;
}

export default function DashboardCharts({ summary, monthly }: Props) {
  const pieData = [
    { name: "รายรับ", value: summary.total_income },
    { name: "รายจ่าย", value: summary.total_expense },
  ];

  const barData = monthly.data.map((d) => ({
    name: shortMonth(d.month),
    รายรับ: d.income,
    รายจ่าย: d.expense,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">รายรับ vs รายจ่าย</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val: number) => formatCurrency(val)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
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
