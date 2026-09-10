// Database Types
export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  currency: string;
  timezone: string;
  dark_mode: boolean;
  created_at: string;
  updated_at: string;
};

export type Home = {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type HomeMember = {
  id: string;
  home_id: string;
  user_id: string;
  role: "owner" | "member";
  join_date: string;
  created_at: string;
};

export type Income = {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  source: "salary" | "bonus" | "other";
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  date: string;
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  description: string | null;
  is_shared: boolean;
  shared_with: string[] | null;
  receipt_image: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseCategory =
  | "Arriendo"
  | "Gastos Comunes"
  | "Supermercado"
  | "Transporte"
  | "Delivery"
  | "Comida Fuera"
  | "Salud"
  | "Tecnología"
  | "Entretenimiento"
  | "Hogar"
  | "Servicios"
  | "Otros";

export type SharedExpense = {
  id: string;
  home_id: string;
  created_by: string;
  date: string;
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  split_type: "50/50" | "percentage" | "fixed";
  splits: Record<string, number>;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type FixedExpense = {
  id: string;
  user_id: string;
  home_id: string | null;
  category: ExpenseCategory;
  amount: number;
  frequency: "monthly" | "weekly";
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
};

export type Installment = {
  id: string;
  user_id: string;
  product_name: string;
  total_amount: number;
  num_installments: number;
  start_date: string;
  current_installment: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InstallmentCharge = {
  id: string;
  installment_id: string;
  user_id: string;
  installment_number: number;
  charge_date: string;
  amount: number;
  expense_id: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  category: string;
  target_date: string | null;
  emoji: string;
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
};

export type Scenario = {
  id: string;
  user_id: string;
  name: string;
  type: "solo" | "shared" | "custom";
  config: Record<string, any>;
  created_at: string;
};

export type Prediction = {
  id: string;
  user_id: string;
  month: string;
  predicted_expenses: number;
  predicted_income: number;
  predicted_savings: number;
  confidence: number;
  created_at: string;
};

export type EmailImport = {
  id: string;
  user_id: string;
  email_address: string;
  provider: "gmail" | "outlook";
  access_token: string;
  refresh_token: string;
  last_sync: string | null;
  is_active: boolean;
  created_at: string;
};

export type ExpenseClassification = {
  id: string;
  email_import_id: string;
  subject: string;
  body_snippet: string;
  merchant: string;
  predicted_category: ExpenseCategory;
  confidence: number;
  manual_category: ExpenseCategory | null;
  expense_id: string | null;
  status: "pending" | "auto_classified" | "manual_classified" | "rejected";
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};


