export type AudienciaTutorial = "staff" | "cliente";

export interface GuiaComo {
  titulo: string;
  pasos: string[];
}

export interface TutorialPantalla {
  ruta: string;
  audiencia: AudienciaTutorial;
  titulo: string;
  queHace: string;
  guias: GuiaComo[];
}

export const TUTORIALES: TutorialPantalla[] = [
  {
    ruta: "/dashboard",
    audiencia: "staff",
    titulo: "Inicio",
    queHace:
      "Es el resumen del día: cuánto se vendió, cuántos pedidos hay, deuda pendiente y los últimos movimientos. Sirve para enterarte rápido si hay algo urgente.",
    guias: [
      {
        titulo: "Ver qué hay que entregar hoy",
        pasos: [
          "Mirá la tarjeta de pedidos de hoy y los pendientes de entregar.",
          "Entrá a Pedidos o a Producción para trabajarlos.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/pedidos",
    audiencia: "staff",
    titulo: "Pedidos",
    queHace:
      "Acá se cargan, editan y siguen todos los pedidos. Podés filtrar por cliente, fecha de entrega y estado. También hay acciones masivas para varios pedidos a la vez.",
    guias: [
      {
        titulo: "Crear un pedido nuevo",
        pasos: [
          "Tocá Nuevo pedido (se abre en pantalla completa).",
          "Elegí el cliente y, si hace falta, escribí el cliente final en Notas.",
          "Poné fecha de entrega y horario.",
          "Sumá productos. En el resumen de la derecha podés cambiar cantidades.",
          "Tocá Crear pedido.",
        ],
      },
      {
        titulo: "Repetir un pedido de un cliente",
        pasos: [
          "Abrí Nuevo pedido y seleccioná el cliente.",
          "Tocá Repetir.",
          "Buscá por fecha, notas, producto o categoría.",
          "Tocá el ojito para ver el detalle, ajustá cantidades si hace falta y confirmá.",
        ],
      },
      {
        titulo: "Mandar varios a producción o entregar",
        pasos: [
          "Marcá los pedidos con las casillas (o Seleccionar todos).",
          "Usá la barra de acciones: producción, entregar o cancelar.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/produccion",
    audiencia: "staff",
    titulo: "Producción",
    queHace:
      "Acá se arma lo que hay que fabricar. Los productos se agrupan por categoría. Podés pasar pedidos a producción y marcarlos como listos en heladera, de a uno o varios juntos.",
    guias: [
      {
        titulo: "Pasar pedidos a producción",
        pasos: [
          "Marcá uno o varios pedidos pendientes.",
          "Tocá Iniciar producción y confirmá la fecha de producción.",
        ],
      },
      {
        titulo: "Marcar listo en heladera",
        pasos: [
          "Marcá los que ya están terminados (tienen que estar en producción).",
          "Completá número de heladera y estante.",
          "Confirmá Listo en heladera.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/monitor",
    audiencia: "staff",
    titulo: "Tammy Ops",
    queHace:
      "Monitor del obrador: ves los pedidos del día como bandejas en un local isométrico, filtrás por estado y abrís el detalle. No cambia estados; para operar se va a Pedidos o Producción.",
    guias: [
      {
        titulo: "Leer el día",
        pasos: [
          "Las tarjetas de arriba (pendientes, producción, heladera, entregados) abren esa sección en grande; Alertas filtra la escena.",
          "Tocá una bandeja para ver cliente, productos y ubicación.",
          "Con el buscador (tecla /) la cámara va directo a la caja del pedido. Minimizar alertas deja el obrador a todo el ancho.",
          "Un pedido listo queda en la heladera hasta que se marca Retirado en Pedidos; ahí pasa a Entregados.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/cobranza",
    audiencia: "staff",
    titulo: "Cobranza",
    queHace:
      "Acá se cobran las facturas: se registra el pago, se ve qué falta y se puede filtrar por cliente o fecha de entrega.",
    guias: [
      {
        titulo: "Registrar un cobro",
        pasos: [
          "Buscá la factura o el cliente.",
          "Abrí el detalle y cargá el pago (efectivo, transferencia, etc.).",
          "Si se cobra todo, queda como cobrada.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/solicitudes",
    audiencia: "staff",
    titulo: "Solicitudes de facturación",
    queHace:
      "Los distribuidores piden facturar pedidos (con IVA en el porcentaje que elijan). Acá las aprobás o rechazás.",
    guias: [
      {
        titulo: "Aprobar o rechazar",
        pasos: [
          "Abrí la solicitud y revisá los pedidos y el porcentaje a facturar.",
          "Aprobá para generar la factura, o rechazá para que los pedidos vuelvan a estar disponibles.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/reportes/dia",
    audiencia: "staff",
    titulo: "Reporte del día",
    queHace:
      "Muestra lo del día elegido: totales de postres y plata (General) o el detalle por cliente y pedido (Detallado). Se puede imprimir la pestaña activa.",
    guias: [
      {
        titulo: "Imprimir el reporte",
        pasos: [
          "Elegí la fecha.",
          "Pasá a General o Detallado según lo que necesites.",
          "Tocá Imprimir. Solo se imprime la pestaña que estás viendo.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/reportes/distribuidores",
    audiencia: "staff",
    titulo: "Reporte de distribuidores",
    queHace: "Resumen de pedidos e importes por distribuidor, para ver cómo viene cada uno.",
    guias: [
      {
        titulo: "Leer el reporte",
        pasos: [
          "Elegí el período si hay filtros de fecha.",
          "Compará totales por cliente y el consolidado general.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/reportes",
    audiencia: "staff",
    titulo: "Reportes",
    queHace:
      "Gráficos e indicadores: ventas, clientes top, carga por día y por horario. También hay acceso al reporte del día.",
    guias: [
      {
        titulo: "Exportar datos",
        pasos: ["En las tablas que lo permitan, usá el botón de exportar CSV."],
      },
    ],
  },
  {
    ruta: "/dashboard/facturacion",
    audiencia: "staff",
    titulo: "Facturación",
    queHace: "Listado de facturas emitidas: estado de cobro, cliente y detalle de cada una.",
    guias: [
      {
        titulo: "Buscar una factura",
        pasos: ["Filtrá por cliente o estado (por ejemplo sin cobrar).", "Entrá al detalle para ver ítems y pagos."],
      },
    ],
  },
  {
    ruta: "/dashboard/admin/proveedores/facturas",
    audiencia: "staff",
    titulo: "Facturas de proveedores",
    queHace: "Acá se cargan las facturas que les llegan de proveedores y se registran los pagos.",
    guias: [
      {
        titulo: "Cargar una factura de proveedor",
        pasos: ["Tocá para crear una nueva.", "Elegí proveedor, importe y datos.", "Después registrá pagos desde el detalle."],
      },
    ],
  },
  {
    ruta: "/dashboard/admin/tipos-cliente",
    audiencia: "staff",
    titulo: "Tipos de cliente",
    queHace:
      "Define grupos (por ejemplo mayorista) con un descuento distinto por cada postre. Ese descuento se aplica al armar el pedido.",
    guias: [
      {
        titulo: "Armar un tipo con descuentos",
        pasos: [
          "Creá el tipo de cliente.",
          "Completá la matriz: porcentaje de descuento por producto.",
          "Asigná ese tipo al cliente en Administración → Clientes.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/admin/clientes",
    audiencia: "staff",
    titulo: "Clientes",
    queHace: "Alta y edición de distribuidores: datos de contacto, tipo de cliente y horario habitual.",
    guias: [
      {
        titulo: "Dar de alta un distribuidor",
        pasos: [
          "Tocá Nuevo cliente y completá nombre y email (con ese email entra al portal).",
          "Asigná el tipo de cliente si tiene descuento.",
          "Guardá. Ya puede pedir desde /cliente/login.",
        ],
      },
    ],
  },
  {
    ruta: "/dashboard/admin/productos",
    audiencia: "staff",
    titulo: "Productos",
    queHace: "Catálogo de postres: precios, categoría y si está activo. Se pueden cambiar precios de a muchos.",
    guias: [
      {
        titulo: "Buscar por categoría",
        pasos: ["Usá el buscador: encuentra por nombre del postre o de la categoría."],
      },
      {
        titulo: "Actualizar precios masivos",
        pasos: ["Activá el modo de precios masivos o pegá la lista.", "Revisá la vista previa y guardá."],
      },
    ],
  },
  {
    ruta: "/dashboard/admin/categorias",
    audiencia: "staff",
    titulo: "Categorías",
    queHace: "Agrupa los postres (Mousse, Tartas, etc.) para el catálogo, producción y reportes.",
    guias: [
      {
        titulo: "Crear una categoría",
        pasos: ["Agregá el nombre y el orden en que querés que aparezca en las listas."],
      },
    ],
  },
  {
    ruta: "/dashboard/admin/usuarios",
    audiencia: "staff",
    titulo: "Usuarios",
    queHace: "Quién entra al panel interno y con qué rol (admin, operario, vendedor).",
    guias: [
      {
        titulo: "Crear un usuario del equipo",
        pasos: ["Nuevo usuario, email y rol.", "No confundir con el portal del cliente: eso usa el email del cliente."],
      },
    ],
  },
  {
    ruta: "/dashboard/admin/proveedores",
    audiencia: "staff",
    titulo: "Proveedores",
    queHace: "Agenda de proveedores a los que les compran insumos.",
    guias: [
      {
        titulo: "Alta de proveedor",
        pasos: ["Cargá nombre y datos.", "Las facturas se cargan en Fact. Proveedores."],
      },
    ],
  },
  {
    ruta: "/dashboard/admin/configuracion",
    audiencia: "staff",
    titulo: "Configuración",
    queHace: "Herramientas de administración y datos de ejemplo. Usala con cuidado.",
    guias: [
      {
        titulo: "Antes de tocar algo",
        pasos: ["Si no estás segura de qué hace un botón, no lo uses en producción."],
      },
    ],
  },
  {
    ruta: "/dashboard/admin",
    audiencia: "staff",
    titulo: "Administración",
    queHace: "Acceso a clientes, productos, categorías, usuarios, proveedores y configuración.",
    guias: [
      {
        titulo: "Por dónde empezar",
        pasos: ["Clientes y Productos son lo más usado.", "Tipos de cliente es para los descuentos por postre."],
      },
    ],
  },
  {
    ruta: "/cliente/dashboard",
    audiencia: "cliente",
    titulo: "Inicio",
    queHace:
      "Tu resumen: pedidos activos, si tenés deuda y la próxima entrega. Desde acá arranca un pedido nuevo.",
    guias: [
      {
        titulo: "Hacer un pedido",
        pasos: ["Tocá Nuevo pedido o andá a Pedidos.", "Elegí productos, fecha y confirmá."],
      },
    ],
  },
  {
    ruta: "/cliente/pedidos/nuevo",
    audiencia: "cliente",
    titulo: "Nuevo pedido",
    queHace:
      "Armás el pedido: catálogo a la izquierda y resumen a la derecha. Podés repetir un pedido anterior, cambiar cantidades en el resumen y después elegir fecha.",
    guias: [
      {
        titulo: "Armar el pedido",
        pasos: [
          "Buscá por nombre o categoría (por ejemplo Mousse).",
          "Sumá cantidades. En el resumen de la derecha también las podés cambiar.",
          "Tocá Siguiente, elegí fecha de entrega y confirmá.",
        ],
      },
      {
        titulo: "Repetir un pedido anterior",
        pasos: [
          "Tocá Repetir arriba a la derecha.",
          "Buscá por fecha, notas, producto o categoría.",
          "Tocá el ojito, revisá cantidades y confirmá para copiarlo.",
          "Elegí una fecha nueva (obligatorio) y confirmá el pedido.",
        ],
      },
    ],
  },
  {
    ruta: "/cliente/pedidos",
    audiencia: "cliente",
    titulo: "Mis pedidos",
    queHace: "Historial de tus pedidos. Podés ver el detalle, repetir uno, editarlo si todavía está pendiente, o cancelarlo.",
    guias: [
      {
        titulo: "Repetir desde la lista",
        pasos: ["En Acciones, tocá el ícono de copiar.", "Se abre el pedido nuevo con esos productos para ajustar y confirmar."],
      },
      {
        titulo: "Editar un pedido pendiente",
        pasos: [
          "Solo se puede si está Pendiente y todavía no cerró el horario de edición.",
          "Tocá el lápiz, cambiá productos o fecha y guardá.",
        ],
      },
    ],
  },
  {
    ruta: "/cliente/facturas",
    audiencia: "cliente",
    titulo: "Facturas",
    queHace: "Las facturas que Tammy te emitió y si están pendientes o cobradas.",
    guias: [
      {
        titulo: "Ver una factura",
        pasos: ["Entrá al detalle para ver importe y estado.", "Si tenés dudas de un cobro, hablá con Tammy."],
      },
    ],
  },
  {
    ruta: "/cliente/deuda",
    audiencia: "cliente",
    titulo: "Mi deuda",
    queHace: "Cuánto tenés pendiente de pago, según las facturas abiertas.",
    guias: [
      {
        titulo: "Entender el saldo",
        pasos: ["El total suma las facturas no cobradas o cobradas en parte.", "El detalle está en Facturas."],
      },
    ],
  },
  {
    ruta: "/cliente/cuenta",
    audiencia: "cliente",
    titulo: "Mi cuenta",
    queHace:
      "Acá pedís facturación: elegís pedidos entregados y qué porcentaje va con factura (IVA 21%). El resto queda en efectivo.",
    guias: [
      {
        titulo: "Solicitar facturación",
        pasos: [
          "Marcá los pedidos que querés facturar.",
          "Ajustá el porcentaje (el sistema redondea hacia arriba).",
          "Enviá la solicitud. Tammy la aprueba o rechaza desde su panel.",
        ],
      },
    ],
  },
  {
    ruta: "/cliente/login",
    audiencia: "cliente",
    titulo: "Ingreso al portal",
    queHace: "Los distribuidores entran con el email que tienen cargado en Tammy. No hace falta contraseña.",
    guias: [
      {
        titulo: "Si no te deja entrar",
        pasos: [
          "Verificá que el email sea exactamente el que Tammy tiene en Clientes.",
          "Si sigue fallando, pedile a Tammy que revise el alta.",
        ],
      },
    ],
  },
];

export function tutorialParaRuta(pathname: string, audiencia: AudienciaTutorial): TutorialPantalla | null {
  const candidatos = TUTORIALES
    .filter((t) => t.audiencia === audiencia && (pathname === t.ruta || pathname.startsWith(`${t.ruta}/`)))
    .sort((a, b) => b.ruta.length - a.ruta.length);
  return candidatos[0] ?? null;
}

export function tutorialesDe(audiencia: AudienciaTutorial): TutorialPantalla[] {
  return TUTORIALES.filter((t) => t.audiencia === audiencia);
}
