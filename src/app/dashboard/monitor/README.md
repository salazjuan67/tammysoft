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
| ENTREGADO con `numeroHeladera` y sin `fechaRetiro` ("Listo en heladera" en Producción) | stored (Heladera): terminado, esperando retiro |
| ENTREGADO con `fechaRetiro` (botón "Retirado" en Pedidos), o sin heladera | delivered (Entregados hoy) |
| CANCELADO | no se muestra |
El retiro se registra con el botón "Retirado" en Pedidos (`POST /api/pedidos/retiro`, guarda `fechaRetiro`; no cambia estado ni factura). Hasta entonces el pedido sigue en la heladera aunque su rango haya pasado.

Unidades = suma de `items.cantidad` (potes).

Heladeras: se descubren de `numeroHeladera` / `estante` del día. No hay capacidad: no se muestra ocupación %.

Historial del panel: solo `createdAt`, `fechaProduccion` y `updatedAt` si está entregado.

## Alertas

- Entrega próxima: fin del rango horario ≤ 30 min (`ALERT_SOON_MINUTES`).
- Entrega vencida / próxima: solo para pedidos que todavía no están listos (por hacer o en producción); un pedido en heladera no vence.
- Producción demorada: `fechaProduccion` hace ≥ 3 h y sigue en producción (`PRODUCTION_DELAY_HOURS`).
- Zona horaria: `America/Argentina/Buenos_Aires`.

No hay alertas de stock ni temperatura: el sistema no tiene esos datos.

Sonido: en modo TV, el botón de campana hace sonar un aviso cuando aparece una alerta nueva de entrega vencida o producción demorada (las que ya estaban al cargar o al cambiar de día no suenan). El navegador exige un toque en la pantalla después de recargar para habilitar el audio.

Urgencia de las cajas (`urgency.ts`): solo pedidos por hacer o en producción. Borde ámbar si faltan ≤ 2 h para el fin del rango (`URGENCY_SOON_MINUTES`), rojo si faltan ≤ 30 min o ya venció.

## Resumen y widgets

- Línea del día: potes totales y su avance (retirados / en heladera / en producción / por hacer), pedidos por franja horaria y "Falta producir" (potes por hacer + en producción por producto; toca para abrir Producción).
- Panel derecho: alertas, carga por franja horaria (barras verticales, horario actual marcado) y falta producir por producto.
- Buscador: `/` o Ctrl/Cmd+K; Enter (o click en un resultado, una alerta o una heladera) abre la sección del pedido y la cámara va a su caja.
- Otra fecha: banner "No es hoy" con "Volver a hoy". Sin fecha elegida el monitor sigue a hoy y cambia solo a medianoche.
- Modo noche: velo oscuro para la TV (preferencia guardada). Leyenda abajo a la izquierda.

## Assets

Escena: mundo de alto fijo (1200) y ancho según la proporción de la pantalla, en tres ambientes (mostrador de pendientes, sala de producción, cámara fría). `computeLayout` en `layout.ts` da a cada ambiente un ancho mínimo y reparte el resto en proporción a la cantidad de pedidos, así la sala más cargada ocupa más lugar; en las vistas ampliadas (tarjetas de arriba, carteles de sector o zoom con la rueda sobre una sección) ese ambiente toma casi todo el ancho, se muestran solo sus pedidos y al alejar con la rueda se vuelve al plano general. Las cajas se reparten en una grilla con la proporción del ambiente; el tope sale de cuántas entran con el paso mínimo legible (vitrinas: hasta 16 renglones por heladera). El excedente se muestra como "+N" que abre la lista filtrada. Las cajas apilan 1/2/3 niveles según potes (≤12, ≤28, >28). Las heladeras se dibujan como vitrinas con un renglón por pedido (estante · código · cliente · potes); ids de heladera mayores a 3 se agrupan en la tercera. La escena está dibujada en `KitchenBackdrop.tsx` (SVG). Para sustituir ilustraciones, reemplazá ese componente o colocá archivos en `public/monitor/kitchen/` y referencelos como `<image href="/monitor/kitchen/....svg">` sin cambiar `layout.ts` (anclajes de zonas).

## Demo

Solo en desarrollo: `/dashboard/monitor?demo=1`. Nunca se activa en production.

## Polling

Tiempo real: `GET /api/monitor/stream` (SSE) avisa cuando cambia un pedido y el monitor recarga al instante. El aviso sale de una extensión de Prisma en `db.ts` (cualquier escritura de `pedido` o `pedidoItem`) hacia un bus en memoria (`changes.ts`): no usa conexiones extra a la base, pero supone un solo proceso (PM2 fork). Cambios hechos fuera de la app (SQL directo) no avisan y se ven en el refresco de 60 s.

`/api/monitor` reutiliza los pedidos del día entre pantallas mientras no haya cambios (máx. 20 s); el snapshot se arma siempre con la hora actual.

Sin stream (o en demo) se consulta cada 15 segundos, pausado con la pestaña oculta. Si falla la red se conserva el último snapshot y se marca desactualizado.
