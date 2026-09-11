import { SyncEmailSchema } from "../src/lib/validations/schemas";
import { parsePurchaseEmail } from "../src/lib/email/parser";

const payload = {
  dry_run: true,
  emails: [
    {
      from: "enviodigital@bancochile.cl",
      to: "igorespinoza10@gmail.com",
      subject: "Compra con Tarjeta",
      body: "Se realizo una compra por $39.990 en LIDER EXPRESS el 10/09/2026.",
      date: "2026-09-10T13:20:00.000Z",
    },
    {
      from: "enviodigital@bancochile.cl",
      to: "igorespinoza10@gmail.com",
      subject: "Aviso de movimiento",
      body: "Movimiento por $12.500 en CAFE DEL CENTRO el 10/09/2026.",
      date: "2026-09-10T15:20:00.000Z",
    },
    {
      from: "comunicaciones@bancoestado.cl",
      to: "igorespinoza10@gmail.com",
      subject: "Transferencia recibida",
      body: "Recibiste un abono por $250.000 en tu cuenta el 09/09/2026.",
      date: "2026-09-09T12:00:00.000Z",
    },
  ],
};

const validated = SyncEmailSchema.safeParse(payload);
if (!validated.success) {
  console.error("Payload invalido:", validated.error.issues[0]);
  process.exit(1);
}

let parsed = 0;
for (const email of validated.data.emails) {
  const movement = parsePurchaseEmail({
    messageId: crypto.randomUUID(),
    from: email.from,
    to: email.to || "",
    subject: email.subject,
    body: email.body,
    date: email.date ? new Date(email.date) : new Date(),
  });

  if (!movement) continue;

  parsed += 1;
  console.log(
    `${movement.type.toUpperCase()} | ${movement.merchant} | ${movement.category} | ${movement.amount}`
  );
}

  console.log(`\nOK: payload valido, ${parsed}/${validated.data.emails.length} correos parseables`);

