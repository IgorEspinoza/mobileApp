# FASE 1 - MVP Funcional

**Objetivo**: Entregar aplicación funcional base con login, dashboard personal, hogar compartido y gestión de transacciones.

**Duración estimada**: 3-4 semanas

**Criterios de éxito**:
- ✅ App funcional para 2 usuarios
- ✅ Responsive mobile-first en todos los dispositivos
- ✅ Cero errores críticos en producción
- ✅ Deploy en Vercel con SSL
- ✅ Auth segura con RLS activas
- ✅ Métricas básicas funcionando

---

## 📋 Especificación Funcional

### 1. AUTENTICACIÓN (Semana 1)

#### 1.1 Login
- [ ] Email + Contraseña
- [ ] Google OAuth
- [ ] Recuperación de contraseña
- [ ] Remember me
- [ ] Rate limiting (máx 5 intentos)

**Rutas**:
- `GET /auth/login` - Página de login
- `GET /auth/register` - Página de registro
- `POST /api/auth/login` - Login endpoint
- `POST /api/auth/register` - Register endpoint
- `POST /api/auth/logout` - Logout endpoint

#### 1.2 Session Management
- [ ] JWT tokens en cookies
- [ ] Auto-refresh de tokens
- [ ] Logout automático en expiración
- [ ] Persistencia de sesión

### 2. DASHBOARD PERSONAL - MI DINERO (Semana 2)

#### 2.1 Overview Cards (Resumen del Mes)
```
┌─────────────────────────────┐
│ Este Mes                    │
│ 💰 Ingresos:    2.500.000  │
│ 💸 Gastos:      1.200.000  │
│ 💎 Ahorro:      1.300.000  │
│ 💳 Saldo Libre:   900.000  │
└─────────────────────────────┘
```

- [ ] Cálculo automático de ingresos del mes
- [ ] Cálculo automático de gastos del mes
- [ ] Cálculo automático de ahorros
- [ ] Saldo disponible (ingresos - gastos)
- [ ] Animaciones al cargar (Framer Motion)

#### 2.2 Últimas Transacciones
```
┌──────────────────────────────────────┐
│ Últimos 5 Gastos                     │
│ 🛒 Tottus      -$45.000    10 ago   │
│ 🚗 Uber Eats   -$22.000    9 ago    │
│ 💉 Farmacia    -$15.000    8 ago    │
└──────────────────────────────────────┘
```

- [ ] Mostrar últimas 5 transacciones
- [ ] Icono según categoría
- [ ] Fecha relativa (hace X días)
- [ ] Link a detalle

**Rutas**:
- `GET /api/expenses?limit=5&sort=recent` - Últimos gastos
- `GET /api/incomes` - Ingresos del mes
- `GET /api/dashboard/summary` - Resumen mes

### 3. REGISTRO DE INGRESOS (Semana 2)

#### 3.1 Modal/Form de Nuevo Ingreso
```
┌─────────────────────────────┐
│ + Nuevo Ingreso             │
│                             │
│ Fecha:       [2024-01-15] │
│ Monto:       [2.500.000] │
│ Fuente:      [Salary ▼]  │
│ Descripción: [Sueldo...] │
│                             │
│ [Cancelar] [Guardar]        │
└─────────────────────────────┘
```

- [ ] Form modal
- [ ] Validación con Zod
- [ ] Date picker
- [ ] Dropdown de fuentes (salary, bonus, other)
- [ ] Success toast
- [ ] Error handling

**Rutas**:
- `POST /api/incomes` - Crear ingreso
- `PUT /api/incomes/:id` - Editar ingreso
- `DELETE /api/incomes/:id` - Eliminar ingreso

### 4. REGISTRO DE GASTOS (Semana 2)

#### 4.1 Modal/Form de Nuevo Gasto
```
┌──────────────────────────────┐
│ + Nuevo Gasto                │
│                              │
│ Fecha:       [2024-01-15]  │
│ Comercio:    [Tottus]       │
│ Monto:       [45.000]       │
│ Categoría:   [Supermercado ▼] │
│ Descripción: [Compras...]   │
│ Imagen:      [Adjuntar]     │
│                              │
│ [Cancelar] [Guardar]         │
└──────────────────────────────┘
```

- [ ] Form modal
- [ ] Validación Zod
- [ ] Date picker
- [ ] Dropdown categorías
- [ ] Upload de recibo (opcional)
- [ ] Success toast
- [ ] Error handling

**Rutas**:
- `POST /api/expenses` - Crear gasto
- `PUT /api/expenses/:id` - Editar gasto
- `DELETE /api/expenses/:id` - Eliminar gasto
- `POST /api/expenses/:id/receipt` - Upload recibo

### 5. DASHBOARD HOGAR - NUESTRO HOGAR (Semana 3)

#### 5.1 Selector de Hogar
- [ ] Crear nuevo hogar
- [ ] Invitar a usuario
- [ ] Cambiar hogar activo

#### 5.2 Overview Hogar
```
┌──────────────────────────────────┐
│ 🏠 Departamento Santiago         │
│ 👤 Igor (tú)  👤 Amiga          │
│                                  │
│ Gastos Compartidos - Este Mes   │
│ 🏠 Arriendo     500.000         │
│    Tu aporte:   250.000 (50%)   │
│ 💡 Servicios    150.000         │
│    Tu aporte:    75.000 (50%)   │
│ 🛒 Supermercado 200.000         │
│    Tu aporte:    60.000 (30%)   │
│                                  │
│ Resumen: Tu gasto = $385.000    │
└──────────────────────────────────┘
```

- [ ] Mostrar miembros del hogar
- [ ] Listar gastos compartidos del mes
- [ ] Cálcular el aporte por usuario según split
- [ ] Mostrar resumen por usuario

**Rutas**:
- `GET /api/homes` - Listar hogares del usuario
- `POST /api/homes` - Crear hogar
- `GET /api/homes/:id` - Detalles hogar
- `POST /api/homes/:id/invite` - Invitar usuario
- `GET /api/homes/:id/shared-expenses` - Gastos compartidos

### 6. GASTOS COMPARTIDOS (Semana 3)

#### 6.1 Crear Gasto Compartido
```
┌──────────────────────────────────┐
│ + Nuevo Gasto Compartido         │
│                                  │
│ Comercio:  [Arriendo]            │
│ Monto:     [500.000]             │
│ Tipo split: [50/50 ▼]            │
│                                  │
│ Split Detalle:                   │
│ ☑ Igor        250.000            │
│ ☑ Amiga       250.000            │
│                                  │
│ [Cancelar] [Guardar]             │
└──────────────────────────────────┘
```

- [ ] Form modal
- [ ] Validación Zod
- [ ] Select tipo split (50/50, %, fijo)
- [ ] Inputs dinámicos según split
- [ ] Checkboxes para incluir/excluir usuarios
- [ ] Cálculo automático de montos

**Rutas**:
- `POST /api/homes/:id/shared-expenses` - Crear
- `PUT /api/homes/:id/shared-expenses/:id` - Editar
- `DELETE /api/homes/:id/shared-expenses/:id` - Eliminar

### 7. GASTOS FIJOS (Semana 3)

#### 7.1 Crear Gasto Fijo
```
┌──────────────────────────────┐
│ + Nuevo Gasto Fijo           │
│                              │
│ Categoría:   [Arriendo ▼]   │
│ Monto:       [500.000]      │
│ Frecuencia:  [Mensual ▼]    │
│ Fecha inicio: [2024-01-01] │
│ Fecha fin:   [     ]        │
│                              │
│ [Cancelar] [Guardar]         │
└──────────────────────────────┘
```

- [ ] Form modal
- [ ] Validación Zod
- [ ] Dropdown categorías
- [ ] Dropdown frecuencia (monthly, weekly)
- [ ] Date pickers inicio/fin
- [ ] Toggle activo/inactivo

**Rutas**:
- `POST /api/fixed-expenses` - Crear
- `GET /api/fixed-expenses` - Listar
- `PUT /api/fixed-expenses/:id` - Editar
- `DELETE /api/fixed-expenses/:id` - Eliminar

### 8. CUOTAS (Semana 3-4)

#### 8.1 Crear Cuota
```
┌──────────────────────────────┐
│ + Nueva Cuota                │
│                              │
│ Producto:    [Lavadora]      │
│ Total:       [300.000]       │
│ Cuotas:      [12]            │
│ Fecha inicio: [2024-01-01]  │
│                              │
│ Resumen:                     │
│ Cuota mensual: $25.000       │
│ Término: Diciembre 2024      │
│                              │
│ [Cancelar] [Guardar]         │
└──────────────────────────────┘
```

- [ ] Form modal
- [ ] Validación Zod
- [ ] Calcular cuota mensual
- [ ] Mostrar fecha de término estimada
- [ ] Toggle activo/inactivo

#### 8.2 Mostrar Cuotas Activas
- [ ] Listar cuotas en dashboard
- [ ] Mostrar: cuota mensual, cuotas restantes, fecha término

**Rutas**:
- `POST /api/installments` - Crear
- `GET /api/installments` - Listar
- `PUT /api/installments/:id` - Editar
- `DELETE /api/installments/:id` - Eliminar

### 9. RESPONSIVE DESIGN (Semana 4)

- [ ] Mobile-first (desde 320px)
- [ ] Tablet (768px)
- [ ] Desktop (1024px+)
- [ ] Touch-friendly buttons/inputs
- [ ] Drawer navigation en mobile
- [ ] Optimización de imágenes

### 10. DEPLOY & SEGURIDAD (Semana 4)

- [ ] Deploy a Vercel
- [ ] Configurar variables de entorno
- [ ] SSL/HTTPS funcionando
- [ ] RLS policies activas
- [ ] Audit logs registrando cambios
- [ ] Tests básicos de seguridad

---

## 🗂️ Ficheros a Crear/Modificar

### Auth Pages
```
src/app/(auth)/
├── login/page.tsx              ← LOGIN PAGE
├── register/page.tsx           ← REGISTER PAGE
└── reset-password/page.tsx     ← RESET PAGE
```

### Dashboard Pages
```
src/app/(dashboard)/
├── layout.tsx                  ← LAYOUT CON NAVBAR
├── dashboard/page.tsx          ← MI DINERO DASHBOARD
├── home/page.tsx               ← NUESTRO HOGAR DASHBOARD
├── transactions/page.tsx       ← LISTA COMPLETA DE TX
└── settings/page.tsx           ← SETTINGS USUARIO
```

### API Routes
```
src/app/api/
├── auth/
│   ├── login/route.ts
│   ├── register/route.ts
│   ├── logout/route.ts
│   └── refresh/route.ts
├── expenses/
│   ├── route.ts                ← CRUD
│   └── [id]/route.ts           ← CRUD individual
├── incomes/
│   ├── route.ts                ← CRUD
│   └── [id]/route.ts
├── homes/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── [id]/shared-expenses/route.ts
├── fixed-expenses/
│   ├── route.ts
│   └── [id]/route.ts
├── installments/
│   ├── route.ts
│   └── [id]/route.ts
└── dashboard/
    └── summary/route.ts        ← RESUMEN MES
```

### Components
```
src/components/
├── dashboard/
│   ├── SummaryCards.tsx        ← 4 TARJETAS RESUMEN
│   ├── RecentTransactions.tsx  ← ÚLTIMOS GASTOS
│   └── HomeOverview.tsx        ← RESUMEN HOGAR
├── forms/
│   ├── IncomeForm.tsx          ← FORM INGRESO
│   ├── ExpenseForm.tsx         ← FORM GASTO
│   ├── SharedExpenseForm.tsx   ← FORM GASTO COMPARTIDO
│   ├── FixedExpenseForm.tsx    ← FORM GASTO FIJO
│   └── InstallmentForm.tsx     ← FORM CUOTA
├── layout/
│   ├── Navbar.tsx              ← NAVBAR/HEADER
│   ├── Sidebar.tsx             ← SIDEBAR DESKTOP
│   └── MobileNav.tsx           ← NAV MOBILE
└── common/
    ├── Modal.tsx               ← MODAL GENÉRICO
    ├── Loading.tsx             ← LOADING SPINNER
    └── ErrorBoundary.tsx       ← ERROR BOUNDARY
```

### Hooks
```
src/hooks/
├── useAuth.ts                  ← AUTH MANAGEMENT
├── useExpenses.ts              ← EXPENSES CRUD
├── useIncomes.ts               ← INCOMES CRUD
├── useHomes.ts                 ← HOMES MANAGEMENT
├── useDashboardSummary.ts      ← DASHBOARD DATA
└── useLocalStorage.ts          ← LOCAL STORAGE HELPER
```

---

## ✅ Checklist de Implementación

### Semana 1 - Auth
- [ ] Setup Supabase Auth
- [ ] Create auth API routes
- [ ] Login page + functionality
- [ ] Register page + functionality
- [ ] Middleware de autenticación
- [ ] Logout functionality
- [ ] Password reset (email)

### Semana 2 - Dashboard Personal
- [ ] Summary cards component
- [ ] Income form + CRUD
- [ ] Expense form + CRUD
- [ ] Recent transactions display
- [ ] Dashboard API endpoints
- [ ] Mobile responsive layout

### Semana 3 - Hogar Compartido
- [ ] Home creation
- [ ] Home invitation
- [ ] Home members management
- [ ] Shared expense form + CRUD
- [ ] Fixed expenses form + CRUD
- [ ] Home dashboard display

### Semana 4 - Finalización
- [ ] Installments form + CRUD
- [ ] Full responsive design
- [ ] Error handling & validation
- [ ] Loading states
- [ ] Audit logging
- [ ] Deploy to Vercel

---

## 🧪 Testing Strategy (FASE 1)

Mientras que E2E tests son para FASE 5, realizaremos:

- ✅ Manual testing de flujos críticos
- ✅ Validación en diferentes dispositivos
- ✅ Pruebas de seguridad (RLS)
- ✅ Pruebas de performance

---

## 📐 Datos Seed/Demo (FASE 1)

Para testing, crear usuario demo con:
- ✅ 3 ingresos (salario + bonus)
- ✅ 10 gastos variados
- ✅ 1 hogar con 2 miembros
- ✅ 5 gastos compartidos
- ✅ 2 gastos fijos
- ✅ 2 cuotas activas

---

**SIGUIENTE PASO**: 
Una vez completa FASE 1, aguardar aprobación para pasar a FASE 2 (Análisis).

