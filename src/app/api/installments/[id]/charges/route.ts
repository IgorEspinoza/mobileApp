import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type InstallmentChargeWithExpense = {
  id: string;
  installment_id: string;
  installment_number: number;
  charge_date: string;
  amount: number;
  expense_id: string | null;
  created_at: string;
  expense: {
    id: string;
    date: string;
    merchant: string;
    category: string;
    description: string | null;
  } | null;
};

type RawInstallmentChargeWithExpense = Omit<InstallmentChargeWithExpense, "expense"> & {
  expense: InstallmentChargeWithExpense["expense"][] | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticacion" }, { status: 401 });
    }

    const { data: installment, error: installmentError } = await supabase
      .from("installments")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (installmentError || !installment) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("installment_charges")
      .select(
        "id, installment_id, installment_number, charge_date, amount, expense_id, created_at, expense:expenses(id, date, merchant, category, description)"
      )
      .eq("installment_id", id)
      .eq("user_id", user.id)
      .order("installment_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const charges = ((data ?? []) as RawInstallmentChargeWithExpense[]).map((item) => ({
      ...item,
      expense: item.expense?.[0] ?? null,
    }));

    return NextResponse.json({ charges });
  } catch (error) {
    console.error("Installment charges list error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}


