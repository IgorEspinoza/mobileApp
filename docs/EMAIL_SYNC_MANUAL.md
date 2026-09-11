# Email Sync Manual (Fase 2)

Este flujo habilita la ingesta manual de correos hacia la bandeja de revision.

## Endpoint

- `POST /api/email/sync`

Recibe correos en el body, los parsea con reglas y guarda clasificaciones en
`expense_classifications`.

## Requisitos

1. Usuario autenticado.
2. Existir una fila activa en `email_imports` para el usuario.
3. (Recomendado) migracion `005_email_parsing.sql` aplicada.

## Ejemplo de request

```json
{
  "dry_run": false,
  "emails": [
    {
      "from": "enviodigital@bancochile.cl",
      "to": "igorespinoza10@gmail.com",
      "subject": "Compra con Tarjeta",
      "body": "Se realizo una compra por $39.990 en LIDER EXPRESS el 10/09/2026.",
      "date": "2026-09-10T13:20:00.000Z"
    }
  ]
}
```

## Respuesta

Devuelve estadisticas de sync:

- `received`
- `parsed`
- `inserted`
- `duplicated`
- `ignored`

## Prueba local del parser + schema (sin DB)

```powershell
npm run test:email-sync-payload
```

## Nota

Este endpoint aun no se conecta directo a Gmail/IMAP. Sirve para cerrar el flujo
end-to-end (ingesta -> review -> approve/reject) mientras se implementa el
conector real.

