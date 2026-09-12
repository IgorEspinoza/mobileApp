/**
 * Banco de pruebas del parser de correos.
 * Ejecutar:  npx tsx scripts/test-parser.ts
 */
import { parsePurchaseEmail, parseAmount, extractAliasTag } from "../src/lib/email/parser";
import type { ParsedEmail } from "../src/lib/email/parser";

type TestCase = {
  name: string;
  email: Partial<ParsedEmail> & { subject: string; body: string; from: string };
  expect: {
    type?: "expense" | "income" | "installment" | null;
    amount?: number;
    category?: string;
    merchantIncludes?: string;
    installments?: number | null;
  } | null;
};

const CASES: TestCase[] = [
  {
    name: "Banco de Chile - compra con tarjeta",
    email: {
      from: "enviodigital@bancochile.cl",
      subject: "Compra con Tarjeta de Credito",
      body: "Te informamos que se ha realizado una compra por $45.990 en JUMBO KENNEDY el 10/09/2026 con tu Tarjeta de Credito terminada en 1234.",
    },
    expect: { type: "expense", amount: 45990, category: "Supermercado", merchantIncludes: "JUMBO" },
  },
  {
    name: "Santander - compra en cuotas",
    email: {
      from: "notificaciones@santander.cl",
      subject: "Compra en cuotas",
      body: "Compra por $299.990 en PC FACTORY en 6 cuotas realizada el 05/09/2026.",
    },
    expect: { type: "installment", amount: 299990, category: "Tecnología", installments: 6, merchantIncludes: "PC FACTORY" },
  },
  {
    name: "Mercado Pago - pago",
    email: {
      from: "no-responder@mercadopago.com",
      subject: "Pagaste $12.500",
      body: "Pagaste $12.500 a UBER EATS el 09/09/2026.",
    },
    expect: { type: "expense", amount: 12500, category: "Delivery", merchantIncludes: "UBER EATS" },
  },
  {
    name: "BancoEstado - abono de sueldo (ingreso)",
    email: {
      from: "comunicaciones@bancoestado.cl",
      subject: "Abono en tu CuentaRUT",
      body: "Te informamos que recibiste un abono por $1.250.000 correspondiente a tu remuneracion el 01/09/2026.",
    },
    expect: { type: "income", amount: 1250000 },
  },
  {
    name: "Netflix - suscripcion",
    email: {
      from: "info@bancochile.cl",
      subject: "Cargo por suscripcion",
      body: "Se ha realizado un cargo por $9.990 en NETFLIX el 03/09/2026.",
    },
    expect: { type: "expense", amount: 9990, category: "Entretenimiento" },
  },
  {
    name: "Copec - bencina",
    email: {
      from: "alertas@bci.cl",
      subject: "Compra realizada",
      body: "Compra por $35.000 en COPEC VITACURA el 08/09/2026.",
    },
    expect: { type: "expense", amount: 35000, category: "Transporte" },
  },
  {
    name: "Correo promocional (debe ignorarse)",
    email: {
      from: "marketing@santander.cl",
      subject: "Aprovecha nuestra promocion de verano",
      body: "Tenemos una oferta especial para ti con hasta 40% de descuento.",
    },
    expect: null,
  },
  {
    name: "Estado de cuenta (debe ignorarse)",
    email: {
      from: "enviodigital@bancochile.cl",
      subject: "Tu estado de cuenta esta disponible",
      body: "Ya puedes revisar tu estado de cuenta del mes. Saldo disponible $500.000.",
    },
    expect: null,
  },
  {
    name: "Correo HTML",
    email: {
      from: "notificaciones@santander.cl",
      subject: "Compra",
      body: "<html><body><p>Compra por <b>$7.500</b> en <span>STARBUCKS</span> el 11/09/2026</p></body></html>",
    },
    expect: { type: "expense", amount: 7500, category: "Comida Fuera" },
  },
  {
    name: "Farmacia",
    email: {
      from: "alertas@bancofalabella.cl",
      subject: "Compra con tarjeta",
      body: "Compra por $8.450 en CRUZ VERDE PROVIDENCIA el 07/09/2026.",
    },
    expect: { type: "expense", amount: 8450, category: "Salud" },
  },
  {
    name: "Comercio con codigo numerico",
    email: {
      from: "enviodigital@bancochile.cl",
      subject: "Compra con tarjeta",
      body: "Compra por $23.400 en LIDER EXPRESS 4521 el 06/09/2026 con tu Tarjeta terminada en 9876.",
    },
    expect: { type: "expense", amount: 23400, category: "Supermercado", merchantIncludes: "LIDER" },
  },
  {
    name: "Transferencia recibida (ingreso)",
    email: {
      from: "alertas@santander.cl",
      subject: "Transferencia recibida",
      body: "Recibiste una transferencia por $150.000 el 10/09/2026.",
    },
    expect: { type: "income", amount: 150000 },
  },
  {
    name: "Aviso informativo de banco con monto (debe ignorarse)",
    email: {
      from: "comunicaciones@bancochile.cl",
      subject: "Conoce los nuevos beneficios de tu plan",
      body: "Desde ahora tu plan incluye cobertura por $500.000 al año. Te invitamos a revisar los detalles.",
    },
    expect: null,
  },
  {
    name: "Reajuste de comision sin señal de transaccion (debe ignorarse)",
    email: {
      from: "info@santander.cl",
      subject: "Informacion sobre tu plan de cuenta",
      body: "La comision mensual de tu plan sera de $4.500 a partir del proximo periodo.",
    },
    expect: null,
  },
  {
    name: "Compra sin keyword pero con tarjeta terminada (debe detectarse)",
    email: {
      from: "enviodigital@bancochile.cl",
      subject: "Notificacion de movimiento",
      body: "Te informamos un movimiento por $18.500 con tu tarjeta terminada en 4821.",
    },
    expect: { type: "expense", amount: 18500 },
  },
];

// --- Pruebas unitarias de parseAmount ---
const AMOUNT_CASES: Array<[string, number | null]> = [
  ["$45.990", 45990],
  ["45.990", 45990],
  ["$1.250.000", 1250000],
  ["$12.345,67", 12345.67],
  ["USD 19.99", 19.99],
  ["$9.990", 9990],
  ["$500", 500],
  ["12,50", 12.5],
];

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  OK   ${label}`);
  } else {
    failed++;
    console.log(`  FALLA ${label} ${detail}`);
  }
}

console.log("\n=== parseAmount ===");
for (const [input, expected] of AMOUNT_CASES) {
  const result = parseAmount(input);
  check(`${input} -> ${result}`, result === expected, `(esperado ${expected})`);
}

console.log("\n=== extractAliasTag ===");
check(
  "igorespinoza10+ana@gmail.com -> ana",
  extractAliasTag("igorespinoza10+ana@gmail.com") === "ana"
);
check(
  "igorespinoza10@gmail.com -> null",
  extractAliasTag("igorespinoza10@gmail.com") === null
);

console.log("\n=== parsePurchaseEmail ===");
for (const testCase of CASES) {
  const email: ParsedEmail = {
    messageId: "test",
    from: testCase.email.from,
    to: "igorespinoza10@gmail.com",
    subject: testCase.email.subject,
    body: testCase.email.body,
    date: new Date("2026-09-11T12:00:00Z"),
  };

  const result = parsePurchaseEmail(email);

  console.log(`\n- ${testCase.name}`);

  if (testCase.expect === null) {
    check("se ignora correctamente", result === null, `(devolvio ${JSON.stringify(result)})`);
    continue;
  }

  if (!result) {
    check("detecta movimiento", false, "(devolvio null)");
    continue;
  }

  console.log(
    `    -> ${result.type} | ${result.merchant} | $${result.amount} | ${result.category} | conf ${result.confidence}`
  );

  if (testCase.expect.type) {
    check(`tipo = ${testCase.expect.type}`, result.type === testCase.expect.type, `(obtuvo ${result.type})`);
  }
  if (testCase.expect.amount !== undefined) {
    check(`monto = ${testCase.expect.amount}`, result.amount === testCase.expect.amount, `(obtuvo ${result.amount})`);
  }
  if (testCase.expect.category) {
    check(`categoria = ${testCase.expect.category}`, result.category === testCase.expect.category, `(obtuvo ${result.category})`);
  }
  if (testCase.expect.merchantIncludes) {
    check(
      `comercio contiene "${testCase.expect.merchantIncludes}"`,
      result.merchant.toUpperCase().includes(testCase.expect.merchantIncludes.toUpperCase()),
      `(obtuvo "${result.merchant}")`
    );
  }
  if (testCase.expect.installments !== undefined) {
    check(
      `cuotas = ${testCase.expect.installments}`,
      result.numInstallments === testCase.expect.installments,
      `(obtuvo ${result.numInstallments})`
    );
  }
}

console.log(`\n================================`);
console.log(`RESULTADO: ${passed} OK / ${failed} FALLAS`);
console.log(`================================\n`);

if (failed > 0) process.exitCode = 1;

