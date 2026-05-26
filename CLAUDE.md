@AGENTS.md

# Excellentia Webapp — Instrucciones para Claude

## Proyecto

Dashboard admin de Next.js 16 conectado al backend `excellentia` (Express + MySQL). Permite a admins sincronizar productos desde QuickBooks y asignarles código de barras, peso y precio mínimo.

## Comandos

```bash
bun run dev    # desarrollo
bun run build  # verificar que compila antes de entregar
```

**Siempre correr `bun run build` antes de terminar.**

## Reglas críticas

### Auth en componentes cliente
Usar `getToken()` de `app/lib/auth.ts` que lee `document.cookie` directamente. NO pasar JWT como prop del servidor.

### Navegación post-auth
Usar `window.location.href` y NO `router.push` cuando se cambia el estado de autenticación.

### redirect() en server components
`redirect()` lanza excepción interna. Debe estar fuera de `try-catch`.

### Colores Tailwind v4
Solo 3 custom en `@theme`: `primary`, `primary-dark`, `primary-50`.

### Middleware
Next.js 16 nombra el middleware `proxy.ts` (exporta `proxy`). No crear `middleware.ts`.

## Productos — Flujo y edición

**Crear productos:** siempre desde QBO (Productos y servicios → Nuevo, tipo Inventory) → botón "Sincronizar QB" en webapp los importa a MySQL con `qb_item_id`. **No existe botón "Nuevo producto" en la webapp.**

**Editar productos:** modal (botón lápiz en la fila, solo admins). La tabla es read-only para todos.

### Campos editables en el modal

| Campo | Campo DB | Notas |
|---|---|---|
| Nombre | `name` | Al guardar → sync `Name` a QBO |
| Descripción de venta | `description` | Sales Description en QBO. Al guardar → sync `Description` a QBO |
| Precio ($/lb) | `price` | |
| Precio mínimo | `min_price` | |
| Peso / lb | `weight_per_unit` | |
| Código de barras | `barcode` | Al guardar → sync `Sku` a QBO |
| Categoría | `category` | |
| Stock | `stock` | Al guardar → sync `QtyOnHand` a QBO (solo ítems Inventory) |

### Validaciones del modal

- Nombre: mínimo 2 caracteres (inline, borde rojo)
- Precio: mayor a 0 (inline)
- Stock: no negativo (inline)
- Peso: no negativo si se ingresa (inline)

### Columnas visibles en la tabla (read-only)

Nombre + descripción (gris, truncada) · Precio/lb · Barcode · Precio min · Peso · Stock (rojo=0, ámbar≤5, normal) · QB badge · Botón editar (admin)

## Arquitectura

- `proxy.ts` — middleware, protege rutas
- `app/layout.tsx` — server component; lee cookie `jwt`; muestra Sidebar solo si hay sesión válida
- `app/products/page.tsx` — server component, fetch + 401 redirect
- `app/products/_components/ProductsClient.tsx` — búsqueda, stats, botón Sincronizar QB
- `app/products/_components/ProductRow.tsx` — fila read-only + botón lápiz (admin) → abre modal
- `app/products/_components/ProductModal.tsx` — modal edición con validaciones inline. Sin modo creación.

### Nota sobre logout en client components

Siempre usar `window.location.href = '/api/logout'` (nunca `router.push`). El layout es un server component — con soft nav no se re-renderiza y el sidebar queda visible en la página de login.

## Backend esperado

- `GET /api/products?limit=500` — lista productos
- `PUT /api/products/:id` — actualiza campos; si `name`/`description`/`barcode` cambian → `updateItemMeta` a QBO; si `stock` cambia → `updateItemQtyOnHand` a QBO (solo Inventory). Ambos syncs son silenciosos.
- `POST /api/qb/sync-products` — QBO Items → MySQL (requiere admin)
- `POST /api/auth/login` — devuelve `{ token }`

Ver documentación completa en `README.md`.

---

## Página de Pedidos (`/orders`)

### Interfaces

```typescript
// app/orders/page.tsx
interface OrderRow {
  id, barcode, product_name, price, quantity, total,
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED',
  batch_id, qb_invoice_id,
  customer_id, customer_name,
  signature: string | null,   // base64 PNG — firma del cliente
  user_id, user_email, user_name, created_at
}

// app/orders/_components/OrdersClient.tsx
interface Batch {
  batchId, orders, customerName, userEmail, userName,
  total, status, createdAt, invoiceId,
  signature: string | null    // tomada de orders[0].signature
}
```

### groupBatches

Agrupa `OrderRow[]` por `batch_id` (fallback `_${id}`). La firma se toma del primer item del grupo — todos los items de un batch comparten la misma firma.

### Firma en el modal Ticket

Si `ticketBatch.signature !== null`, se renderiza después del total:

```tsx
<img src={`data:image/png;base64,${ticketBatch.signature}`}
     alt="Firma del cliente"
     className="mx-auto max-h-24 rounded border border-slate-200 bg-white" />
```

### Badge en tabla

Los batches con firma muestran chip `✎ firma` (azul) junto al ID del pedido.

### API usada

| Endpoint | Cuándo |
|---|---|
| `GET /api/orders?limit=200` | Carga inicial (server component) |
| `GET /api/orders/export?status=...` | Exportar CSV |
| `POST /api/orders/:id/sync` | Forzar sync (solo admin) |
| `GET /api/settings` | Info empresa para modal ticket |

`listOrders` usa `SELECT o.*` → `signature` se incluye automáticamente sin cambios extra en el backend.
