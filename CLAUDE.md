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
| `GET /api/orders?limit=200` | Carga inicial, `useEffect` en `page.tsx` (**no** es server component — ver fix abajo) |
| `GET /api/orders/export?status=...` | Exportar CSV |
| `POST /api/orders/:id/sync` | Forzar sync (solo admin) |
| `GET /api/settings` | Info empresa para modal ticket |

`listOrders` usa `SELECT o.*` → `signature` se incluye automáticamente sin cambios extra en el backend.

### Fix (2026-09-02): botón "Retry" no refrescaba la UI sola

`app/orders/page.tsx` es `'use client'` — trae las órdenes en un `useEffect`
con `[]` de dependencias, **no** con fetch de servidor. Los handlers de
reintentar/reconciliar/aprobar en `OrdersClient.tsx`, y el botón manual
"Refresh", llamaban a `router.refresh()` (`next/navigation`) — que solo
vuelve a ejecutar componentes/data de **servidor**, así que sobre este
patrón es un no-op silencioso: el backend confirmaba bien, pero nada
disparaba de nuevo el fetch, había que F5 para ver el cambio de estado.
Mismo cuidado aplica a cualquier otra pantalla `'use client'` que traiga su
data por `useEffect` en vez de un server component — `router.refresh()` no
sirve ahí, hace falta guardar y volver a llamar la función de fetch.

**Fix:** `page.tsx` expone `fetchOrders()` como función nombrada (no inline
en el `useEffect`) y la pasa a `OrdersClient` como prop `onRefresh`. Las 4
llamadas a `router.refresh()` en `OrdersClient.tsx` se reemplazaron por
`onRefresh()`; se sacó el import de `useRouter`, sin otro uso en el archivo.

### Cancelar / Editar venta AWAITING_APPROVAL (Fase 117) — backend existe, sin UI acá a propósito

`POST /api/orders/batch/:batchId/cancel` y `/edit` (detalle completo en
`excellentia/CLAUDE.md` y `excellentia/PROGRESS.md`) están implementados en
el backend, pero **decisión explícita del usuario (2026-09-04): esta acción
no se expone en la webapp.** Cancelar/editar una venta `AWAITING_APPROVAL`
es algo que solo puede hacer un admin o el operador dueño del batch, y solo
**desde la app Android** (`AndroidStudioProjects/test` —
`TicketDetailActivity`/`EditBatchActivity` nuevas, ver `CLAUDE.md` de ese
repo). Se llegó a implementar una primera versión acá (`OrdersClient.tsx`)
y se revirtió sin llegar a deployarse — no hay rastro en el código actual,
queda esta nota para no repetir el intento sin querer.

## Settings — Numeración de facturas (invoice_counter)

Card "Invoice numbering" en `app/settings/_components/SettingsClient.tsx`, visible solo si `getUserInfo().role === 'admin'` (la página en sí no está protegida por rol del lado del cliente — ver nota abajo). Muestra el `invoice_counter` actual (próximo `DocNumber` a asignar en QBO) y permite subirlo con un input + botón, con un modal de confirmación (`InvoiceCounterConfirmModal`, mismo patrón visual que `DeleteModal` de `UsersClient.tsx`) antes de aplicar el cambio — `PUT /api/settings/invoice-counter` (backend valida `next > current`, nunca deja bajar el número). Detalle completo del endpoint en `excellentia/CLAUDE.md`.

**Nota:** `GET /api/settings` no tiene `adminOnly` en el backend — un operador que navegue directo a `/settings` puede ver la página (el link está oculto en el sidebar, pero la ruta no redirige como sí hace `/dashboard`). No es parte de este cambio, pero la card de facturación se oculta explícitamente con el chequeo de rol en cliente por las dudas; el `PUT` en sí ya está protegido por `adminOnly` en el backend.

---

## Variables de entorno — `.env` vs `.env.development` (no usar `.env.local`)

**`.env.local` tiene más prioridad que `.env` en Next.js, y se carga tanto en
`next dev` como en `next build`** — si existe con la URL de desarrollo
(`http://localhost:3000`), un build de producción corrido en la misma máquina
la va a usar en vez de la de `.env`, sin ningún aviso. Como el deploy acá es
manual (`npm run build` local → comprimir `out/` → subir a cPanel, no hay CI),
ese build roto queda grabado adentro de los archivos estáticos — cualquier
usuario real ve "Could not connect to the server" porque su navegador intenta
pegarle a `localhost:3000`, que no existe fuera de la compu del desarrollador.

Pasó exactamente eso el 2026-08-31. **Fix:** se renombró `.env.local` →
`.env.development` — Next.js solo lo carga cuando `NODE_ENV=development`
(`next dev`), nunca en `next build` (`NODE_ENV=production`), así que un
build de producción siempre cae a `.env` (`NEXT_PUBLIC_API_URL=https://app.excellentiafoods.com`)
sin depender de acordarse de borrar nada antes de generar el build. **No
volver a crear un `.env.local` en este repo** — usar `.env.development` para
cualquier override de desarrollo.

## Página Almacén (`/warehouse`), Sub-inventario (`/warehouse/inventory`)

Nunca documentada acá pese a existir desde la Fase 111 del backend (ver
`excellentia/CLAUDE.md` → "Módulo Almacén — rutas, recepción, FIFO,
sub-inventario y liquidación") — se cierra ese gap de paso, junto con lo
agregado el 2026-08-31 y lo de la Fase 114 (2026-09-02, ver
`excellentia/CLAUDE.md` → "Módulo Almacén — revisión de devoluciones 2.0,
Sub-inventario, backfill y sync instantáneo a QBO (Fase 114)" para el
detalle completo de backend/Android).

### `/warehouse` — rutas de entrega

`app/warehouse/page.tsx` hace el fetch inicial de `GET /api/routes` y
redirige a `/orders` si `role === 'operator'` — admin y almacenista comparten
la página. `WarehouseClient.tsx`:
- Lista de rutas con badge de estado (`STATUS_BADGE`) y filtro por fecha.
- Fila expandible: paradas (`stops`), manifiesto cargado (`items`) y
  **Devoluciones** (agregado 2026-08-31, ver abajo).
- Cambiar estado / cancelar / editar ruta — `nextStatusOptions()` espeja
  `canTransitionStatus()` del backend solo para decidir qué mostrar en el
  `<select>` (UX); el backend es quien realmente lo hace cumplir.
- `RouteModal.tsx` (crear/editar), `StopPickerModal.tsx` (agregar parada),
  `ConfirmModal.tsx` — genérico (title/body/confirming/onConfirm/onCancel).
- **Confirmación de salida por ítem (Fase 114):** cada línea del manifiesto
  cargado muestra "Cargado el [fecha] · por [nombre] — confirmado en buen
  estado" (`item.created_at`/`item.loaded_by_name`, expuestos por `getRoute`
  vía join a `users`). No hizo falta ningún paso nuevo — solo se puede cargar
  stock de lotes `ACTIVE`, así que la carga misma ya prueba que salió bien.

**Sección "Devoluciones" (2026-08-31, condición por línea desde la Fase 114):**
al expandir una ruta, trae `GET /api/routes/:id/returns` aparte
(`GET /api/routes/:id` no lo incluye). Tres estados, no dos:
1. `detail.returns_reviewed_at` es `null` → aviso amarillo "Devoluciones sin
   revisar" — el almacén todavía no pasó por Android a confirmar esta ruta.
2. Revisado pero `returns` vacío → "Sin devoluciones registradas todavía" —
   se vendió todo, y eso está bien.
3. Revisado con líneas → lista real, badge de condición por color
   (`RETURN_CONDITION_BADGE`: Buena=verde, Dañada=roja, Vencida=ámbar). Desde
   la Fase 114 un mismo producto puede aparecer en **más de una línea** (ej.
   3 Buena + 2 Dañada) — la webapp no necesitó ningún cambio para esto, ya
   renderizaba `returns.map(r => ...)` con `key={r.id}` (no por producto), así
   que varias líneas del mismo producto ya se veían bien.

Antes de que `routes` ganara la columna `returns_reviewed_at` (backend), los
casos 1 y 2 eran indistinguibles — los dos se veían como lista vacía, y no
había forma de que el admin supiera si de verdad no había nada o si
simplemente nadie lo revisó todavía. El mismo flag también pinta un **badge
en la fila colapsada** de la lista (rutas `COMPLETED` sin revisar), para no
tener que expandir cada una para notarlo.

### `/warehouse/settlement` — Liquidación diaria (admin-only, 2026-08-31 → **removida en la Fase 114**, 2026-09-02)

> **Removida.** El usuario decidió sacar la Liquidación diaria por completo
> una vez que el resto de los cambios de la Fase 114 (Sub-inventario con
> visibilidad total del historial, revisión de devoluciones más precisa) le
> quitaron sentido al paso manual de "confirmar" — QBO ahora se sincroniza
> al toque en cada movimiento (`recordMovement()`, backend). Se borró
> `app/warehouse/settlement/` entero (`page.tsx` + `SettlementClient.tsx`),
> el botón "Liquidación" del header de `/warehouse`, y las claves i18n
> `wst_*` (se conservó solo `wst_backToWarehouse`, renombrada a
> `wh_backToWarehouse` porque la reusa `/warehouse/inventory`, ver abajo).
> Se deja el resto de esta sección como registro histórico de por qué se
> había diseñado así.

Diseño completo del backend (`preview`/`confirm`, por qué se difiere solo el
push a QBO y no el registro local) en `excellentia/CLAUDE.md` → "Módulo
Almacén". Acá el resumen del lado webapp:

- **Por qué es admin-only:** decisión explícita del usuario, reconsiderada
  el mismo día — el almacenista arma/carga rutas y revisa devoluciones desde
  Android, pero el cierre a QBO es tarea del admin, que primero revisa lo
  que pasó en cada ruta. La pantalla había arrancado como `SettlementActivity`
  en Android y se **eliminó de ahí por completo** (no quedó como fallback)
  al mover el flujo acá.
- `app/warehouse/settlement/page.tsx` — gate `role !== 'admin'` → redirect a
  `/warehouse`, mismo criterio que `/dashboard`. El backend también gatea
  con `adminOnly` (antes `warehouseOnly` = admin+almacenista) — protegido en
  las dos puntas, no solo ocultando el link.
- `SettlementClient.tsx` — "Generar liquidación de hoy" (`POST
  .../settlements/preview`, solo arma el borrador, **no** toca QBO) → lista
  de líneas (producto, neto, stock antes→después) → "Confirmar liquidación"
  (`POST .../settlements/:id/confirm`, ahí sí empuja `QtyOnHand`) detrás de
  `ConfirmModal` — el modal anti-miss-click que pidió el usuario.
- El aviso "sync failed" en una línea solo se pinta si el settlement ya está
  `CONFIRMED` de verdad (`isConfirmed && !line.qbo_synced`) — un `DRAFT`
  recién generado trae `qbo_synced=0` por default en toda línea sin que
  nada haya fallado. Mismo bug encontrado y corregido primero en la versión
  Android de esta pantalla, antes de que existiera acá (ver
  `excellentia/PROGRESS.md`, Fix "sync failed").
- **Banner de advertencia** (no bloqueante) si hay rutas `COMPLETED` con
  `returns_reviewed_at` nulo — se evaluó bloquear directamente la
  liquidación en ese caso y se descartó a propósito: sin la marca explícita
  de revisión no hay forma de que el bloqueo sea preciso (antes, "cero
  devoluciones" no distinguía "no revisado" de "revisado, nada volvió"), y
  aun teniéndola el admin puede tener una razón válida para liquidar antes.
- Acceso: botón "Liquidación" en el header de `/warehouse`, condicionado a
  `getUserInfo()?.role === 'admin'`.

Claves i18n de esa etapa: `wh_returns`/`wh_noReturns`/`wh_returnCondition_*`/
`wh_returnsNotReviewed` en `app/lib/i18n.ts` (es/en) — siguen vigentes.
`wh_settlementNav` y toda la sección `wst_*` (salvo `wst_backToWarehouse`,
renombrada) se eliminaron junto con la pantalla en la Fase 114.

### `/warehouse/inventory` — Sub-inventario (nueva, Fase 114, 2026-09-02)

La webapp no tenía ningún equivalente al Sub-inventario de Android
(`InventoryMovementsActivity`) — un admin no podía ver stock disponible ni
movimientos sin abrir la app. Página nueva, mismos endpoints que ya
consumía Android (`GET /api/warehouse/lots`, `GET /api/warehouse/movements`,
gateados por `warehouseOnly` — no hizo falta ningún endpoint nuevo para
esto).

- `app/warehouse/inventory/page.tsx` — mismo patrón que `app/warehouse/page.tsx`
  (`'use client'`, redirect a `/orders` si `role === 'operator'`).
- `InventoryClient.tsx` — dos pestañas con chips, mismo criterio que Android:
  - **Available** — lotes `ACTIVE` agrupados por producto en memoria (`useMemo`),
    badge con el total, detalle por lote con vencimiento (orden FIFO: sin
    fecha al final). Sección admin-only arriba de todo para el **backfill**
    (ver `excellentia/CLAUDE.md` → Fase 114, punto 5) — preview → confirmar,
    mismo `POST /api/warehouse/lots/backfill`.
  - **History** — filtro de fecha (`<input type="date">`, mismo patrón que
    ya usaba `WarehouseClient.tsx`) + chips de tipo de movimiento, agrupado
    por día (`dt_today`/`dt_yesterday`, claves i18n ya existentes, reusadas
    en vez de crear unas nuevas). Badge "Available" cruzado contra los lotes
    con stock real (mismo `lot_id` que sigue teniendo `remaining_qty > 0`).
- `MOVEMENT_BADGE` — color por tipo de movimiento, mismo criterio que
  Android (`InventoryMovementsActivity.movementTypeStyle`): verde = entra
  stock (`RECEIPT`/`RETURN`), índigo = sale de forma normal (`ROUTE_LOAD`),
  rojo = `DAMAGE`, ámbar = `ADJUSTMENT`. El índigo no tenía token propio —
  se agregó `--ec-info`/`--ec-info-bg` en `globals.css`, junto a los otros
  semánticos (`--ec-success*`/`--ec-warn*`/`--ec-danger*`).
- Acceso: botón "Sub-inventario" en el header de `/warehouse`, **sin**
  gate de admin (a diferencia de lo que era Liquidación) — el almacenista
  también lo necesita, mismo rol (`warehouseOnly`) que ya exige el backend.

`npx next build` (incluye chequeo de TypeScript) verificado limpio.

---

## Pendientes / a considerar

- **Aviso de fallo de sync a QBO en `ProductModal.tsx`** — hoy el `PUT /api/products/:id` responde éxito siempre, aunque el push a QBO (`updateItemMeta`/`updateItemQtyOnHand`) haya fallado silenciosamente. El backend va a devolver si ese sync realmente se confirmó contra QBO (parte del fix del bug donde el sync automático de 5 min revertía precios editados recientemente — ver `excellentia/CLAUDE.md`). Falta que el modal lea ese campo y muestre un aviso en vez de cerrar como si todo hubiera salido bien.
- **Campo `disclaimer` de Settings sin uso real** — ver nota en "Términos y condiciones en el modal Ticket (QR)" más arriba. Decidir si se saca del formulario de Settings o se deja.
- **`/settings` no redirige a un operador** que entre por URL directa (a diferencia de `/dashboard`, que sí hace `window.location.href = '/orders'` si `role !== 'admin'`) — el backend GET tampoco tiene `adminOnly`. No es grave (solo lee nombre/dirección de la empresa) pero es inconsistente con el resto de páginas admin-only.
- **Falta el desglose "Vendido" por producto en `/warehouse`** — el admin ve cuánto se cargó y cuánto volvió por producto (sección Devoluciones), pero no cuánto se vendió de cada uno; ese dato ya lo calcula el backend (`GET /api/routes/:id/returns/expected`, el mismo endpoint que usa `RouteReturnsActivity` en Android) pero la webapp todavía no lo consume. Preguntado por el usuario el 2026-08-31, ofrecido pero no implementado todavía.
