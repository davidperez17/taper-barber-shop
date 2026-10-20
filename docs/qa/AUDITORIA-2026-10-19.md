# Auditoría QA — 2026-10-19

Rama: `qa` (desde `main@a9d9132`). Auditoría de solo lectura en 4 frentes: app cliente, admin operativo, admin gestión, seguridad DB/RLS.
Baseline: `tsc` y `eslint` limpios.

Zona horaria del proyecto: `America/Guatemala` (UTC-6, sin DST), prefijo `+502`, moneda Q.

Estado: ⬜ pendiente · 🔧 en progreso · ✅ resuelto · ⏸ decisión pendiente

---

## Crítico

| ID | Estado | Área | Hallazgo | Dónde | Fix |
|---|---|---|---|---|---|
| C1 | ✅ | Cliente/SW | SW cachea cache-first todo GET same-origin no-navegación, incluidas respuestas RSC (`?_rsc=`) y errores. Datos viejos; en un mismo teléfono B puede ver nombre/sellos/**QR de A** tras logout. | `app/sw.js/route.ts:76-89` | Cachear solo `/_next/static/`, fuentes, imágenes; excluir header `RSC`/`_rsc`; no guardar `!resp.ok` |
| C2 | ✅ | Cliente/DB | Toma de cuenta sin PIN: clientes dados de alta en mostrador (o con PIN reseteado) tienen `pin_hash` nulo; cualquiera con el teléfono fija PIN en `/ingresar` y obtiene la sesión/QR. `cliente_login_estado` (anon) enumera cuentas `necesita_pin`. | `0007_cliente_pin.sql:19-34,83-113`, `app/(cliente)/actions.ts:98-114`, `app/admin/actions.ts:202-236` | Staff fija PIN inicial en alta, o código de activación de un solo uso; rate limit |
| C3 | ✅ | POS/DB | `record_venta` confía en `precio`/`cantidad` del cliente: precio 0 × cantidad 12 = 2 cortes gratis; cantidad negativa = totales negativos; `p_sucursal_id` sin validar. | `0032_canje_horario.sql:94-96,113-142` | Precio desde catálogo (activo, misma sucursal); cantidad 1..N; forzar sucursal del staff no admin |
| C4 | ✅ | POS | `await recordVenta()` sin try/catch: si la red falla la action lanza → spinner infinito, venta no encolada; reintento manual duplica venta (sin idempotencia). | `components/admin/VentaPOS.tsx:203` | try/catch → encolar; `client_id` UUID por venta + UNIQUE en `ventas` |
| C5 | ✅ | Reportes/DB | `reporte_ventas` y `dashboard_metrics` usan `created_at::date` / `current_date` (UTC). Ventas ≥18:00 GT caen al día siguiente; no cuadra con Caja ni reporte de clientes. | `0017_reportes_sucursal.sql:22,30-31,146-149` | Migración con `(created_at at time zone 'America/Guatemala')::date` |

## Alto

| ID | Estado | Área | Hallazgo | Dónde | Fix |
|---|---|---|---|---|---|
| A1 | ✅ | DB/RLS | Policies `ventas_insert`, `ventas_update`, `venta_items_insert` (todo staff) nunca se borraron: cajero puede insertar ventas/ítems por PostgREST y fabricar sellos. | `0001_init.sql:276-278` | `drop policy` (RPCs ya son definer) |
| A2 | ✅ | DB/RLS | Staff lee/edita `qr_token`, `pin_hash` de clientes → suplantación en PWA, reset de PIN sin ser admin. `ClienteFicha` recibe `qr_token` en payload RSC. | `0001_init.sql:268,282`, `lib/queries/clientes.ts:39` | Revoke por columna a `authenticated`; no enviar token al cliente |
| A3 | ✅ | DB | Vista `cliente_loyalty` sin `security_invoker` → salta RLS; probablemente legible con anon key. **Verificar con curl.** | `0031_canje_cuenta_en_vista.sql:26-75` | `security_invoker = on` o `revoke ... from anon` |
| A4 | ✅ | Caja/DB | RPCs `caja_*` aceptan cualquier sucursal y fecha (cajero A ve/cierra caja de B, cierra fechas futuras, montos negativos). Overloads viejos de 0008 siguen vivos. | `0016_sucursal_ops.sql:165-308`, `0008_caja.sql` | Forzar sucursal del staff, fecha ≤ hoy GT, montos ≥0; drop overloads |
| A5 | ✅ | Datos | Teléfono sin normalizar: "5555 1234" ≠ "55551234" → duplicados, login falla, `wa.me` sin 502. | `0007` (trim), `app/admin/actions.ts:207,412`, `recuperacion/page.tsx:11-14` | Guardar solo dígitos; migrar datos; `waLink` con 502 |
| A6 | ✅ | Offline POS | Cola offline sin lock: dos pestañas/reconexión reenvían todo; `setQueue(pendientes)` pisa ventas encoladas durante el sync. Usa sucursal/fecha del momento del sync. | `components/admin/OfflineSync.tsx:28-47`, `actions.ts:125` | Idempotencia (C4) + `navigator.locks`; guardar contexto en payload |
| A7 | ✅ | Escáner | Tras "QR no reconocido" el loop `tick` no se reprograma → escáner congelado. | `components/admin/QrScanner.tsx:101-106` | Re-programar `requestAnimationFrame(tick)` con espera |
| A8 | ✅ | Ventas | Anular venta no repone stock ni baja `cupones.usos`; permite anular/editar días con caja cerrada. | `0026_admin_editar_cliente.sql:92-127` | Reponer stock, `usos-1`, rechazar si hay cierre |
| A9 | ✅ | Caja | Se puede vender con caja cerrada; el efectivo no entra en ningún arqueo. | `0032`, `CajaCierre.tsx:69` | Bloquear o mostrar "ventas posteriores al cierre" |
| A10 | ✅ | Montos | `formatQ` redondea a entero: cupón 15% sobre Q85 muestra Q72 (real Q72.25); diferencia de caja "+Q0"/"Q-0". | `lib/format.ts:58` | 2 decimales si no es entero; comparar con `Math.abs(d) < 0.005` |
| A11 | ✅ | Catálogo | Precio "150,00" se guarda Q0 sin error. | `CatalogoManager.tsx:210,286`, `actions.ts:500,537` | Aceptar coma o rechazar NaN; servidor exige `> 0` |
| A12 | ✅ | Push/cron | Si push falla (≠404/410) el cron no registra log pero sí inserta en bandeja → "Te extrañamos" cada 15 min. | `lib/push/eventos.ts:86`, `app/api/cron/notificaciones/route.ts:175-179` | Log siempre que se intente; registrar en bandeja una vez |
| A13 | ✅ | Inventario | Con stock negativo no se puede registrar una entrada parcial. | `0016_sucursal_ops.sql:147` | Validar `< 0` solo en `salida` |
| A14 | ✅ | Sucursales | Sucursal desactivada sigue operando para su cajero/barbero. | `lib/sucursal.ts:21-23` | Devolver null si inactiva |
| A15 | ✅ | App | No existe ningún `error.tsx`/`global-error.tsx`: cualquier fallo de Supabase = "Application error". `/admin/agenda?d=2026-13-01` → 500. | `app/` | `error.tsx` en `(cliente)/(shell)` y `admin/(panel)`; validar fecha real |
| A16 | ✅ | Cliente | QR no disponible sin red (SW no guarda HTML); `/offline` sin "Reintentar". | `app/sw.js/route.ts`, `app/offline/page.tsx` | Guardar QR en localStorage por cliente; botón reintentar |
| A17 | ✅ | Login cliente | `login_cliente` sin `FOR UPDATE` (ráfagas superan 5 intentos); bloqueo de cuentas ajenas; `registerCliente` sin rate limit ni largo máx. de nombre (spam push a staff). | `0007:117-158`, `actions.ts:16-61`, `lib/push/eventos.ts:101-111` | `for update`, rate limit por IP, nombre ≤60 |

## Medio

| ID | Estado | Hallazgo | Dónde |
|---|---|---|---|
| M1 | ✅ | Tras venta, Caja/Dashboard viejos hasta 30 s (`staleTimes.dynamic: 30`, sin `revalidatePath`) | `next.config.ts:9`, `recordVenta` |
| M2 | ✅ | Canje concurrente usa misma recompensa (lee vista sin lock) | `0032:82-89` |
| M3 | ✅ | Errores RPC de cupón/permiso mostrados como genérico "Intenta de nuevo" | `actions.ts:139-148` |
| M4 | ✅ | Cámara queda encendida si se sale antes de dar permiso | `QrScanner.tsx:57-58` |
| M5 | ✅ | Caja: "1,250" → 0; montos negativos | `CajaCierre.tsx:34-38,55-57` |
| M6 | ✅ | Token inválido (QR regenerado) → bucle `/ingresar` ↔ `/` (cookie no se borra) | `lib/queries/cliente.ts:27` |
| M7 | ✅ | Logout cliente no suelta suscripción push (B recibe avisos de A) | `app/(cliente)/actions.ts:116`, `PushSync.tsx:16` |
| M8 | ✅ | Registro borra campos al haber error (reset de form React 19) | `registro/page.tsx:27` |
| M9 | ✅ | Stats vs Tarjeta: cortes totales distintos; "1ra visita" usa fecha de registro | `stats/page.tsx:17,19` |
| M10 | ✅ | Celebración de nivel falsa (tier de sucursal "primaria"; `taper_tier_seen` no por cliente) | `0024`, localStorage |
| M11 | ✅ | `NotifyBell` ignora props nuevas; `cargarBandeja` sin try/catch | `NotifyBell.tsx:38,46` |
| M12 | ✅ | Cupón con usos "1O" → NaN → ilimitado | `actions.ts:639` |
| M13 | ✅ | Push staff llega a desactivados y tras logout | `lib/push/targets.ts:28-36`, `personal/actions.ts:107-120` |
| M14 | ✅ | Sucursales: límite 2 solo en app; DELETE en cascada borra facturación | `0015_sucursales.sql:41-48,63-65` |
| M15 | ✅ | Difusión sin confirmación; URL libre; tope 1000 filas PostgREST sin paginar | `DifusionForm.tsx:205`, `lib/push/inbox.ts:32`, `lib/queries/clientes.ts:20` |
| M16 | ✅ | Cambiar meta de lealtad recalcula hacia atrás sin confirmación | `CatalogoManager.tsx:386` |
| M17 | ✅ | Personal: activar/desactivar sin confirmación; desactivar/reset password no revoca sesión; `reset_cliente_pin`/`regenerar_qr_cliente` no chequean `activo` | `PersonalManager.tsx:116`, `personal/actions.ts:107-130`, `0007:168`, `0025:21` |
| M18 | ✅ | Sin headers de seguridad (clickjacking `/admin`, sin CSP/nosniff) | `next.config.ts` |
| M19 | ✅ | Citas: `updateEstadoCita`/`deleteCita` por id sin filtrar sucursal | `actions.ts:734-758` |

## Bajo (resumen)

- PinInput: borrar dígito intermedio corre los demás (`PinInput.tsx:36`).
- Error de PIN persiste tras "Cambiar número" (`ingresar/page.tsx:45,84`).
- `safe-area-inset` vale 0 (se quitó `viewport-fit=cover`) — verificar en iPhone.
- Dos celebraciones simultáneas (6º corte + nivel).
- Correo sin validar; nombre sin largo máximo.
- Realtime `cliente:<uuid>` público (escuchar/falsificar eventos).
- `borrarSuscripcion` sin auth; `guardarSuscripcion` sin allowlist de hosts push (SSRF menor).
- QR = credencial de sesión permanente (foto del QR = sesión).
- Permiso de giroscopio iOS al primer toque del QR.
- `ActualizarApp` borra caché de `/offline`.
- POS: barra muestra `+puntosCarrito` en vez de `puntosNetos` al canjear.
- `recordVenta` espera broadcast/push antes de responder (usar `after()`); push de stock bajo a todas las sucursales en cada venta.
- Búsqueda cruda en `.or()` (coma/paréntesis rompen); respuestas fuera de orden.
- Dashboard: `clientes_inactivos` sin filtro de sucursal; tops cuentan líneas, no cantidades.
- `cupon_descuento` declarada `immutable` usando `now()`.
- Horario de canje: JS 19:30:59 vs SQL 19:30:00.
- Cierre de caja concurrente → mensaje genérico; borrar movimiento sin confirmación.
- A11y: chips sin `aria-pressed`; `SucursalSwitcher` sin teclado; `useModalA11y` re-ejecuta por `onClose` inestable.
- `BarcodeDetector` sin `qr_code` nunca cae a jsQR.
- Agenda sin validación de traslape.
- Updates bloqueados por RLS reportan `ok: true` (0 filas).
- `deleteNota` sin confirmación; cualquier staff borra notas ajenas.
- "Invertido" solo suma últimas 50 ventas.
- Recuperación: "Nunca registró visita" nunca aparece (join excluye).
- "Solicitar ampliación" solo cambia estado local.
- CSV: `revokeObjectURL` inmediato (Safari), inyección de fórmula.
- Editar hora de cita no reinicia `recordatorio_enviado`.
- Login `next` pierde query string.
- Sin `REVOKE ... FROM PUBLIC` en funciones; cookie de puerta admin con valor fijo.
- Código muerto: `app-anterior/*.png`, `qr-taperbarbershop.png`, `plan.md`, `hoyGT` duplicado.

## Lote 1 (solo código) — notas

- **C1**: SW solo cachea `/_next/static/` + imágenes/fuentes con `resp.ok`; RSC/route handlers van directo a red.
- **C2**: alta en mostrador exige PIN de 6 dígitos (lote 1) + código de activación para cuentas sin PIN (0038, lote 2).
- **C4**: try/catch en lote 1; en lote 2 la venta se encola con `clientId` y `record_venta` (0034) es idempotente.
- **A7 + M4 + B10**: escáner se reanuda tras QR ajeno (pausa 1.5 s), apaga cámara si se sale durante el permiso, cae a jsQR si `BarcodeDetector` no soporta QR.
- **A10**: `fmtQ` muestra centavos cuando los hay; `mismoMonto()` para comparar diferencias.
- **A11 + M5 + M12**: `parseMonto()` acepta coma decimal y de miles; servidor rechaza NaN en precio/mín. compra; usos de cupón entero ≥1.
- **A15**: `error.tsx` en `(cliente)/(shell)` y `admin/(panel)`; `/offline` con "Reintentar"; agenda valida fecha real.
- **A16**: `/offline` muestra el QR guardado por la tarjeta + Reintentar.
- **M1**: `revalidatePath("/admin","layout")` tras venta; broadcast/push en `after()`.
- **M3**: errores de cupón inexistente y "No autorizado" con mensaje claro.
- **B1 POS**: barra muestra `puntosNetos`.
- Registro admin conserva campos tras error.

## Lote 2 (código + migraciones 0033–0039)

| Migración | Cubre |
|---|---|
| `0033_reportes_tz_gt` | C5 reportes/dashboard en hora GT; tops por unidades; inactivos por sucursal; borra overloads viejos sin `p_sucursal_id` (el consolidado "Todas" usaba la lógica vieja); `cupon_descuento` stable |
| `0034_record_venta_seguro` | C3 precio del catálogo, cantidad 1..50, recompensa única; sucursal forzada a cajero/barbero y activa; canje con advisory lock (M2); idempotencia `client_id` (C4/A6); `p_creado_en` para ventas offline |
| `0035_seguridad_rls` | A1 sin escritura directa de ventas; A2 grants por columna en `clientes` + `get_cliente_by_id`; A3 `cliente_loyalty` sin anon; M14 sucursales sin DELETE, FKs RESTRICT, límite del plan en DB; admin desactivado sin acceso |
| `0036_caja_y_anulaciones` | A4 caja por sucursal/fecha ≤ hoy/montos ≥ 0, borra overloads de 0008; A8 anular repone stock y cupón, bloqueo con caja cerrada; A13 entrada con stock negativo |
| `0037_telefono_y_login` | A5 teléfono normalizado (trigger + RPCs); A17 login `FOR UPDATE` + bloqueo escalonado (5 min → 15 → 1 h → 24 h); nombre ≤ 60 |
| `0038_pin_activacion` | C2 crear PIN exige código de activación de 6 dígitos (staff en la ficha), 30 min, un uso, 5 fallos lo invalidan |
| `0039_notificaciones_y_recuperacion` | índice único para avisos globales (Halloween doble); `clientes_inactivos` incluye a quien nunca volvió |

Validadas en PostgreSQL (PGlite) aplicando 0001→0039 + 56 pruebas funcionales (precio forzado, idempotencia, canje, cupón, anulación, caja, TZ, grants, PIN, etc.).

Todo el código nuevo tiene fallback si la migración aún no está aplicada (PGRST202 → firma vieja), así que el deploy del código puede ir primero.

## Deploy

1. Merge `qa` → `main` (Vercel despliega el código).
2. Confirmar que 0025–0032 estén aplicadas (0034 recrea `record_venta` sobre 0030–0032; 0035 asume 0026).
3. Aplicar en el SQL editor, en orden: 0033 → 0034 → 0035 → 0036 → 0037 → 0038 → 0039.
   - **0035 después del deploy del código** (el código viejo leía `qr_token` en la ficha).
   - **0037 aborta** si al normalizar teléfonos hay duplicados: lista los números; fusionar/corregir y re-aplicar.
4. Verificar: `select oid::regprocedure from pg_proc where proname = 'record_venta';` → 1 fila.
5. Tras 0038: clientes sin PIN necesitan código (ficha → "Código de activación").

## Pendiente (decisión o fuera de código)

- ~~QR = credencial permanente (foto del QR = sesión)~~ → rama `seguridad`, migración `0040_qr_rotativo.sql`: QR rotativo firmado (30 s), token de sesión que ya no se muestra y rotación de tokens viejos al abrir la app. `/offline` muestra el número de cliente.
- ~~Realtime `cliente:<uuid>` público~~ → rama `seguridad`: el canal es `cliente:<HMAC del id>` (lib/realtime.ts), solo lo conocen el servidor y la tarjeta del cliente. Canales privados de Supabase no aplican: exigen JWT de Supabase y la PWA cliente no lo tiene.
- Rate limit por IP (Upstash/Vercel) en login/registro: el bloqueo escalonado cubre fuerza bruta por cuenta, no enumeración masiva.
- ~~CSP: no se agregó~~ → rama `seguridad`: CSP con nonce por request (`lib/csp.ts`, `proxy.ts`), páginas dinámicas, reportes a `/api/csp` (logs de Vercel). `CSP_REPORT_ONLY=1` en Vercel la pasa a solo-reporte si algo se rompe. De paso: `/offline` mostraba vacío el número por un error de hidratación (#418); el bloque ya no lo maneja React.
- ~~`resetPasswordStaff` no revoca sesiones abiertas~~ → rama `seguridad`, migración `0041_sesiones_staff.sql`: cambiar contraseña o desactivar borra sus sesiones de `auth.sessions` y pone `staff.sesiones_desde`; `is_active_staff`/`is_owner_admin`/`is_owner` y `getStaff` rechazan sesiones iniciadas antes del corte. En la cuenta propia conserva la sesión actual.
- ~~Agenda sin validación de traslape por barbero~~ → rama `seguridad`, migración `0042_agenda_sin_traslapes.sql`: trigger que rechaza citas encimadas del mismo barbero (no canceladas, todas las sucursales) con mensaje listo para mostrar.
- `safe-area-inset` en iPhone: verificar en dispositivo.
- Permiso de giroscopio iOS al primer toque del QR.
- Archivos viejos en git (`app-anterior/`, `qr-taperbarbershop.png`, `plan.md`): decidir si se borran.
- Verificar en dashboard de Supabase que el signup de Auth esté desactivado y que la service-role key se rotó.

## Halloween

Apagado del 1-nov correcto en código. Riesgos: C1 puede servir banner cacheado; avisos quedan en bandeja; cron select→insert sin índice único (doble envío si se solapan). Limpieza post 1-nov: `lib/promo.ts`, `HalloweenPromo.tsx`, refs en `(shell)/layout.tsx`, `tarjeta/page.tsx`, `pushAvisosHalloween`, cron, CSS `hw-*`/`--halloween-*`.

## Verificaciones pendientes

- [ ] ¿Migraciones 0025–0032 aplicadas en prod?
- [ ] `curl $SUPABASE_URL/rest/v1/cliente_loyalty?select=*&limit=1 -H "apikey: $ANON"` → ¿devuelve filas? (A3)
- [ ] Signup de Supabase Auth desactivado en dashboard.
- [ ] Service-role key rotada (pasó por chat).

---

## Checklist de pruebas manuales

### Cliente
- [ ] Cache Storage: ¿hay URLs con `_rsc`? Venta en caja → ¿tarjeta se actualiza sin recarga?
- [ ] Dos cuentas en un teléfono: A logout → B entra → Stats → Tarjeta: ¿nombre/QR correctos? ¿push de A llega a B?
- [ ] Registrar "5555 1234", entrar con "55551234".
- [ ] Cliente dado de alta por staff: desde otro teléfono, ¿deja fijar PIN?
- [ ] Regenerar QR desde admin → abrir app → "Atrás" en `/ingresar`.
- [ ] Registro con PIN distinto / teléfono duplicado: ¿se borran campos?
- [ ] Modo avión con PWA: ¿QR? ¿reintentar?
- [ ] iPhone con barra de gestos: BottomNav/NotifSheet sobre el indicador.
- [ ] Push on/off en Perfil; tocar notificación con app cerrada/abierta.
- [ ] Cliente en 2 sucursales: cortes Tarjeta vs Stats; visitar B luego A → ¿celebración falsa?
- [ ] PIN: borrar dígito intermedio; pegar.
- [ ] Halloween: reloj al 31-oct y 1-nov GT.

### POS / Escanear / Registrar
- [ ] Cortar red al confirmar; WiFi sin internet: ¿spinner infinito, duplicado?
- [ ] Doble tap en Confirmar.
- [ ] Cupón % con centavos: total mostrado vs guardado.
- [ ] Cupón agotado por otro cajero entre validar y confirmar.
- [ ] Canje 19:30:30 y en sábado.
- [ ] Offline: 2 ventas encoladas + 2 pestañas al reconectar.
- [ ] QR ajeno → luego QR cliente (¿congelado?).
- [ ] Salir durante aviso de permiso de cámara (LED).
- [ ] iPhone Safari, PWA instalada, Android Chrome.

### Caja / Agenda / Dashboard
- [ ] Vender tras cierre de caja.
- [ ] Montos "1,250" y "150,50"; fondo negativo; diferencia de centavos.
- [ ] Volver a Caja <30 s tras venta.
- [ ] `/admin/agenda?d=2026-13-01`; buscar "Pérez, Juan"; cita 23:30.
- [ ] Vender 19:00 GT → comparar Dashboard "hoy" vs Caja vs Reportes.

### Gestión
- [ ] Precio "150,00" en catálogo.
- [ ] Anular venta con producto + cupón: stock, usos, caja cerrada.
- [ ] Cupón con usos "1O".
- [ ] Inventario: vender sin stock → entrada menor al faltante.
- [ ] Desactivar staff → ¿sigue recibiendo push / operando?
- [ ] Desactivar sucursal con cajero asignado → vender.
- [ ] Recuperación: link WhatsApp con 502.
- [ ] Difusión con 0 suscriptores; URL externa.
- [ ] Cron sin header → 401.
- [ ] Cajero entrando por URL a dashboard/reportes/catálogo → redirige.
