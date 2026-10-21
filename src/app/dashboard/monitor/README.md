# Tammy Ops Monitor

Pantalla de solo lectura del obrador: `/dashboard/monitor`.

Roles: ADMIN y OPERARIO. No escribe pedidos ni cambia estados.

## Datos

`GET /api/monitor?fecha=YYYY-MM-DD` arma un snapshot desde `pedidos` con `fechaEntrega` ese día (máx. 300).

Mapeo:

| Estado DB | Monitor |
|---|---|
| PENDIENTE | pending (Por hacer) |
| EN_PRODUCCION sin heladera | production |
| EN_PRODUCCION con `numeroHeladera` | stored (Heladera) |
| ENTREGADO | delivered |
| CANCELADO | no se muestra |
| — | ready_dispatch: heurística, pedidos en heladera cuyo `rangoHorario` es el actual o el siguiente |

Unidades = suma de `items.cantidad` (potes).

Heladeras: se descubren de `numeroHeladera` / `estante` del día. No hay capacidad: no se muestra ocupación %.

Historial del panel: solo `createdAt`, `fechaProduccion` y `updatedAt` si está entregado.

## Alertas

- Entrega próxima: fin del rango horario ≤ 30 min (`ALERT_SOON_MINUTES`).
- Entrega vencida: fin del rango ya pasó y el pedido no está entregado.
- Producción demorada: `fechaProduccion` hace ≥ 3 h y sigue en producción (`PRODUCTION_DELAY_HOURS`).
- Zona horaria: `America/Argentina/Buenos_Aires`.

No hay alertas de stock ni temperatura: el sistema no tiene esos datos.

## Assets

Escena: mundo de alto fijo (1200) y ancho según la proporción de la pantalla, en tres ambientes (mostrador de pendientes, sala de producción, cámara fría). `computeLayout` en `layout.ts` da a cada ambiente un ancho mínimo y reparte el resto en proporción a la cantidad de pedidos, así la sala más cargada ocupa más lugar; en la vista Producción la sala toma casi todo el ancho. Las cajas se reparten en una grilla con la proporción del ambiente; el tope sale de cuántas entran con el paso mínimo legible (vitrinas: hasta 16 renglones por heladera). El excedente se muestra como "+N" que abre la lista filtrada. Las cajas apilan 1/2/3 niveles según potes (≤12, ≤28, >28). Las heladeras se dibujan como vitrinas con un renglón por pedido (estante · código · cliente · potes); ids de heladera mayores a 3 se agrupan en la tercera. La escena está dibujada en `KitchenBackdrop.tsx` (SVG). Para sustituir ilustraciones, reemplazá ese componente o colocá archivos en `public/monitor/kitchen/` y referencelos como `<image href="/monitor/kitchen/....svg">` sin cambiar `layout.ts` (anclajes de zonas).

## Demo

Solo en desarrollo: `/dashboard/monitor?demo=1`. Nunca se activa en production.

## Polling

15 segundos, pausado con la pestaña oculta. Si falla la red se conserva el último snapshot y se marca desactualizado.
