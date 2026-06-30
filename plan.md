# Taper Barbershop — CRM con Programa de Lealtad y Gamificación

## Visión del Proyecto

Crear una plataforma SaaS para barberías que combine:

* CRM de clientes.
* Programa de lealtad digital.
* Registro de servicios y ventas.
* Tarjetas VIP con gamificación.
* Estadísticas de negocio.
* Aplicación PWA para clientes.
* Panel administrativo para personal y propietarios.

El objetivo principal es aumentar la retención de clientes, incentivar visitas recurrentes y proporcionar información valiosa para la toma de decisiones del negocio.

---

# Identidad Visual y Tema

## Personalidad de Marca

**Urbana · Moderna · Masculina**

Barbería premium centroamericana con carácter propio. La gamificación se siente como logro, no como jueguito. El panel admin se siente como herramienta profesional.

**Referencia**: Duolingo — progreso adictivo pero elegante, recompensas motivadoras sin infantilizar.

## Tema

**Dark theme** como default en la PWA del cliente (barbería con luz variable, look premium).
Panel admin: dark o tema neutro oscuro — el staff opera bajo luz de barbería.

## Dirección de Color

- Fondo: near-black o dark ink (no negro puro)
- Superficie de tarjeta: gradiente sutil por nivel VIP (Silver/Gold/Platinum/Black)
- Acento primario: un color de marca Taper (definir con cliente — sugerencia: naranja cobre o rojo oscuro)
- Texto: alta legibilidad sobre dark (nunca gris claro genérico)

## Tipografía

- Display/headings: fuerte, geométrica o condensada (carácter masculino)
- Body/UI: sans humanista legible
- Nunca: ultra-thin, script, serif editorial — eso es spa, no barbería

## Anti-referencias

- App de salud/spa genérica: sin tonos pastel ni minimalismo clínico
- SaaS corporativo: sin azul navy + gris sin personalidad
- Fidelización de supermercado: sin UX transaccional fría

---

# Problema que Resolvemos

Actualmente muchas barberías:

* No tienen registro histórico de clientes.
* No conocen la frecuencia de visita de sus usuarios.
* Utilizan tarjetas físicas de lealtad que se pierden fácilmente.
* No cuentan con métricas reales de consumo.
* Pierden oportunidades de fidelización.

Nuestra plataforma digitaliza completamente este proceso.

---

# Arquitectura General

## Aplicación Cliente (PWA)

Cada cliente tendrá una cuenta personal.

### Funciones

* Registro e inicio de sesión.
* Perfil personal.
* QR único de identificación.
* Tarjeta digital de lealtad.
* Historial de servicios.
* Historial de compras.
* Visualización de beneficios VIP.
* Estadísticas personales.

---

## Panel Administrativo

Acceso para:

* Cajeros.
* Barberos.
* Administradores.
* Dueños de barbería.

### Funciones

* Escaneo de QR.
* Búsqueda de clientes.
* Registro de ventas.
* Gestión de servicios.
* Gestión de productos.
* Administración de niveles VIP.
* Estadísticas y reportes.

---

# Flujo Principal

**Objetivo de velocidad del admin: venta completa registrada en ≤15 segundos desde escaneo QR.**

## Registro de Venta

### Cliente

1. Abre la PWA.
2. La tarjeta de lealtad con QR es la pantalla principal — sin pasos extra para mostrarla.
3. QR grande, alto contraste, visible sin autenticación extra.

### Personal

1. Escanea QR con cámara del dispositivo.
2. **Fallback si QR no escanea**: búsqueda por nombre o teléfono inmediatamente.
3. Sistema identifica al cliente en <2 segundos.
4. Muestra card de cliente:
   * Nombre.
   * Visitas acumuladas con progreso visual de lealtad.
   * Nivel VIP con color de tier.
   * Última visita + días transcurridos.
   * Alerta visible si tiene recompensa disponible.
5. Selecciona servicios (los más frecuentes primero para velocidad).
6. Selecciona productos (opcional, con búsqueda).
7. Confirma venta con un tap.

### Sistema

1. Guarda transacción.
2. Actualiza historial.
3. Actualiza progreso de lealtad.
4. Actualiza estadísticas.
5. Refleja cambios en la PWA del cliente en tiempo real (<3 segundos).
6. Si se completa ciclo de lealtad: notifica al personal Y al cliente simultáneamente.

## Manejo de Errores en Flujo

* **QR inválido o expirado**: mensaje claro + opción de búsqueda manual inmediata.
* **Sin conexión**: venta se guarda local y sincroniza al recuperar red (offline-first).
* **Cliente no registrado**: flujo de registro rápido desde el mismo punto de venta.
* **Recompensa ya reclamada**: bloqueo claro con historial visible para evitar conflictos.

---

# Sistema de Lealtad

## Concepto

Por cada corte realizado:

+1 corte acumulado.

Ejemplo:

0/6
1/6
2/6
3/6
4/6
5/6
6/6 = Recompensa disponible

---

## Recompensa Inicial

* 5 cortes pagados.
* 6to corte gratis.

Configuración editable desde el panel administrativo.

---

# Tarjeta Digital

Elemento principal y pantalla de inicio de la PWA. Es la identidad visual del cliente.

## Diseño Visual

* Ocupa la mayoría del viewport en mobile.
* Color/gradiente cambia según nivel VIP (plástico metálico Silver → dorado Gold → azul profundo Platinum → negro puro Black).
* Nombre del cliente, foto (si tiene), y QR prominentes.
* Barra de progreso de lealtad visible sin scroll.
* Animación sutil al abrir la app (no bloqueante, reduced-motion compatible).

## Ejemplo de Contenido

```
┌─────────────────────────────┐
│  TAPER BARBERSHOP           │
│                  [GOLD]     │
│  Carlos Méndez              │
│                             │
│  ████████████░░  4/6        │
│  Te faltan 2 cortes para    │
│  tu próximo corte gratis    │
│                             │
│        [██ QR CODE ██]      │
└─────────────────────────────┘
```

## Estados de la Tarjeta

* **0 visitas (nuevo)**: Bienvenida de marca, explicación del programa, QR ya activo.
* **En progreso**: Barra con conteo claro y motivación ("¡Ya casi!").
* **Recompensa disponible**: Estado especial visual + CTA para reclamar.
* **Nivel subido**: Micro-celebración (animación) + badge del nuevo nivel.

## Micro-interacciones de Gamificación

* Al sumar un corte: la barra avanza con animación de fill.
* Al completar ciclo: confetti contenido o efecto glow — celebración sin exagerar.
* Al subir de nivel: transición de color de tarjeta + pantalla de logro.
* Todos con alternativa estática para reduced-motion.

---

# Sistema VIP

La tarjeta cambia visualmente según el nivel del cliente.

## Silver

Beneficios:

* Acceso al programa de lealtad.

---

## Gold

Beneficios:

* Programa de lealtad.
* Descuento en productos.
* Promociones exclusivas.

---

## Platinum

Beneficios:

* Descuentos superiores.
* Prioridad en reservas.
* Beneficios especiales.

---

## Black

Beneficios:

* Máximo nivel.
* Recompensas exclusivas.
* Beneficios premium.
* Experiencia VIP.

## Diferenciación Visual por Tier

| Nivel    | Color de Tarjeta         | Sentimiento          |
|----------|--------------------------|----------------------|
| Silver   | Gris metalizado           | Inicio del journey   |
| Gold     | Dorado cálido             | Cliente frecuente    |
| Platinum | Azul profundo metálico    | Cliente VIP          |
| Black    | Negro puro + acento       | Élite                |

La tarjeta debe verse físicamente diferente y más premium en cada tier — no solo un badge de color.

---

# Cálculo de Niveles

Los niveles se calcularán por actividad reciente.

## Ejemplo

Últimos 12 meses:

Silver:
0 - 10 visitas

Gold:
11 - 25 visitas

Platinum:
26 - 50 visitas

Black:
51+ visitas

Esto incentiva mantener actividad constante.

---

# Estadísticas para Clientes

Mostrar:

* Total de visitas.
* Total gastado.
* Fecha de primera visita.
* Última visita.
* Nivel actual.
* Próximo nivel.
* Historial de compras.

---

# Historial de Servicios

Ejemplo:

20 Julio 2026

Servicios:

* Corte Clásico Q50

Productos:

* Shampoo Premium Q65

Total:
Q115

Atendido por:
Carlos

---

# Gestión de Productos

El administrador podrá crear:

* Shampoo.
* Pomadas.
* Ceras.
* Aceites.
* Tratamientos.
* Otros productos.

Campos:

* Nombre.
* Precio.
* Categoría.
* Estado.

---

# Gestión de Servicios

Campos:

* Nombre del servicio.
* Precio.
* Categoría.
* Tiempo estimado.
* Estado.

Ejemplos:

* Corte Clásico.
* Corte Fade.
* Barba.
* Corte + Barba.
* Tratamientos.

---

# Estructura de Datos

## Clientes

* ID
* Nombre
* Teléfono
* Correo
* Fecha de registro
* QR único
* Nivel VIP

---

## Ventas

* ID
* Cliente
* Fecha
* Total
* Barbero
* Método de pago

---

## Detalle de Venta

* Servicio
* Producto
* Precio
* Cantidad

---

## Barberos

* ID
* Nombre
* Estado

---

# Dashboard para Dueños

## Indicadores

* Ventas del día.
* Ventas del mes.
* Clientes activos.
* Clientes inactivos.
* Ticket promedio.
* Servicios más vendidos.
* Productos más vendidos.
* Barbero con más ventas.

---

# Recuperación de Clientes

Identificar automáticamente:

* Clientes sin visitar en 30 días.
* Clientes sin visitar en 60 días.
* Clientes sin visitar en 90 días.

Permitir enviar promociones específicas.

---

# Onboarding y Estados Vacíos

## Onboarding de Cliente Nuevo (PWA)

El estado vacío es la primera impresión — no puede ser un placeholder genérico.

1. Pantalla de bienvenida con identidad Taper (logo, hero visual).
2. Explicación del programa en 3 pasos visuales (sin texto denso).
3. Registro rápido: nombre + teléfono (mínimo viable).
4. QR generado inmediatamente al registrar.
5. Tarjeta con 0/6 visible + mensaje motivador de inicio ("Tu journey empieza hoy").

## Onboarding de Staff (Panel Admin)

1. Login con rol asignado (cajero/barbero/admin/dueño).
2. Tutorial de escaneo en el primer uso.
3. Pantalla de inicio con acceso rápido al escáner.

## Estados Vacíos Importantes

| Pantalla | Estado vacío |
|----------|-------------|
| Historial de servicios | "Aún no tienes servicios registrados — ¡comienza hoy!" |
| Dashboard del dueño (día nuevo) | Indicadores en cero, motivación de arranque |
| Clientes inactivos | "Todos tus clientes están activos — ¡bien hecho!" |
| Búsqueda sin resultados | Sugerencia de registrar nuevo cliente |

---

# Fase 1 (MVP)

## Incluye

* PWA para clientes.
* Onboarding de cliente nuevo.
* Login.
* QR único prominente como pantalla principal.
* Tarjeta digital con estados (vacío, en progreso, recompensa disponible).
* Registro de clientes.
* Escaneo QR + fallback por búsqueda.
* Registro de ventas con servicios y productos.
* Historial.
* Programa de lealtad con micro-interacciones.
* Niveles VIP con diferenciación visual por tier.
* Dashboard básico del dueño.
* Manejo de errores: sin conexión, QR inválido, cliente no registrado.

---

# Fase 2

## Incluye

* Sistema de referidos.
* Cupones.
* Beneficios de cumpleaños.
* Notificaciones push.
* WhatsApp automático.
* Reservas de citas.
* Campañas de marketing.

---

# Fase 3

## SaaS Multi-Barbería

* Múltiples sucursales.
* Múltiples usuarios.
* Facturación por suscripción.
* White Label.
* Reportes avanzados.
* Integraciones POS.

---

# Accesibilidad

* WCAG 2.1 AA en todas las interfaces.
* QR mínimo 200×200px con alto contraste (negro sobre blanco o inverso).
* Panel admin funcional en tablets y teléfonos grandes (staff usa lo que tiene).
* Textos con contraste mínimo 4.5:1 — especialmente en dark theme.
* Todas las animaciones de gamificación con alternativa estática (prefers-reduced-motion).
* Panel admin legible bajo luz brillante de barbería.

---

# Objetivo Final

Convertir una simple tarjeta de lealtad en una plataforma completa de fidelización, análisis de clientes y crecimiento para barberías, permitiendo aumentar la recurrencia, las ventas y la satisfacción del cliente mediante una experiencia moderna, digital y gamificada.
