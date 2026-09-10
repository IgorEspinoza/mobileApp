# Arquitectura - MiDinero AI

## 🏗️ Vista General

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (NEXT.JS)                        │
│  - React 19 + TypeScript + TailwindCSS + shadcn/ui         │
│  - Pages: auth, dashboard, home, transactions, etc         │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│         API LAYER (NEXT.JS API ROUTES)                      │
│  - /api/auth, /api/expenses, /api/homes, /api/ai/*         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│          SUPABASE (Backend-as-a-Service)                    │
│  - PostgreSQL + Auth + RLS + Real-time                      │
└─────────────────────────────────────────────────────────────┘
           ↓ IA         ↓ Correos       ↓ Logs
    ┌──────────┬────────────────┬──────────────┐
    │ OpenAI   │ Gmail/IMAP     │ Sentry       │
    │ API      │ + Processing   │ + Vercel Logs│
    └──────────┴────────────────┴──────────────┘
```

## 🔐 Security Layers

1. **Autenticación**: Supabase Auth + JWT + Google OAuth
2. **Autorización**: RLS en TODAS las tablas
3. **Validación**: Zod en requests/responses
4. **Datos**: Encriptación en tránsito + tokens encriptados
5. **Auditoría**: Logging de todas las acciones críticas

## 📊 Modelo de Datos

### Relaciones Principales

```
users
  ├── homes (creator_id)
  ├── home_members (user_id)
  ├── incomes (user_id)
  ├── expenses (user_id)
  ├── fixed_expenses (user_id)
  ├── installments (user_id)
  ├── goals (user_id)
  ├── scenarios (user_id)
  ├── predictions (user_id)
  ├── email_imports (user_id)
  └── audit_logs (user_id)

homes
  ├── home_members (home_id)
  ├── shared_expenses (home_id)
  ├── fixed_expenses (home_id)
  └── created_by (creator_id)
```

### Políticas RLS

Cada tabla tiene RLS policies que aseguran:
- ✅ Usuarios solo ven SUS datos
- ✅ Home members solo ven datos de su hogar
- ✅ Ningún acceso cruzado entre usuarios

## 🔄 Flujos de Datos

### Login Flow
```
Usuario → Google OAuth → Supabase Auth → JWT → Cliente
```

### Gasto Personal Flow
```
Cliente → /api/expenses POST
        → Validación Zod
        → Supabase INSERT (RLS check)
        → Audit Log
        → Respuesta
```

### Gasto Compartido Flow
```
Cliente → /api/homes/:id/shared-expenses POST
        → Calcular split (50/50, %, fijo)
        → Insert shared_expense
        → Generar expense para cada miembro
        → Audit Log
```

### Clasificación IA Flow
```
Email → Parser → Extrae (comercio, descripción)
     → OpenAI API → Predice categoría + confianza
     → Si confianza > 0.7 → Auto-crear expense
     → Si confianza < 0.7 → RevisióN manual
```

## 🎯 Patrones de Diseño

### Client-Side
- React Query para sincronización de datos
- Zustand para estado global
- Custom hooks para lógica reutilizable
- Suspense boundaries para loading states

### Server-Side
- API routes como middleware entre cliente y Supabase
- Validación de inputs con Zod
- Error handling centralizado
- Rate limiting en endpoints críticos

## 📈 Performance Considerations

1. **Índices en BD**: Creados para queries frecuentes
2. **Client-side Caching**: React Query con 5min stale time
3. **Pagination**: Para listas largas (transacciones, etc)
4. **Database Queries**: Optimizadas con selecciones específicas
5. **Image Optimization**: Next.js Image component

## 🚨 Error Handling

- Try-catch blocks en API routes
- Zod validation errors → 400 Bad Request
- Auth errors → 401 Unauthorized
- RLS violations → 403 Forbidden
- Server errors → 500 con Sentry logging
- Toast notifications en cliente

## 📝 Logging Strategy

### Audit Logs
- Login/Logout
- CRUD operations
- Cambios en datos sensibles
- Eliminaciones de registros
- Conexión de servicios (email, etc)

### Application Logs
- Errores en API routes
- OpenAI API calls
- Email processing
- Database migrations

## 🔄 CI/CD Pipeline

```yaml
GitHub Push
  ↓
Unit Tests (si aplica)
  ↓
Type Checking
  ↓
Linting
  ↓
Deploy to Vercel
  ↓
Database Migrations (si aplica)
  ↓
E2E Tests (futuro)
```

## 🎨 Frontend Architecture

### Directory Structure
```
src/
├── app/
│   ├── (auth)/          # Auth pages (no layout)
│   ├── (dashboard)/     # Dashboard pages (con layout)
│   └── api/             # API routes
├── components/
│   ├── ui/              # shadcn components
│   ├── dashboard/       # Dashboard specific
│   ├── forms/           # Form components
│   └── common/          # Reusable components
├── lib/
│   ├── supabase/        # Supabase client
│   ├── ai/              # IA functions
│   ├── validations/     # Zod schemas
│   └── utils/           # Helper functions
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
└── stores/              # Zustand stores
```

### Component Patterns

**Smart Components** (con lógica)
```typescript
export default function Dashboard() {
  const { data } = useQuery(...);
  // lógica...
  return <DumbComponent {...props} />;
}
```

**Dumb Components** (presentacionales)
```typescript
export function DashboardCard({ title, value }) {
  return <div>{title}: {value}</div>;
}
```

## 🛡️ Privacy & Data Protection

- ✅ No se comparten datos entre usuarios
- ✅ No compartimos datos con terceros
- ✅ Respaldos automáticos en Supabase
- ✅ Tokens encriptados en base de datos
- ✅ Cumplimiento GDPR (derecho al olvido, etc)

## 🔮 Futuros Mejoras

- [ ] E2E encryption
- [ ] Offline support (PWA)
- [ ] Mobile app nativo
- [ ] Multi-lenguaje (ES/EN)
- [ ] Export data (CSV, PDF)
- [ ] Integration con bancos

