# Sistema Pedidos — Postres Tammy Light

Sistema de gestión de pedidos, producción y cobranza para Postres Tammy Light.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** + PostgreSQL (Supabase)
- **NextAuth.js v5** (autenticación con roles)
- **Supabase Realtime** (alertas en tiempo real)
- **Tailwind CSS** + Radix UI

## Roles

| Rol       | Acceso                                              |
|-----------|-----------------------------------------------------|
| ADMIN     | Todo el sistema                                     |
| OPERARIO  | Pedidos, Producción, Cobranza, Reportes             |
| VENDEDOR  | Pedidos (solo crear/editar)                         |
| CLIENTE   | Ver y crear sus propios pedidos                     |

## Setup local

### 1. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **Settings → Database → Connection string**
3. Copiar la **Transaction pooler URL** (puerto 6543) → `DATABASE_URL`
4. Copiar la **Direct connection URL** (puerto 5432) → URL para migraciones
5. Ir a **Settings → API** → copiar `URL` y `anon key`

### 2. Variables de entorno

Crear `.env.local` con:

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

### 3. Instalar y migrar

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### 4. Acceder al sistema

- URL: http://localhost:3000
- Email: `admin@postrestammy.com`
- Contraseña: `admin123` (**cambiar en producción**)

## Deploy en Vercel

1. Push a GitHub
2. Importar en [vercel.com](https://vercel.com)
3. Configurar las mismas variables de entorno en Vercel → Settings → Environment Variables
4. Para `AUTH_URL` usar la URL de producción de Vercel

## Scripts útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run db:studio    # Abrir Prisma Studio (explorador de BD)
npm run db:seed      # Cargar datos iniciales
npm run db:migrate   # Aplicar migraciones
```

## Módulos

- `/dashboard/pedidos` — Crear y gestionar pedidos
- `/dashboard/produccion` — Comanda del día + alertas en tiempo real
- `/dashboard/cobranza` — Deudas, pagos, IVA separado
- `/dashboard/admin` — Clientes, productos, categorías, usuarios, proveedores
- `/dashboard/reportes` — Gráficos de ventas y estadísticas

## Alertas en tiempo real

Las alertas de pedidos fuera de horario se envían vía **Supabase Realtime**.
El panel de producción escucha cambios en la tabla `alertas` en tiempo real
usando WebSockets nativos de Supabase — sin configuración adicional.

Para habilitar notificaciones del navegador, ir a Producción y aceptar el
permiso cuando lo solicite el navegador.
