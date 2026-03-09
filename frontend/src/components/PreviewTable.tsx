import { useState } from "react";
import { Pencil, CheckCircle, AlertCircle } from "lucide-react";
import type { PreviewItem, TransactionType } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  items: PreviewItem[];
  onChange: (updated: PreviewItem[]) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function PreviewTable({ items, onChange, onConfirm, loading }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const update = (idx: number, field: keyof PreviewItem, value: string) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const hasErrors = items.some((i) => i.error);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ไฟล์</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">วันที่</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ยอดเงิน (บาท)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">คำอธิบาย</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภท</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">แก้ไข</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) =>
              item.error ? (
                <tr key={idx} className="bg-red-50">
                  <td className="px-4 py-3 text-gray-700">{item.filename ?? "-"}</td>
                  <td colSpan={4} className="px-4 py-3 text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} /> {item.error}
                  </td>
                  <td />
                </tr>
              ) : editingIdx === idx ? (
                <tr key={idx} className="bg-blue-50">
                  <td className="px-4 py-3 text-gray-600 text-xs">{item.filename ?? "-"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={item.date ?? ""}
                      onChange={(e) => update(idx, "date", e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-36"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.amount ?? ""}
                      onChange={(e) => update(idx, "amount", e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-32"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.description ?? ""}
                      onChange={(e) => update(idx, "description", e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-48"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.type ?? "expense"}
                      onChange={(e) => update(idx, "type", e.target.value as TransactionType)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="income">รายรับ</option>
                      <option value="expense">รายจ่าย</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingIdx(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle size={18} />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">
                    {item.filename ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.date ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.amount ? formatCurrency(item.amount) : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                    {item.description ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.type === "income"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.type === "income" ? "รายรับ" : "รายจ่าย"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingIdx(idx)}
                      className="text-gray-400 hover:text-brand-600 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {!hasErrors && items.length > 0 && (
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? "กำลังบันทึก..." : `✅ บันทึกทั้งหมด (${items.length} รายการ)`}
        </button>
      )}
    </div>
  );
}
