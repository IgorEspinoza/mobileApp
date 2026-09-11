import { z } from "zod";

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener almenos 6 caracteres"),
});

export const RegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener almenos 6 caracteres"),
  full_name: z.string().min(2, "El nombre debe tener almenos 2 caracteres"),
});

export const UpdatePasswordSchema = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// Income Schemas
export const CreateIncomeSchema = z.object({
  date: z.string().date(),
  amount: z.number().positive("El monto debe ser positivo"),
  source: z.enum(["salary", "bonus", "other"]),
  description: z.string().optional(),
});

// Expense Schemas
export const CreateExpenseSchema = z.object({
  date: z.string().date(),
  merchant: z.string().min(1, "El comercio es requerido"),
  amount: z.number().positive("El monto debe ser positivo"),
  category: z.enum([
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
  ]),
  description: z.string().optional(),
  is_shared: z.boolean().default(false),
});

// Shared Expense Schemas
export const CreateSharedExpenseSchema = z.object({
  date: z.string().date(),
  merchant: z.string().min(1),
  amount: z.number().positive(),
  category: z.enum([
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
  ]),
  split_type: z.enum(["50/50", "percentage", "fixed"]),
  splits: z.record(z.string(), z.number().finite().nonnegative()),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  const splitEntries = Object.entries(data.splits || {});

  if (splitEntries.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debes indicar al menos un integrante en el split",
      path: ["splits"],
    });
    return;
  }

  if (data.split_type === "50/50") {
    if (splitEntries.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El split 50/50 requiere al menos 2 integrantes",
        path: ["splits"],
      });
    }
    return;
  }

  const total = splitEntries.reduce((acc, [, value]) => acc + value, 0);

  if (data.split_type === "percentage") {
    if (Math.abs(total - 100) >= 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En split por porcentaje, la suma debe ser 100%",
        path: ["splits"],
      });
    }
    return;
  }

  if (data.split_type === "fixed") {
    if (Math.abs(total - data.amount) >= 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En split fijo, la suma de montos debe ser igual al monto total",
        path: ["splits"],
      });
    }
  }
});

// Goal Schemas
export const CreateGoalSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  target_amount: z.number().positive(),
  category: z.string().optional(),
  target_date: z.string().date().optional(),
  emoji: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});

// Fixed Expense Schemas
export const CreateFixedExpenseSchema = z.object({
  category: z.enum([
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
  ]),
  amount: z.number().positive(),
  frequency: z.enum(["monthly", "weekly"]),
  start_date: z.string().date(),
  end_date: z.string().date().optional(),
  description: z.string().optional(),
});

// Installment Schemas
export const CreateInstallmentSchema = z.object({
  product_name: z.string().min(1),
  total_amount: z.number().positive(),
  num_installments: z.number().int().positive(),
  start_date: z.string().date(),
});

// Home Schemas
export const CreateHomeSchema = z.object({
  name: z.string().min(1, "El nombre del hogar es requerido"),
  description: z.string().optional(),
  currency: z.string().default("CLP"),
});

export const InviteToHomeSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["owner", "member"]).default("member"),
});

// Email Review Schemas
export const ApproveEmailClassificationSchema = z.object({
  destination: z.enum(["expense", "income", "installment"]),
  date: z.string().date(),
  amount: z.number().positive("El monto debe ser positivo"),
  merchant: z.string().optional(),
  category: z.enum([
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
  ]).optional(),
  source: z.enum(["salary", "bonus", "other"]).optional(),
  num_installments: z.number().int().positive().optional(),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.destination === "expense") {
    if (!data.merchant || data.merchant.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El comercio es requerido para gasto",
        path: ["merchant"],
      });
    }
    if (!data.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La categoría es requerida para gasto",
        path: ["category"],
      });
    }
  }

  if (data.destination === "installment") {
    if (!data.merchant || data.merchant.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre del producto es requerido para cuota",
        path: ["merchant"],
      });
    }

    if (!data.num_installments || data.num_installments < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cuota debe tener al menos 2 pagos",
        path: ["num_installments"],
      });
    }
  }
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
export type CreateIncomeInput = z.infer<typeof CreateIncomeSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type CreateSharedExpenseInput = z.infer<typeof CreateSharedExpenseSchema>;
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type CreateFixedExpenseInput = z.infer<typeof CreateFixedExpenseSchema>;
export type CreateInstallmentInput = z.infer<typeof CreateInstallmentSchema>;
export type CreateHomeInput = z.infer<typeof CreateHomeSchema>;
export type InviteToHomeInput = z.infer<typeof InviteToHomeSchema>;
export type ApproveEmailClassificationInput = z.infer<typeof ApproveEmailClassificationSchema>;

