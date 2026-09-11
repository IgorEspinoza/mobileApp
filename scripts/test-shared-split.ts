import { calculateSplit } from "../src/lib/utils/math";
import { CreateSharedExpenseSchema } from "../src/lib/validations/schemas";

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

const checks: Check[] = [];

function addCheck(name: string, ok: boolean, detail = "") {
  checks.push({ name, ok, detail });
}

function runMathChecks() {
  const users = ["u1", "u2", "u3"];

  const fifty = calculateSplit(10000, "50/50", {}, ["u1", "u2"]);
  addCheck("50/50 total exacto", fifty.total === 10000, `total=${fifty.total}`);

  const percent = calculateSplit(
    9999,
    "percentage",
    { u1: 33.33, u2: 33.33, u3: 33.34 },
    users
  );
  addCheck("percentage total exacto", percent.total === 9999, `total=${percent.total}`);

  const fixed = calculateSplit(45000, "fixed", { u1: 20000, u2: 15000, u3: 10000 }, users);
  addCheck("fixed total exacto", fixed.total === 45000, `total=${fixed.total}`);

  try {
    calculateSplit(1000, "percentage", { u1: 70, u2: 20 }, ["u1", "u2"]);
    addCheck("percentage invalido falla", false, "no lanzó error");
  } catch {
    addCheck("percentage invalido falla", true);
  }

  try {
    calculateSplit(1000, "fixed", { u1: 700, u2: 200 }, ["u1", "u2"]);
    addCheck("fixed invalido falla", false, "no lanzó error");
  } catch {
    addCheck("fixed invalido falla", true);
  }
}

function runSchemaChecks() {
  const validPercentage = CreateSharedExpenseSchema.safeParse({
    date: "2026-09-11",
    merchant: "Arriendo Depto",
    amount: 500000,
    category: "Arriendo",
    split_type: "percentage",
    splits: {
      userA: 60,
      userB: 40,
    },
  });

  addCheck("schema percentage valido", validPercentage.success === true);

  const invalidPercentage = CreateSharedExpenseSchema.safeParse({
    date: "2026-09-11",
    merchant: "Arriendo Depto",
    amount: 500000,
    category: "Arriendo",
    split_type: "percentage",
    splits: {
      userA: 70,
      userB: 20,
    },
  });

  addCheck("schema percentage invalido", invalidPercentage.success === false);

  const validFixed = CreateSharedExpenseSchema.safeParse({
    date: "2026-09-11",
    merchant: "Supermercado",
    amount: 100000,
    category: "Supermercado",
    split_type: "fixed",
    splits: {
      userA: 70000,
      userB: 30000,
    },
  });

  addCheck("schema fixed valido", validFixed.success === true);

  const invalidFixed = CreateSharedExpenseSchema.safeParse({
    date: "2026-09-11",
    merchant: "Supermercado",
    amount: 100000,
    category: "Supermercado",
    split_type: "fixed",
    splits: {
      userA: 60000,
      userB: 30000,
    },
  });

  addCheck("schema fixed invalido", invalidFixed.success === false);
}

runMathChecks();
runSchemaChecks();

const passed = checks.filter((c) => c.ok).length;
const failed = checks.length - passed;

for (const c of checks) {
  const status = c.ok ? "OK" : "FAIL";
  const suffix = c.detail ? ` (${c.detail})` : "";
  console.log(`${status} - ${c.name}${suffix}`);
}

console.log(`\nResultado: ${passed}/${checks.length} OK`);

if (failed > 0) {
  process.exitCode = 1;
}

