import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { AdminQuota, UserOut, UserRole } from "@/types";

export default function Admin() {
  const [users, setUsers] = useState<UserOut[]>([]);
  const [quota, setQuota] = useState<AdminQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    const [usersRes, quotaRes] = await Promise.all([
      api.get<UserOut[]>("/admin/users"),
      api.get<AdminQuota>("/admin/quota"),
    ]);
    setUsers(usersRes.data);
    setQuota(quotaRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const changeRole = async (userId: string, role: UserRole) => {
    await api.patch(`/admin/users/${userId}/role`, null, { params: { role } });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    );
  };

  const resetQuota = async () => {
    setResetting(true);
    setMessage(null);
    try {
      await api.post("/admin/quota/reset");
      setMessage("รีเซ็ต quota เรียบร้อยแล้ว");
      const { data } = await api.get<AdminQuota>("/admin/quota");
      setQuota(data);
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="p-6" style={{ color: "var(--text-muted)" }}>กำลังโหลด...</div>;

  const usedPct = quota ? Math.round((quota.quota_used / quota.quota_limit) * 100) : 0;
  const barColor = usedPct >= 90 ? "#ef4444" : usedPct >= 70 ? "#f97316" : "var(--income)";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Admin Panel</h1>

      {/* Master Quota Card */}
      {quota && (
        <div className="rounded-xl border p-6 space-y-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Master OCR Quota</h2>
            <button
              onClick={resetQuota}
              disabled={resetting}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {resetting ? "กำลังรีเซ็ต..." : "รีเซ็ต Quota"}
            </button>
          </div>
          {message && (
            <p className="text-sm font-medium" style={{ color: "var(--income)" }}>{message}</p>
          )}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold" style={{ color: "var(--text)" }}>{quota.quota_used}</span>
            <span className="mb-0.5" style={{ color: "var(--text-muted)" }}>/ {quota.quota_limit} รูป</span>
            <span className="ml-auto text-sm" style={{ color: "var(--text-muted)" }}>เหลือ {quota.quota_remaining} รูป</span>
          </div>
          <div className="w-full rounded-full h-2.5" style={{ backgroundColor: "var(--progress-track)" }}>
            <div
              className="h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(usedPct, 100)}%`, backgroundColor: barColor }}
            />
          </div>
          {quota.reset_date && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>รีเซ็ตล่าสุด: {quota.reset_date}</p>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>ผู้ใช้งานทั้งหมด ({users.length} คน)</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--nav-hover)" }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs uppercase" style={{ color: "var(--text-muted)" }}>Username</th>
              <th className="px-6 py-3 text-left text-xs uppercase" style={{ color: "var(--text-muted)" }}>Email</th>
              <th className="px-6 py-3 text-center text-xs uppercase" style={{ color: "var(--text-muted)" }}>OCR Used (เดือนนี้)</th>
              <th className="px-6 py-3 text-center text-xs uppercase" style={{ color: "var(--text-muted)" }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-6 py-3 font-medium" style={{ color: "var(--text)" }}>@{u.username}</td>
                <td className="px-6 py-3" style={{ color: "var(--text-muted)" }}>{u.email}</td>
                <td className="px-6 py-3 text-center" style={{ color: "var(--text)" }}>{u.ocr_quota_used}</td>
                <td className="px-6 py-3 text-center">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                    className="text-xs rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)", color: "var(--text)" }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
