# Email Auto Sync (IMAP)

Este flujo permite leer correos reales desde Gmail/Outlook y cargarlos a la bandeja de revisión.

## Endpoint

- `POST /api/email/sync/auto`

Query params opcionales:
- `limit` (default 25, max 100)
- `unseenOnly` (default `true`)

## Requisitos previos

1. Tener sesión iniciada en la app.
2. Existir una fila activa en `email_imports` para tu usuario (`is_active = true`).
3. En esa fila, `email_address` debe ser tu correo real.
4. Guardar la App Password IMAP en `access_token`.

## Gmail (recomendado)

1. Activar verificación en 2 pasos en Google.
2. Crear una App Password.
3. Guardarla en `email_imports.access_token`.

Servidor usado por defecto: `imap.gmail.com:993` (TLS).

## Cómo usar desde UI

En `Revisar correos`, usar el botón **Sincronizar correo**.

La app:
- trae correos recientes no leídos
- detecta compras/abonos
- guarda filas en `expense_classifications`
- muestra todo en la bandeja para aprobar/rechazar

## Nota

La versión actual usa deduplicado por combinación `subject + merchant + body_snippet`
para mantener compatibilidad incluso si aún no se aplicó la migración 005.

