# Shared Split - Notas Rapidas

Este documento resume la logica de split configurable para Hogar Compartido.

## Tipos de split soportados

- `50/50`: divide el monto total en partes iguales.
- `percentage`: cada usuario tiene un porcentaje y la suma debe ser 100.
- `fixed`: cada usuario tiene un monto fijo y la suma debe ser igual al monto total.

## Validaciones aplicadas

- Monto total debe ser mayor a 0.
- IDs de usuarios no pueden repetirse.
- En `percentage`, suma de porcentajes = 100 (tolerancia 0.01).
- En `fixed`, suma de montos = monto total (tolerancia 0.01).
- En `50/50`, se requieren al menos 2 integrantes en el schema de gasto compartido.

## Redondeo

Los cálculos redondean a 2 decimales y ajustan la diferencia de redondeo en el primer usuario para mantener el total exacto.

## Prueba rápida

```powershell
npm run test:shared-split
```

Este script valida:
- cálculo correcto por tipo de split
- errores esperados en casos inválidos
- validación Zod de `CreateSharedExpenseSchema`

