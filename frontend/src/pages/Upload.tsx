import { useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import PreviewTable from "@/components/PreviewTable";
import api from "@/lib/api";
import type { PreviewItem, TransactionCreate, TransactionSource } from "@/types";

type Tab = "slips" | "pdf";

export default function Upload() {
  const [tab, setTab] = useState<Tab>("slips");

  // ── Slips state ────────────────────────────────────────────────────────────
  const [slipPreviews, setSlipPreviews] = useState<PreviewItem[]>([]);
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState("");
  const [slipSuccess, setSlipSuccess] = useState("");

  // ── PDF state ──────────────────────────────────────────────────────────────
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pdfPreviews, setPdfPreviews] = useState<PreviewItem[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfSuccess, setPdfSuccess] = useState("");

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toCreate = (items: PreviewItem[]): TransactionCreate[] =>
    items
      .filter((i) => !i.error && !i.skip && i.date && i.amount)
      .map((i) => ({
        date: i.date!,
        amount: i.amount!,
        description: i.description ?? "",
        merchant_name: i.merchant_name ?? undefined,
        transaction_time: i.transaction_time ?? undefined,
        type: i.type ?? "expense",
        source: i.source as TransactionSource,
      }));

  /**
   * Check for duplicates and mark items accordingly.
   * - true duplicate (can_merge=false) → skip=true (yellow, user can un-skip)
   * - mergeable (can_merge=true)       → skip=false, will be sent to confirm so backend merges memo
   * Returns { hasTrueDupes, mergeCount, markedItems }
   */
  const checkDuplicates = async (
    items: PreviewItem[],
    setter: React.Dispatch<React.SetStateAction<PreviewItem[]>>,
  ): Promise<{ hasTrueDupes: boolean; mergeCount: number; markedItems: PreviewItem[] }> => {
    const validItems = items.filter((i) => !i.error && i.date && i.amount);
    if (validItems.length === 0) return { hasTrueDupes: false, mergeCount: 0, markedItems: items };
    const { data } = await api.post<{ is_duplicate: boolean; can_merge: boolean }[]>(
      "/upload/check-duplicates",
      { transactions: toCreate(items) },
    );
    let resultIdx = 0;
    let hasTrueDupes = false;
    let mergeCount = 0;
    const marked = items.map((item) => {
      if (item.error || !item.date || !item.amount) return item;
      const res = data[resultIdx++];
      if (res.is_duplicate) {
        if (res.can_merge) {
          mergeCount++; // has new data (memo/merchant) to add — let it through to confirm
        } else {
          hasTrueDupes = true; // exact duplicate, nothing new to add
        }
      }
      return {
        ...item,
        is_duplicate: res.is_duplicate,
        can_merge: res.can_merge,
        // only skip true duplicates; mergeable items pass through so backend merges memo
        skip: res.is_duplicate && !res.can_merge ? true : item.skip,
      };
    });
    if (hasTrueDupes || mergeCount > 0) setter(marked);
    return { hasTrueDupes, mergeCount, markedItems: marked };
  };

  // ── Slip handlers ──────────────────────────────────────────────────────────
  const handleSlipDrop = async (files: File[]) => {
    setSlipError("");
    setSlipSuccess("");
    setSlipLoading(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const { data } = await api.post<{ previews: PreviewItem[] }>("/upload/slips", form);
      setSlipPreviews(data.previews);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSlipError(msg ?? "ไม่สามารถประมวลผลได้");
    } finally {
      setSlipLoading(false);
    }
  };

  const handleSlipConfirm = async () => {
    setSlipLoading(true);
    setSlipError("");
    setSlipSuccess("");
    try {
      // Step 1: check for duplicates
      const { hasTrueDupes, mergeCount, markedItems } = await checkDuplicates(slipPreviews, setSlipPreviews);
      if (hasTrueDupes) {
        setSlipError("🔁 พบรายการซ้ำในระบบ — รายการที่เป็นสีเหลืองถูกสั่งไปก่อนแล้ว คุณสามารถเปิดใช้บันทึกหรือกดปุ่มเพื่อบันทึกเฉพาะรายการใหม่");
        setSlipLoading(false);
        return;
      }
      // Step 2: save (mergeable items go through so backend adds memo to existing records)
      const toSave = toCreate(markedItems);
      if (toSave.length === 0) { setSlipLoading(false); return; }
      await api.post("/upload/confirm", { transactions: toSave });
      const mergeMsg = mergeCount > 0 ? ` (เพิ่ม memo ลงในรายการเดิม ${mergeCount} รายการ)` : "";
      setSlipSuccess(`บันทึก ${toSave.length} รายการเรียบร้อย!${mergeMsg}`);
      setSlipPreviews([]);
    } catch {
      setSlipError("บันทึกไม่สำเร็จ");
    } finally {
      setSlipLoading(false);
    }
  };

  // ── PDF handlers ───────────────────────────────────────────────────────────
  const handlePdfDrop = (files: File[]) => {
    setPdfFile(files[0]);
    setPdfPreviews([]);
    setPdfError("");
    setPdfSuccess("");
  };

  const handlePdfParse = async () => {
    if (!pdfFile) return;
    setPdfLoading(true);
    setPdfError("");
    try {
      const form = new FormData();
      form.append("file", pdfFile);
      form.append("password", pdfPassword);
      const { data } = await api.post<{ previews: PreviewItem[] }>("/upload/pdf", form);
      setPdfPreviews(data.previews);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPdfError(msg ?? "ไม่สามารถอ่านไฟล์ PDF ได้");
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePdfConfirm = async () => {
    setPdfLoading(true);
    setPdfError("");
    setPdfSuccess("");
    try {
      const { hasTrueDupes, mergeCount, markedItems } = await checkDuplicates(pdfPreviews, setPdfPreviews);
      if (hasTrueDupes) {
        setPdfError("🔁 พบรายการซ้ำในระบบ — รายการที่เป็นสีเหลืองถูกสั่งไปก่อนแล้ว คุณสามารถเปิดใช้บันทึกหรือกดปุ่มเพื่อบันทึกเฉพาะรายการใหม่");
        setPdfLoading(false);
        return;
      }
      const toSave = toCreate(markedItems);
      if (toSave.length === 0) { setPdfLoading(false); return; }
      await api.post("/upload/confirm", { transactions: toSave });
      const mergeMsg = mergeCount > 0 ? ` (เพิ่ม memo ลงในรายการเดิม ${mergeCount} รายการ)` : "";
      setPdfSuccess(`บันทึก ${toSave.length} รายการเรียบร้อย!${mergeMsg}`);
      setPdfPreviews([]);
      setPdfFile(null);
      setPdfPassword("");
    } catch {
      setPdfError("บันทึกไม่สำเร็จ");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>อัปโหลดธุรกรรม</h2>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 rounded-xl w-full sm:w-fit" style={{ backgroundColor: "var(--nav-hover)" }}>
        {(
          [
            { id: "slips", icon: <ImageIcon size={16} />, label: "สลิปโอนเงิน (OCR)" },
            { id: "pdf", icon: <FileText size={16} />, label: "Bank Statement (PDF)" },
          ] as const
        ).map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? "shadow-sm"
                : ""
            }`}
            style={tab === id
              ? { backgroundColor: "var(--card)", color: "var(--primary)" }
              : { color: "var(--text-muted)" }
            }
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── SLIPS TAB ── */}
      {tab === "slips" && (
        <div className="space-y-4">
          <UploadZone
            onDrop={handleSlipDrop}
            accept={{ "image/jpeg": [], "image/png": [], "image/webp": [] }}
            multiple
            disabled={slipLoading}
          />
          {slipLoading && (
            <p className="text-center text-gray-500 animate-pulse">
              กำลังประมวลผล OCR...
            </p>
          )}
          {slipError && (
            <p className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{slipError}</p>
          )}
          {slipSuccess && (
            <p className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium">
              ✅ {slipSuccess}
            </p>
          )}
          {slipPreviews.length > 0 && (
            <PreviewTable
              items={slipPreviews}
              onChange={setSlipPreviews}
              onConfirm={handleSlipConfirm}
              loading={slipLoading}
            />
          )}
        </div>
      )}

      {/* ── PDF TAB ── */}
      {tab === "pdf" && (
        <div className="space-y-4">
          <UploadZone
            onDrop={handlePdfDrop}
            accept={{ "application/pdf": [] }}
            multiple={false}
            label="ลากวาง e-Statement PDF ที่นี่"
            subLabel="รองรับไฟล์ PDF ที่มีหรือไม่มีรหัสผ่าน (สูงสุด 50 MB)"
            disabled={pdfLoading}
          />

          {pdfFile && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm text-gray-700">
                📄 <strong>{pdfFile.name}</strong> ({(pdfFile.size / 1024).toFixed(0)} KB)
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="password"
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  placeholder="รหัสผ่าน PDF (ถ้ามี)"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={handlePdfParse}
                  disabled={pdfLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {pdfLoading ? "กำลังอ่าน..." : "อ่านไฟล์"}
                </button>
              </div>
            </div>
          )}

          {pdfError && (
            <p className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{pdfError}</p>
          )}
          {pdfSuccess && (
            <p className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium">
              ✅ {pdfSuccess}
            </p>
          )}
          {pdfPreviews.length > 0 && (
            <PreviewTable
              items={pdfPreviews}
              onChange={setPdfPreviews}
              onConfirm={handlePdfConfirm}
              loading={pdfLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}
