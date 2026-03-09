import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { CategoryBreakdown, DashboardMonthly, DashboardSummary, RecentTransaction } from "@/types";

export function useDashboard(selectedMonth?: number, selectedYear?: number) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthly, setMonthly] = useState<DashboardMonthly | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const timeParams =
        selectedMonth && selectedYear
          ? `?month=${selectedMonth}&year=${selectedYear}`
          : "";
      const yearParam = selectedYear ? `?year=${selectedYear}` : "";

      const [s, m, r, c] = await Promise.all([
        api.get<DashboardSummary>(`/dashboard/summary${timeParams}`),
        api.get<DashboardMonthly>(`/dashboard/monthly${yearParam}`),
        api.get<RecentTransaction[]>(`/dashboard/recent${timeParams}`),
        api.get<CategoryBreakdown[]>(`/dashboard/category-breakdown${timeParams}`),
      ]);
      setSummary(s.data);
      setMonthly(m.data);
      setRecent(r.data);
      setCategoryBreakdown(c.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { summary, monthly, recent, categoryBreakdown, loading, error, refetch: fetchAll };
}
