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
  splits: z.record(z.string(), z.number()),
  description: z.string().optional(),
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

