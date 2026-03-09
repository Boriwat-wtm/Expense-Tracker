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

  if (loading) return <div className="p-6 text-gray-500">กำลังโหลด...</div>;

  const usedPct = quota ? Math.round((quota.quota_used / quota.quota_limit) * 100) : 0;
  const barColor = usedPct >= 90 ? "bg-red-500" : usedPct >= 70 ? "bg-orange-400" : "bg-green-500";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>

      {/* Master Quota Card */}
      {quota && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Master OCR Quota</h2>
            <button
              onClick={resetQuota}
              disabled={resetting}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {resetting ? "กำลังรีเซ็ต..." : "รีเซ็ต Quota"}
            </button>
          </div>
          {message && (
            <p className="text-sm text-green-600 font-medium">{message}</p>
          )}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-gray-800">{quota.quota_used}</span>
            <span className="text-gray-400 mb-0.5">/ {quota.quota_limit} รูป</span>
            <span className="ml-auto text-sm text-gray-500">เหลือ {quota.quota_remaining} รูป</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`${barColor} h-2.5 rounded-full transition-all`}
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
          {quota.reset_date && (
            <p className="text-xs text-gray-400">รีเซ็ตล่าสุด: {quota.reset_date}</p>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700">ผู้ใช้งานทั้งหมด ({users.length} คน)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Username</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-center">OCR Used (เดือนนี้)</th>
              <th className="px-6 py-3 text-center">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-800">@{u.username}</td>
                <td className="px-6 py-3 text-gray-500">{u.email}</td>
                <td className="px-6 py-3 text-center text-gray-700">{u.ocr_quota_used}</td>
                <td className="px-6 py-3 text-center">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
  );
}
