// ── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "user";

export interface UserOut {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  ocr_quota_used: number;
  ocr_quota_reset_date: string | null;
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface AdminQuota {
  quota_limit: number;
  quota_used: number;
  quota_remaining: number;
  reset_date: string | null;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: UserOut;
}

// ── Transactions ─────────────────────────────────────────────────────────────
export type TransactionType = "income" | "expense";
export type TransactionSource = "slip" | "pdf" | "manual";

export interface Transaction {
  id: string;
  user_id: string;
  date: string;        // ISO date string  "YYYY-MM-DD"
  amount: string;      // Decimal as string to avoid float precision issues
  description: string | null;
  type: TransactionType;
  source: TransactionSource;
  created_at: string;
}

export interface TransactionCreate {
  date: string;
  amount: string;
  description?: string;
  type: TransactionType;
  source: TransactionSource;
}

export interface TransactionUpdate {
  date?: string;
  amount?: string;
  description?: string;
  type?: TransactionType;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  ocr_quota_used: number;          // per-user tracking this month
  master_quota_limit: number;      // shared pool limit (800)
  master_quota_used: number;       // shared pool consumed this month
  master_quota_remaining: number;  // shared pool remaining
}

export interface MonthlyData {
  month: number;
  income: number;
  expense: number;
}

export interface DashboardMonthly {
  year: number;
  data: MonthlyData[];
}

// ── Upload ────────────────────────────────────────────────────────────────────
export interface PreviewItem {
  filename?: string;
  date: string | null;
  amount: string | null;
  description?: string | null;
  type?: TransactionType | null;
  source: TransactionSource;
  error?: string;
  raw_text?: string;
}
