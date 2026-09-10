#!/bin/bash
# MiDinero AI - Setup Script (FASE 0 ✅ Completado)

echo "=========================================="
echo "MiDinero AI - Setup Initial"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}PASO 1: Instalar dependencias...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
else
    echo -e "${RED}❌ Error al instalar dependencias${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}PASO 2: Configurar variables de entorno...${NC}"
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo -e "${GREEN}✅ Archivo .env.local creado${NC}"
    echo -e "${YELLOW}⚠️  Necesitas llenar los valores en .env.local${NC}"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - OPENAI_API_KEY (opcional por ahora)"
    echo ""
    exit 0
else
    echo -e "${GREEN}✅ .env.local ya existe${NC}"
fi

echo ""
echo -e "${YELLOW}PASO 3: Verificar Node version...${NC}"
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node $NODE_VERSION${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Setup completado!"
echo "==========================================${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Llenar .env.local con tus credenciales de Supabase"
echo "2. Ejecutar: npm run db:migrate (cuando Supabase esté configurado)"
echo "3. Ejecutar: npm run dev"
echo "4. Abrir: http://localhost:3000"
echo ""
echo "Documentación:"
echo "- README.md - Visión general"
echo "- docs/ARCHITECTURE.md - Arquitectura técnica"
echo "- FASE1.md - Especificación funcional"
echo "- PROYECTO_STATUS.md - Estado actual"

