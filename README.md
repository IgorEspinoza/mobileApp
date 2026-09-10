# MiDinero AI

Asistente financiero personal impulsado por IA para control de gastos, ingresos y metas financieras.

## 🎯 Características

- 💰 Gestión de ingresos y gastos
- 🏠 Sistema de hogar compartido
- 🤖 Clasificación automática con IA
- 📊 Gráficos y análisis
- 🎯 Objetivos financieros
- 📈 Predicciones y recomendaciones
- 🔐 Privacidad y seguridad

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **AI**: OpenAI API
- **UI**: shadcn/ui, Framer Motion, Recharts
- **Hosting**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.17.0
- npm o yarn
- Cuenta de Supabase
- API Keys (OpenAI, Google OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd midinero-ai
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Completa los valores en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - etc.

4. **Setup Supabase**
   ```bash
   npm run db:migrate
   npm run db:seed  # Optional: seed data
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## ▲ Deploy en Vercel

### Variables de entorno mínimas

Configura estas variables en el dashboard de Vercel antes del primer deploy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET` (protege el endpoint de cron para cuotas)

Variables opcionales según features habilitadas:

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GMAIL_API_KEY`

### Pasos de deploy

1. Push del repositorio a GitHub, GitLab o Bitbucket.
2. En Vercel, crea un proyecto nuevo e importa el repositorio.
3. Verifica que Vercel detecte `Next.js` automáticamente.
4. Carga las variables de entorno usando `.env.example` como referencia.
5. Si necesitas sobreescribir el comando de instalación, usa `npm install --legacy-peer-deps`.
6. Ejecuta un deploy preview o producción.

### Auto-generación mensual de cuotas

- El cron de Vercel ejecuta `GET /api/cron/installments/generate` el día 1 de cada mes a las 04:00 UTC.
- El endpoint requiere `Authorization: Bearer <CRON_SECRET>`.
- Por cada cuota vencida pendiente:
  - crea un gasto en `expenses`;
  - registra el cargo en `installment_charges` para evitar duplicados;
  - avanza `current_installment` y desactiva la cuota al completar el total.
- Para validar sin escribir en base de datos, soporta `?dryRun=true`.
- Para simular corrida histórica, soporta `?date=YYYY-MM-DD`.

Consulta de historial por cuota:

- `GET /api/installments/:id/charges` devuelve el ledger `installment_charges` con datos del gasto generado.

### Checklist pre-deploy

Ejecuta estas validaciones localmente:

```bash
npm run verify
npm run build
```

### Checklist post-deploy

- Agregar el dominio de Vercel en los redirect/callback URLs de Supabase Auth.
- Confirmar que las migraciones de `supabase/migrations/` ya estén aplicadas al proyecto productivo.
- Verificar login, logout, reset password y carga del dashboard desde la URL pública.

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React Components
├── lib/              # Utilities & Libraries
├── types/            # TypeScript Types
├── hooks/            # Custom Hooks
└── stores/           # Zustand Stores

supabase/
├── migrations/       # Database Migrations
└── seed.sql          # Seed Data
```

## 📋 Development Phases

- **FASE 0**: Arquitectura ✅
- **FASE 1**: MVP (Login, Dashboard, Transacciones)
- **FASE 2**: Análisis (Gráficos, Escenarios, Simulador)
- **FASE 3**: Automatización (Email, Clasificación IA)
- **FASE 4**: IA Avanzada (Predicciones, Recomendaciones)
- **FASE 5**: Producción (Tests, Security, Deploy)

## 🔒 Security

- ✅ Supabase Auth + OAuth
- ✅ Row Level Security (RLS) en BD
- ✅ Validación Zod
- ✅ CSRF Protection
- ✅ Encriptación de tokens
- ✅ Audit Logging

## 📚 Documentation

- [Arquitectura](./docs/ARCHITECTURE.md)
- [Base de Datos](./docs/DATABASE.md)
- [API Reference](./docs/API.md)

## 🤝 Contributing

For now, this is a personal project.

## 📄 License

MIT

## 👤 Author

Igor Espinoza

---

**Last Updated**: June 1, 2026


