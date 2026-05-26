# Excellentia — Webapp (Dashboard Admin)

Panel de administración para gestionar los productos del sistema Excellentia. Permite importar productos desde QuickBooks y asignarles código de barras y peso por unidad para que la app Android de escáner los reconozca.

---

## Stack

| Tecnología | Versión |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| Estilos | Tailwind CSS v4 |
| Lenguaje | TypeScript |
| Auth | JWT en cookie `jwt` (HttpOnly vía middleware) |

---

## Setup

### Variables de entorno

Crear `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://192.168.0.131:3000
```

### Comandos

```bash
bun install          # instalar dependencias
bun run dev          # servidor de desarrollo en :3001
bun run build        # build de producción
bun run start        # iniciar producción
```

---

## Estructura de archivos

```
excellentia-webapp/
├── proxy.ts                        # Middleware de Next.js 16 (protege rutas)
├── app/
│   ├── layout.tsx                  # Layout raíz — muestra Nav si hay cookie jwt
│   ├── globals.css                 # Tailwind + colores custom (primary, primary-dark)
│   ├── page.tsx                    # Redirige a /products
│   │
│   ├── _components/
│   │   └── Nav.tsx                 # Navbar sticky con links y botón Salir
│   │
│   ├── lib/
│   │   └── auth.ts                 # getToken() — lee cookie jwt desde el browser
│   │
│   ├── login/
│   │   └── page.tsx                # Login con email/password → JWT → cookie
│   │
│   ├── products/
│   │   ├── page.tsx                # Server component — fetch productos + 401 redirect
│   │   └── _components/
│   │       ├── ProductsClient.tsx  # Client wrapper (búsqueda, sync QB, tabla)
│   │       └── ProductRow.tsx      # Fila con edición inline de barcode y peso
│   │
│   └── api/
│       └── logout/
│           └── route.ts            # Borra cookie jwt y redirige a /login
```

---

## Flujo de autenticación

```
Login (client) → POST /api/auth/login al backend
  → recibe { token }
  → document.cookie = 'jwt=...'
  → window.location.href = '/products'   ← navegación COMPLETA (no router.push)

Layout (server) → cookies().get('jwt')
  → si existe → muestra Nav + padding
  → si no → solo renderiza children (página de login)

proxy.ts (middleware) → intercepta cada request
  → /products sin cookie → redirect /login
  → /login con cookie   → redirect /products

products/page.tsx (server) → fetch al backend con Bearer token
  → si 401 → redirect('/api/logout')     ← FUERA del try-catch (importante)

/api/logout (route handler) → borra cookie + redirect /login
```

### Por qué `window.location.href` y no `router.push`

`router.push('/products')` es navegación cliente — Next.js reutiliza el layout ya renderizado sin volver al servidor. El servidor no ve la cookie recién seteada, por lo que `isLoggedIn` sigue siendo `false` y el Nav/padding no aparecen. `window.location.href` fuerza una petición HTTP completa al servidor.

### Por qué `getToken()` en componentes cliente

Los componentes cliente (`ProductRow`, `ProductsClient`) hacen llamadas al API desde el browser. El token NO debe pasarse como prop desde el servidor — Next.js serializa los props al pasar de server a client y pueden llegar vacíos. La función `getToken()` en `app/lib/auth.ts` lee el cookie `jwt` directamente de `document.cookie`.

### Por qué `redirect()` fuera del try-catch

`redirect()` de Next.js funciona lanzando una excepción interna (`NEXT_REDIRECT`). Si está dentro de un bloque `try-catch`, el catch la atrapa y la ignora, y la redirección nunca ocurre. El fetch siempre va fuera del try-catch, y el check de `res.status === 401` también.

---

## Funcionalidades

### Productos (`/products`)

- **Stats en cards**: total, sincronizados con QB, con código de barras, con peso
- **Búsqueda en tiempo real**: filtra por nombre, código o categoría
- **Sincronizar QB**: llama a `POST /api/qb/sync-products` — importa todos los Items de QuickBooks al backend MySQL. Requiere rol admin.
- **Edición inline por fila**: precio/lb, barcode y peso/lb — se guardan con el botón "Guardar" o presionando Enter. Solo envía al backend los campos que cambiaron. Llama a `PUT /api/products/:id`.

### Colores y estilos

En Tailwind v4, las variables del `@theme` con nombres que coinciden con prefijos de utilidades (`bg`, `text`, `border`) generan conflictos. Solo se definen 3 colores custom:
- `primary` → `#1565C0`
- `primary-dark` → `#0D47A1`
- `primary-50` → `#E3F2FD`

Todo lo demás usa colores estándar de Tailwind (`slate-*`, `zinc-*`, `green-*`, `red-*`, etc.).

---

## Migraciones / cambios importantes

| Fecha | Cambio |
|---|---|
| 14 mayo 2026 | Webapp creada desde cero — login, productos con sync QB e inline edit |
| 14 mayo 2026 | Fix 401: redirect fuera de try-catch + `/api/logout` route handler |
| 14 mayo 2026 | Fix design post-login: `window.location.href` en vez de `router.push` |
| 14 mayo 2026 | Fix token en cliente: `getToken()` lee cookie del browser (no prop del servidor) |
| 14 mayo 2026 | Simplificado: solo sync + edición inline, sin creación manual de productos |
| 14 mayo 2026 | Precio editable inline junto a barcode y peso |
