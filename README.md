# REBELYN — Tienda online

Tienda online completa para la marca de ropa **REBELYN**: catálogo, carrito, checkout con Stripe (tarjeta, Apple Pay y Google Pay), cuentas de cliente, panel de administración y emails transaccionales.

- **Stack:** Next.js 15 (App Router) · Prisma · PostgreSQL (Neon) · Stripe · Resend · Tailwind CSS v4
- **Identidad:** streetwear urbano, negro/blanco con acentos verde volt `#00ff76`. Tagline: *Rompe con lo común*.
- **Maqueta original** (referencia de estética): archivada en `legacy/index.html`.

---

## Puesta en marcha

### 1. Variables de entorno

Copia `.env.example` a `.env` y rellena:

```bash
cp .env.example .env
```

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | URL de conexión de Neon (PostgreSQL). Termina en `?sslmode=require`. |
| `DIRECT_URL` | URL directa de Neon (para `prisma migrate`). |
| `SESSION_SECRET` | Cualquier cadena larga aleatoria (mínimo 32 caracteres). |
| `NEXT_PUBLIC_SITE_URL` | URL pública, ej. `https://rebelyn.net`. |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (`sk_live_…` / `sk_test_…`). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública (`pk_live_…` / `pk_test_…`). |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook (`whsec_…`). |
| `RESEND_API_KEY` | API key de Resend. |
| `EMAIL_FROM` | Remitente verificado, ej. `REBELYN <hola@rebelyn.net>`. |

Mientras no existan las claves de Stripe, el checkout responde `503 "Pago no configurado"` (el resto de la tienda funciona).

### 2. Base de datos

```bash
npm install
npx prisma migrate dev --name init   # crea el esquema en Neon
npm run seed                          # categorías, 7 productos, descuento BIENVENIDO10, admin
```

### 3. Desarrollo

```bash
npm run dev        # http://localhost:3000
npm run build      # build de producción (pasa sin BD: las páginas con datos son dinámicas)
npm run typecheck
```

### 4. Panel de administración

1. Entra en `/login` y usa el admin del seed:
   - Email: `admin@rebelyn.net`
   - Contraseña: `Rebelyn2026!`
2. **Cambia esta contraseña inmediatamente** en *Mi cuenta → Contraseña*.
3. El panel está en `/admin`: dashboard, pedidos (estado, seguimiento, reembolsos), productos, categorías, inventario (ajustes con historial), clientes, descuentos, devoluciones (aprobar → recibir → reembolsar), mensajes de contacto, ajustes de la tienda y auditoría (SUPER_ADMIN).

### 5. Stripe

1. Crea la cuenta en https://dashboard.stripe.com y completa la activación.
2. Copia las claves del panel (*Developers → API keys*) a `.env`.
3. Crea el webhook (*Developers → Webhooks*) apuntando a `https://TU-DOMINIO/api/stripe/webhook` con los eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copia el `whsec_` del webhook a `STRIPE_WEBHOOK_SECRET`.
5. En *Settings → Payment methods* activa Card, Apple Pay y Google Pay (aparecen solos en el checkout cuando están activos).

### 6. Dominio y despliegue (Vercel)

1. Sube el proyecto a GitHub y créalo como proyecto en Vercel (framework **Next.js**).
2. Añade las mismas variables de entorno en Vercel (Production).
3. Conecta el dominio **rebelyn.net** en *Settings → Domains* y apunta el DNS según las instrucciones de Vercel.
4. Después del primer deploy, ejecuta `npx prisma migrate deploy` (o conecta Vercel a Neon con el plugin Prisma).

---

## Estructura

```
prisma/            Esquema (User, Product, Order, Refund, ReturnRequest, …) + seed
src/app/(store)/   Tienda: home, shop, producto, carrito, checkout, cuenta, legales
src/app/admin/     Panel de administración (misma app, protegido por rol)
src/app/api/       API REST (auth, cart, checkout, admin, stripe webhook)
src/components/    Componentes store y admin
src/lib/           Lógica de servidor: auth, carrito, stock, pedidos, pagos, emails
public/img/        Imágenes servidas (placeholders SVG incluidos)
legacy/            Maqueta original en HTML plano (referencia)
```

## Seguridad incluida

- Sesiones propias en BD (token SHA-256 en cookie httpOnly, SameSite=Lax) y contraseña con bcrypt.
- RBAC: CUSTOMER / ADMIN / SUPER_ADMIN; `/admin` protegido en middleware + layout + API.
- Precios, stock y descuentos calculados **solo en servidor** (nunca se confía al cliente).
- Validación Zod en todas las rutas, rate limiting, verificación de origen CSRF, cabeceras de seguridad y CSP (incluye dominios de Stripe).
- Auditoría de acciones administrativas; datos de tarjeta nunca tocan nuestro servidor (Stripe Payment Element).

---

## Imágenes de productos

Los chandales usan ya las fotos reales alojadas en postimg (así en el seed):

| Producto | Portada | Galería |
| --- | --- | --- |
| Chandal invierno burdeos | `https://i.postimg.cc/VvGJBfwz/Chandal-burdeos-con-detalles-goticos.png` | `https://i.postimg.cc/vZ9mDL48/chandal-invierno-b-1.jpg`, `https://i.postimg.cc/KY28TkM6/chandal-invierno-b-2.jpg` |
| Chandal invierno crema | `https://i.postimg.cc/X7qGNCKv/Chandal-crema-con-detalles-goticos.png` | `https://i.postimg.cc/bwbvdHZP/chandal-invierno-a-4.jpg`, `https://i.postimg.cc/FHcK1gY4/chandal-invierno-a-1.jpg` |

El resto de productos (tee, hoodie, cargo, zip, gorra) usan placeholders SVG en `public/img/products/`. Cuando tengas las fotos, subelas a postimg y actualiza `prisma/seed.ts` (o directamente en el panel admin).

Otros activos de marca (en `src/lib/brand.ts`): logo animado de cabecera, logo estático, favicon, imagen del hero.

## Contacto de la marca

- Email: rebelynoff@gmail.com · Tel: 632 530 973
- Instagram / TikTok: @rebelyn.off
