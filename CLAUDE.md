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
| SKU | `sku` | Al guardar → sync `Sku` a QBO — ver "SKU vs Código de barras" abajo |
| Código de barras | `barcode` | Puramente interno (escaneo TC22), **nunca** sincroniza con QBO |
| Categoría | `category` | |
| Stock | `stock` | Al guardar → sync `QtyOnHand` a QBO (solo ítems Inventory) |

**Vaciar un campo (SKU, Código de barras, Precio mínimo, Unit, Peso/lb):** `handleSubmit` manda estos campos siempre en el body (`valor.trim() || null` / `valor || null`), nunca los omite — antes, si dejabas el input vacío y guardabas, la key ni viajaba en el `PUT` y el backend (que solo actualiza columnas presentes con `!== undefined`) dejaba el valor viejo intacto en MySQL. Bug corregido a nivel frontend únicamente, el backend ya manejaba `null` bien.

### SKU vs Código de barras (Fase 105, backend `excellentia/CLAUDE.md`)

Hasta la Fase 105, el campo "Código de barras" del modal hacía las dos cosas a la
vez: identificaba el producto físico (escaneo TC22) Y era lo que se sincronizaba
como `Sku` en QBO. Se separaron porque el objeto `Item` de la API de QBO **no
tiene un campo de barcode nativo** — solo expone `Sku` — así que forzar el
barcode físico ahí siempre iba a quedar atado a ese único campo. Ahora:

- **SKU** (campo nuevo) es la contraparte real de `Item.Sku` en QBO — es lo que
  sincroniza al guardar.
- **Código de barras** quedó puramente interno — nunca viaja hacia ni desde QBO,
  solo lo usa la app Android para escanear.

Migración de datos: `sku` se hizo backfill una sola vez copiando el `barcode`
que ya existía (esos valores eran, de hecho, el SKU histórico de QBO). Un mismo
producto puede mostrar el mismo valor en ambos campos hoy — es esperable, no un
bug — hasta que se les asigne la nomenclatura nueva (ver más abajo).

### Migración a la nomenclatura NEW_SKU (agosto 2026)

Se generó un master sheet comparando el export de productos de QBO
(`ProductServiceList__QBO.xls`) contra la lista de precios PDF de Excellentia,
para detectar qué productos faltaban de un lado u otro y asignarles un SKU nuevo
con formato `MARCA + secuencia de 3 dígitos` (ej. `REY001` = Reynaldo's, primer
producto; `TIO014` = Tío Francisco). La migración se aplicó vía un endpoint
admin-only en el backend (`POST /api/products/migrate-sku`, paginado y con
dry-run — detalle completo en `excellentia/CLAUDE.md`), **no** desde la webapp —
no hay botón para esto acá, fue una operación de una sola vez. Cerrada en agosto
de 2026 (Fase 107 backend): la re-corrida final corrigió las asignaciones que un
defecto de barcodes duplicados del master sheet había pisado, y los items Service
quedaron ocultos con `hidden=1`.

### Validaciones del modal

- Nombre: mínimo 2 caracteres (inline, borde rojo)
- Precio: mayor a 0 (inline)
- Stock: no negativo **solo si el valor cambió** respecto al producto cargado (inline) — un stock negativo ya existente en la DB es estado real del producto (sobre-venta/ajuste), no un typo; bloquearlo impedía editar cualquier otro campo (ej. SKU) de esos productos
- Peso: no negativo si se ingresa (inline)

Nota: el input de stock no tiene `min="0"` a propósito — la validación nativa del navegador (el form no usa `noValidate`) bloquearía el submit antes de llegar al handler de React con el mismo falso positivo.

### Columnas visibles en la tabla (read-only)

Nombre + descripción (gris, truncada) · Precio/lb · SKU · Barcode · Precio min · Peso · Stock (rojo=0, ámbar≤5, normal) · QB badge · Botón editar (admin)

### QB badge — 3 estados

`qb_active` (`TINYINT(1) NULL`, sincronizado desde QBO — no editable en el modal) distingue si el item está *inactivo dentro de QuickBooks mismo*, algo distinto de si está vinculado o no (`qb_item_id`):

| Estado | Badge | Condición |
|---|---|---|
| Sin vincular | gris "—" | `qb_item_id` es `null` |
| Vinculado, inactivo en QBO | rojo "QB inactivo" | `qb_item_id` existe y `qb_active === 0` |
| Vinculado, activo | verde "QB" | `qb_item_id` existe y `qb_active` es `1` o `null` (nunca sincronizado desde que existe el campo — no se asume inactivo) |

Mismo criterio en `ProductModal.tsx` (caja de estado arriba del formulario). `qb_active` se llena en el sync desde QBO — la consulta a QBO (`Active IN (true, false)`) trae también items inactivos, que por defecto QBO excluye.

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
- `PUT /api/products/:id` — actualiza campos; si `name`/`description`/`sku` cambian → `updateItemMeta` a QBO (`barcode` nunca dispara sync, es puramente interno); si `stock` cambia → `updateItemQtyOnHand` a QBO (solo Inventory). Ambos syncs son silenciosos.
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

### Términos y condiciones en el modal Ticket (QR)

El pie del ticket ya no imprime el párrafo legal completo — replica el formato del ticket físico actual (`PrintService.kt` en la app Android, `AndroidStudioProjects/test`): "Términos y Condiciones:" / "Escanear para ver" + imagen QR + la URL en texto debajo (`https://excellentiafoods.com/terms-and-conditions/`, página estática del sitio `excellentiafoods-landing`, no dinámica). El QR es el mismo PNG estático que usa la app (`public/disclaimer-qr.png`, copiado de `res/drawable-nodpi/disclaimer_qr.png`), no se genera en runtime.

**El campo `disclaimer` de `/settings` quedó huérfano** — ya no lo lee ni el ticket (webapp ni físico) ni la página pública de términos (estática, sin fetch a la API). Sigue editable en la UI de Settings sin motivo real; no se tocó, pendiente decidir si se remueve.

Claves i18n nuevas: `tkt_terms`/`tkt_scanToView` (`es`/`en`, `app/lib/i18n.ts`).

### Créditos por daño (Fase 75)

`DamageItem` (interfaz local en `OrdersClient.tsx`) gana `unit_price?`/`amount?`, poblados por `GET /api/orders/damage/:batchId` (columnas nuevas en `batch_damage`). En el modal de ticket, si `creditsTotal = Σ (amount ?? qty*unit_price) > 0`, el bloque de Total pasa de una sola línea a `Subtotal` / `Créditos` (`t('tkt_credits')`) / `Total` (`ticketBatch.total - creditsTotal`) — sin crédito, se ve exactamente igual que antes. Los chips de "Negative Sale" en la fila expandible también muestran el monto. Claves i18n `tkt_subtotal`/`tkt_credits` agregadas en `es`/`en` — ver `app/lib/i18n.ts`.

**Cantidad dañada por peso real en Lbs (posterior a la Fase 75)** — `DamageItem` gana `unit?: string | null` (también devuelto ahora por `GET /api/orders/damage/:batchId`). `qty` para un producto Lbs pasó a ser el peso real dañado (antes, un conteo de piezas); helpers locales `isLbsUnit()`/`formatDamageQty()` en `OrdersClient.tsx` deciden si mostrar `"2.35 lb"` o `"N unit(s)"` — usados en el modal de ticket y en el chip de la fila expandible, reemplazando el `{d.qty} unit(s)` fijo de antes. Mismo criterio espejado en el backend (`creditCalculator.ts`) y en la app Android (`data/Models.kt`). Detalle completo del cambio en `excellentia/CLAUDE.md`.

**Gotcha — `DECIMAL` vía `mysql2` no es `number` en JSON, mismo patrón que `TINYINT(1)`/`qb_active`.** `batch_damage.qty` pasó de `INT` a `DECIMAL(10,2)` para soportar el peso real — `mysql2` devuelve columnas `DECIMAL` como **string** (`"2.35"`, no `2.35`) sin `decimalNumbers` configurado en `db/connection.ts` del backend. El tipo TS `qty: number` en `DamageItem` es solo una anotación de compilación, no protege en runtime: `formatDamageQty()` hacía `qty.toFixed(2)` directo y reventaba el render completo de la página (`qty.toFixed is not a function`) apenas se expandía una orden con daño. Fix: `Number(qty) || 0` antes de formatear. Aplicar el mismo cast a cualquier otro campo `DECIMAL` leído crudo de una fila de MySQL que se use con métodos de `number` (no solo en operadores aritméticos/relacionales, esos sí coaccionan solos).

### API usada

| Endpoint | Cuándo |
|---|---|
| `GET /api/orders?limit=200` | Carga inicial (server component) |
| `GET /api/orders/export?status=...` | Exportar CSV |
| `POST /api/orders/:id/sync` | Forzar sync (solo admin) |
| `GET /api/settings` | Info empresa para modal ticket |

`listOrders` usa `SELECT o.*` → `signature` se incluye automáticamente sin cambios extra en el backend.

## Settings — Numeración de facturas (invoice_counter)

Card "Invoice numbering" en `app/settings/_components/SettingsClient.tsx`, visible solo si `getUserInfo().role === 'admin'` (la página en sí no está protegida por rol del lado del cliente — ver nota abajo). Muestra el `invoice_counter` actual (próximo `DocNumber` a asignar en QBO) y permite subirlo con un input + botón, con un modal de confirmación (`InvoiceCounterConfirmModal`, mismo patrón visual que `DeleteModal` de `UsersClient.tsx`) antes de aplicar el cambio — `PUT /api/settings/invoice-counter` (backend valida `next > current`, nunca deja bajar el número). Detalle completo del endpoint en `excellentia/CLAUDE.md`.

**Nota:** `GET /api/settings` no tiene `adminOnly` en el backend — un operador que navegue directo a `/settings` puede ver la página (el link está oculto en el sidebar, pero la ruta no redirige como sí hace `/dashboard`). No es parte de este cambio, pero la card de facturación se oculta explícitamente con el chequeo de rol en cliente por las dudas; el `PUT` en sí ya está protegido por `adminOnly` en el backend.

---

## Pendientes / a considerar

- **Aviso de fallo de sync a QBO en `ProductModal.tsx`** — hoy el `PUT /api/products/:id` responde éxito siempre, aunque el push a QBO (`updateItemMeta`/`updateItemQtyOnHand`) haya fallado silenciosamente. El backend va a devolver si ese sync realmente se confirmó contra QBO (parte del fix del bug donde el sync automático de 5 min revertía precios editados recientemente — ver `excellentia/CLAUDE.md`). Falta que el modal lea ese campo y muestre un aviso en vez de cerrar como si todo hubiera salido bien.
- **Campo `disclaimer` de Settings sin uso real** — ver nota en "Términos y condiciones en el modal Ticket (QR)" más arriba. Decidir si se saca del formulario de Settings o se deja.
- **`/settings` no redirige a un operador** que entre por URL directa (a diferencia de `/dashboard`, que sí hace `window.location.href = '/orders'` si `role !== 'admin'`) — el backend GET tampoco tiene `adminOnly`. No es grave (solo lee nombre/dirección de la empresa) pero es inconsistente con el resto de páginas admin-only.
