import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { DashboardMonthly, DashboardSummary } from "@/types";

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthly, setMonthly] = useState<DashboardMonthly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (year?: number) => {
    setLoading(true);
    setError(null);
    try {
      const [s, m] = await Promise.all([
        api.get<DashboardSummary>("/dashboard/summary"),
        api.get<DashboardMonthly>(`/dashboard/monthly${year ? `?year=${year}` : ""}`),
      ]);
      setSummary(s.data);
      setMonthly(m.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { summary, monthly, loading, error, refetch: fetchAll };
}
