// Expense Categories
export const EXPENSE_CATEGORIES = [
  "Arriendo",
  "Gastos Comunes",
  "Supermercado",
  "Transporte",
  "Delivery",
  "Comida Fuera",
  "Salud",
  "Tecnología",
  "Entretenimiento",
  "Hogar",
  "Servicios",
  "Otros",
] as const;

export const CATEGORY_EMOJIS: Record<string, string> = {
  Arriendo: "🏠",
  "Gastos Comunes": "💡",
  Supermercado: "🛒",
  Transporte: "🚗",
  Delivery: "🍕",
  "Comida Fuera": "🍽️",
  Salud: "💊",
  Tecnología: "💻",
  Entretenimiento: "🎬",
  Hogar: "🛋️",
  Servicios: "🔧",
  Otros: "📦",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Arriendo: "#ef4444",
  "Gastos Comunes": "#f97316",
  Supermercado: "#eab308",
  Transporte: "#22c55e",
  Delivery: "#3b82f6",
  "Comida Fuera": "#8b5cf6",
  Salud: "#ec4899",
  Tecnología: "#06b6d4",
  Entretenimiento: "#f59e0b",
  Hogar: "#6366f1",
  Servicios: "#14b8a6",
  Otros: "#6b7280",
};

// Income Sources
export const INCOME_SOURCES = ["salary", "bonus", "other"] as const;

// Split Types
export const SPLIT_TYPES = ["50/50", "percentage", "fixed"] as const;

// Currencies
export const SUPPORTED_CURRENCIES = {
  CLP: "Peso Chileno",
  USD: "Dólar Estadounidense",
  EUR: "Euro",
  ARS: "Peso Argentino",
} as const;

// Timezones
export const SUPPORTED_TIMEZONES = [
  "America/Santiago",
  "America/New_York",
  "Europe/Madrid",
  "Australia/Sydney",
] as const;

// Goal Priorities
export const GOAL_PRIORITIES = ["low", "medium", "high"] as const;

// Fixed Expense Frequencies
export const EXPENSE_FREQUENCIES = ["monthly", "weekly"] as const;

// Home Member Roles
export const HOME_MEMBER_ROLES = ["owner", "member"] as const;

// Scenario Types
export const SCENARIO_TYPES = ["solo", "shared", "custom"] as const;

// Email Provider Types
export const EMAIL_PROVIDERS = ["gmail", "outlook"] as const;

// Email Sync Limits
export const EMAIL_SYNC_DEFAULT_LIMIT = 10;
export const EMAIL_SYNC_MAX_LIMIT = 20;
export const EMAIL_SYNC_IMAP_TIMEOUT_MS = 12_000;
export const EMAIL_SYNC_MAX_RUNTIME_MS = 15_000;

// Expense Classification Status
export const CLASSIFICATION_STATUSES = [
  "pending",
  "auto_classified",
  "manual_classified",
  "rejected",
] as const;

// API Rate Limits
export const API_RATE_LIMITS = {
  auth: { requests: 10, window: "1m" },
  expenses: { requests: 100, window: "1h" },
  ai: { requests: 20, window: "1h" },
  email: { requests: 5, window: "1h" },
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// AI Confidence Thresholds
export const AI_CONFIDENCE_THRESHOLD = 0.7;

// Cache Times (in seconds)
export const CACHE_TIMES = {
  user: 300, // 5 minutes
  expenses: 60, // 1 minute
  homes: 300, // 5 minutes
  goals: 600, // 10 minutes
} as const;


