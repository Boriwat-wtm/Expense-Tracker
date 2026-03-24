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
export type TransactionSource = "slip" | "pdf" | "manual" | "merged";

export interface Transaction {
  id: string;
  user_id: string;
  date: string;        // ISO date string  "YYYY-MM-DD"
  transaction_time: string | null;  // "HH:MM:SS"
  amount: string;      // Decimal as string to avoid float precision issues
  description: string | null;
  merchant_name: string | null;
  category: string | null;
  type: TransactionType;
  source: TransactionSource;
  created_at: string;
}

export interface TransactionCreate {
  date: string;
  transaction_time?: string | null;
  amount: string;
  description?: string | null;
  merchant_name?: string | null;
  category?: string | null;
  type: TransactionType;
  source: TransactionSource;
}

export interface TransactionUpdate {
  date?: string;
  transaction_time?: string | null;
  amount?: string;
  description?: string | null;
  merchant_name?: string | null;
  category?: string | null;
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
export interface RecentTransaction {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: TransactionType;
  category: string | null;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
}

export interface PreviewItem {
  filename?: string;
  date: string | null;
  transaction_time?: string | null;
  amount: string | null;
  description?: string | null;
  merchant_name?: string | null;
  type?: TransactionType | null;
  source: TransactionSource;
  error?: string;
  raw_text?: string;
  is_duplicate?: boolean;  // set after check-duplicates
  can_merge?: boolean;     // duplicate but has new data (memo/merchant) to enrich existing record
  skip?: boolean;          // user chose to skip this item
}
