@echo off
REM MiDinero AI - Setup Script (FASE 0 completado)

echo.
echo ==========================================
echo MiDinero AI - Setup Inicial
echo ==========================================
echo.

echo [1/3] Instalar dependencias...
call npm install
if errorlevel 1 (
    echo Error al instalar dependencias
    exit /b 1
)
echo ✓ Dependencias instaladas
echo.

echo [2/3] Configurar variables de entorno...
if not exist .env.local (
    copy .env.example .env.local
    echo ✓ Archivo .env.local creado
    echo.
    echo IMPORTANTE: Necesitas llenar los valores en .env.local:
    echo   - NEXT_PUBLIC_SUPABASE_URL
    echo   - NEXT_PUBLIC_SUPABASE_ANON_KEY
    echo   - OPENAI_API_KEY (opcional por ahora)
    echo.
    pause
    exit /b 0
)
echo ✓ .env.local ya existe
echo.

echo [3/3] Verificar Node version...
call node -v
echo.

echo ==========================================
echo ✓ Setup completado!
echo ==========================================
echo.
echo Próximos pasos:
echo 1. Llenar .env.local con tus credenciales de Supabase
echo 2. Ejecutar: npm run db:migrate (cuando Supabase esté configurado)
echo 3. Ejecutar: npm run dev
echo 4. Abrir: http://localhost:3000
echo.
echo Documentación:
echo - README.md - Visión general
echo - docs/ARCHITECTURE.md - Arquitectura técnica
echo - FASE1.md - Especificación funcional
echo - PROYECTO_STATUS.md - Estado actual
echo.
pause

