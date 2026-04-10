export interface FieldDefinition {
  nombre: string;
  tipo: string;
  longitud?: string;
  requerido: boolean;
  descripcion: string;
}

export interface ModalDefinition {
  nombre: string;
  descripcion: string;
  campos?: FieldDefinition[];
}

export interface FAQItem {
  pregunta: string;
  respuesta: string;
}

export interface ManualModule {
  id: string;
  titulo: string;
  icono: string; // lucide icon name
  descripcion: string;
  funcionalidades: string[];
  campos: FieldDefinition[];
  modales: ModalDefinition[];
  faq: FAQItem[];
  etiquetas: string[];
}

export const manualsData: ManualModule[] = [
  {
    id: "usuarios",
    titulo: "Usuarios",
    icono: "Users",
    descripcion:
      "El módulo de Usuarios permite gestionar todas las cuentas de acceso al sistema. Desde aquí puedes crear, editar, desactivar y eliminar usuarios, así como asignarles roles con permisos específicos. También se administra la autenticación de dos factores (2FA), el reseteo de contraseñas y la carga del avatar de perfil.",
    funcionalidades: [
      "Crear y editar usuarios con datos completos (nombre, email, teléfono, puesto)",
      "Asignar roles y permisos granulares por módulo",
      "Activar/desactivar autenticación de dos factores (2FA) con código QR",
      "Reseteo de contraseña seguro vía email",
      "Carga y recorte de avatar de perfil",
      "Desactivar cuentas sin eliminar historial",
      "Filtrar usuarios por rol, estatus o búsqueda libre",
      "Exportar listado de usuarios a Excel",
    ],
    campos: [
      {
        nombre: "Nombre",
        tipo: "texto",
        longitud: "100",
        requerido: true,
        descripcion: "Nombre(s) del usuario",
      },
      {
        nombre: "Apellido",
        tipo: "texto",
        longitud: "100",
        requerido: true,
        descripcion: "Apellido(s) del usuario",
      },
      {
        nombre: "Email",
        tipo: "email",
        longitud: "150",
        requerido: true,
        descripcion: "Correo electrónico único para inicio de sesión",
      },
      {
        nombre: "Teléfono",
        tipo: "texto",
        longitud: "15",
        requerido: false,
        descripcion: "Número de teléfono con lada",
      },
      {
        nombre: "Puesto",
        tipo: "texto",
        longitud: "80",
        requerido: false,
        descripcion: "Cargo o puesto dentro de la empresa",
      },
      {
        nombre: "Rol",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Rol que define los permisos del usuario en el sistema",
      },
      {
        nombre: "Contraseña",
        tipo: "password",
        longitud: "128",
        requerido: true,
        descripcion:
          "Mínimo 8 caracteres, una mayúscula, un número y un símbolo",
      },
      {
        nombre: "Avatar",
        tipo: "imagen",
        longitud: "5 MB",
        requerido: false,
        descripcion: "Foto de perfil en formato JPG, PNG o WebP",
      },
      {
        nombre: "Estatus",
        tipo: "toggle",
        longitud: "—",
        requerido: true,
        descripcion:
          "Activo o Inactivo. Un usuario inactivo no puede iniciar sesión",
      },
    ],
    modales: [
      {
        nombre: "Crear / Editar Usuario",
        descripcion:
          "Formulario completo para registrar un nuevo usuario o modificar uno existente. Incluye validaciones en tiempo real para email duplicado y fortaleza de contraseña.",
      },
      {
        nombre: "Configurar 2FA",
        descripcion:
          "Muestra un código QR que el usuario escanea con Google Authenticator o Authy. Una vez enlazado, se solicita un código TOTP en cada inicio de sesión.",
      },
      {
        nombre: "Resetear Contraseña",
        descripcion:
          "Envía un enlace de restablecimiento al email registrado del usuario. El enlace expira en 24 horas por seguridad.",
      },
      {
        nombre: "Cambiar Avatar",
        descripcion:
          "Permite subir una imagen y recortarla en formato circular antes de guardar. Soporta arrastrar y soltar.",
      },
      {
        nombre: "Confirmar Desactivación",
        descripcion:
          "Diálogo de confirmación antes de desactivar una cuenta. El usuario no podrá iniciar sesión pero su historial y registros se conservan.",
      },
    ],
    faq: [
      {
        pregunta: "¿Qué pasa si desactivo un usuario?",
        respuesta:
          "El usuario no podrá iniciar sesión, pero todos sus registros, viajes y actividades previas se conservan intactos en el sistema. Puedes reactivarlo en cualquier momento.",
      },
      {
        pregunta: "¿Cómo funciona la autenticación de dos factores (2FA)?",
        respuesta:
          "Al activar 2FA, el usuario escanea un código QR con una app como Google Authenticator. En cada inicio de sesión, además de su contraseña, deberá ingresar un código numérico de 6 dígitos que cambia cada 30 segundos.",
      },
      {
        pregunta: "¿Puedo tener más de un administrador?",
        respuesta:
          "Sí. Puedes asignar el rol de Administrador a múltiples usuarios. Cada uno tendrá acceso completo al sistema incluyendo la gestión de roles y configuración.",
      },
      {
        pregunta: "¿Qué pasa si un usuario olvida su contraseña?",
        respuesta:
          "Desde la pantalla de login puede solicitar un reseteo. También un administrador puede forzar el envío del enlace de restablecimiento desde el módulo de Usuarios.",
      },
      {
        pregunta: "¿Qué formatos acepta el avatar?",
        respuesta:
          "Se aceptan imágenes JPG, PNG y WebP con un tamaño máximo de 5 MB. La imagen se recorta automáticamente en formato circular.",
      },
    ],
    etiquetas: ["Básico", "Administración", "Seguridad"],
  },
  {
    id: "clientes",
    titulo: "Clientes",
    icono: "Building2",
    descripcion:
      "El módulo de Clientes centraliza la gestión comercial. Permite registrar empresas o personas físicas con su información fiscal (RFC, régimen SAT), administrar múltiples sucursales por cliente, cargar documentos legales (contratos, constancias) y configurar los datos de facturación electrónica (CFDI).",
    funcionalidades: [
      "Registro de clientes con razón social, RFC y régimen fiscal",
      "Gestión de múltiples sucursales por cliente con dirección completa",
      "Carga de documentos: contratos, constancias de situación fiscal, INE",
      "Configuración SAT: uso de CFDI, método de pago, forma de pago",
      "Asignación de ejecutivo de cuenta",
      "Historial de viajes y facturación por cliente",
      "Filtrado por estatus (Activo, Suspendido, Inactivo)",
      "exportacion a Excel del catálogo completo",
    ],
    campos: [
      {
        nombre: "Razón Social",
        tipo: "texto",
        longitud: "200",
        requerido: true,
        descripcion: "Nombre legal de la empresa o persona física",
      },
      {
        nombre: "Nombre Comercial",
        tipo: "texto",
        longitud: "150",
        requerido: false,
        descripcion: "Nombre con el que se conoce al cliente comercialmente",
      },
      {
        nombre: "RFC",
        tipo: "texto",
        longitud: "13",
        requerido: true,
        descripcion: "Registro Federal de Contribuyentes (12 o 13 caracteres)",
      },
      {
        nombre: "Régimen Fiscal",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Régimen fiscal del SAT (ej. 601 - General de Ley)",
      },
      {
        nombre: "Uso de CFDI",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion:
          "Clave de uso del comprobante fiscal (ej. G03 - Gastos en general)",
      },
      {
        nombre: "Código Postal Fiscal",
        tipo: "texto",
        longitud: "5",
        requerido: true,
        descripcion: "CP del domicilio fiscal registrado ante el SAT",
      },
      {
        nombre: "Email de Facturación",
        tipo: "email",
        longitud: "150",
        requerido: true,
        descripcion: "Correo donde se enviarán las facturas electrónicas",
      },
      {
        nombre: "Teléfono",
        tipo: "texto",
        longitud: "15",
        requerido: false,
        descripcion: "Teléfono principal de contacto",
      },
      {
        nombre: "Método de Pago",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion:
          "PPD (Pago en Parcialidades) o PUE (Pago en Una Exhibición)",
      },
      {
        nombre: "Forma de Pago",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion:
          "Clave SAT de forma de pago (ej. 03 - Transferencia electrónica)",
      },
      {
        nombre: "Días de Crédito",
        tipo: "número",
        longitud: "3",
        requerido: false,
        descripcion: "Plazo en días para el vencimiento de facturas",
      },
      {
        nombre: "Ejecutivo",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion: "Usuario responsable de la relación comercial",
      },
    ],
    modales: [
      {
        nombre: "Crear / Editar Cliente",
        descripcion:
          "Formulario principal dividido en pestañas: Datos Generales, Configuración Fiscal, Sucursales y Documentos. Cada pestaña valida independientemente antes de permitir guardar.",
      },
      {
        nombre: "Agregar Sucursal",
        descripcion:
          "Permite registrar una nueva ubicación del cliente con dirección completa, contacto y horario de operación. Cada sucursal puede tener su propia configuración de entrega.",
      },
      {
        nombre: "Cargar Documento",
        descripcion:
          "Sube archivos PDF, imágenes o documentos escaneados. Se clasifica por tipo (Contrato, CSF, INE, Otro) y se almacena vinculado al cliente.",
      },
      {
        nombre: "Configuración SAT",
        descripcion:
          "Modal dedicado para ajustar los parámetros de facturación electrónica: régimen fiscal, uso de CFDI, método y forma de pago. Valida que las combinaciones sean compatibles según el catálogo del SAT.",
      },
      {
        nombre: "Confirmar Suspensión",
        descripcion:
          "Diálogo para suspender temporalmente a un cliente. No se podrán crear nuevos viajes para este cliente mientras esté suspendido.",
      },
    ],
    faq: [
      {
        pregunta:
          "¿Qué diferencia hay entre Suspender y Desactivar un cliente?",
        respuesta:
          "Suspender es temporal: el cliente no puede recibir nuevos viajes pero su historial y configuración se conservan. Desactivar es permanente: el cliente se oculta del catálogo activo (pero no se borra de la base de datos).",
      },
      {
        pregunta: "¿Puedo tener varias sucursales por cliente?",
        respuesta:
          "Sí. Cada cliente puede tener un número ilimitado de sucursales. Cada sucursal tiene su propia dirección, contacto y puede ser seleccionada como origen o destino en los viajes.",
      },
      {
        pregunta: "¿Qué pasa si cambio la configuración SAT de un cliente?",
        respuesta:
          "Los cambios aplican solo para facturas nuevas. Las facturas ya emitidas conservan la configuración que tenían al momento de su generación.",
      },
      {
        pregunta: "¿Qué documentos puedo cargar?",
        respuesta:
          "Puedes subir cualquier archivo PDF, imagen (JPG, PNG) o documento escaneado. Los tipos predefinidos son: Contrato, Constancia de Situación Fiscal (CSF), Identificación (INE) y Otros.",
      },
      {
        pregunta: "¿Cómo funciona el campo de Días de Crédito?",
        respuesta:
          "Define el plazo máximo en días que tiene el cliente para pagar una factura desde su fecha de emisión. Este valor se usa para calcular la fecha de vencimiento en el módulo de Cuentas por Cobrar.",
      },
    ],
    etiquetas: ["Básico", "Avanzado", "Facturación"],
  },
  {
    id: "flota",
    titulo: "Flota",
    icono: "Truck",
    descripcion:
      "El módulo de Flota centraliza la gestión de todas las unidades vehiculares de la empresa: tractocamiones, remolques, dollys y utilitarios. Permite registrar especificaciones técnicas, controlar la vigencia de documentos (tarjeta de circulación, póliza de seguro, verificación), asignar operadores, visualizar el historial de mantenimientos y consultar el esquema de llantas por unidad. Es el corazón operativo del sistema de transporte.",
    funcionalidades: [
      "Registro de unidades con datos técnicos completos (marca, modelo, año, número económico, VIN, placas)",
      "Clasificación por tipo: Tractocamión, Remolque, Dolly, Utilitario",
      "Asignación y reasignación de operadores a unidades",
      "Control de documentos vigentes con alertas de vencimiento (tarjeta de circulación, póliza de seguro, verificación vehicular)",
      "Carga de documentos escaneados vinculados a cada unidad",
      "Visualización del esquema gráfico de llantas por unidad (chasis SVG interactivo)",
      "Historial completo de mantenimientos preventivos y correctivos por unidad",
      "Ficha técnica detallada con pestañas (General, Documentos, Llantas, Mantenimientos)",
      "Filtrado por estatus (Activa, En Taller, Siniestrada, Baja)",
      "exportacion del catálogo de unidades a Excel",
    ],
    campos: [
      {
        nombre: "Número Económico",
        tipo: "texto",
        longitud: "20",
        requerido: true,
        descripcion:
          "Identificador interno único de la unidad dentro de la empresa",
      },
      {
        nombre: "Tipo de Unidad",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Tractocamión, Remolque, Dolly o Utilitario",
      },
      {
        nombre: "Marca",
        tipo: "texto",
        longitud: "50",
        requerido: true,
        descripcion:
          "Fabricante del vehículo (ej. Kenworth, Freightliner, International)",
      },
      {
        nombre: "Modelo / Submarca",
        tipo: "texto",
        longitud: "50",
        requerido: true,
        descripcion: "Línea o submarca del vehículo (ej. T680, Cascadia)",
      },
      {
        nombre: "Año",
        tipo: "número",
        longitud: "4",
        requerido: true,
        descripcion: "Año modelo del vehículo",
      },
      {
        nombre: "VIN",
        tipo: "texto",
        longitud: "17",
        requerido: true,
        descripcion:
          "Número de Identificación Vehicular (Vehicle Identification Number), 17 caracteres alfanuméricos",
      },
      {
        nombre: "Placas",
        tipo: "texto",
        longitud: "10",
        requerido: true,
        descripcion: "Placas de circulación vigentes",
      },
      {
        nombre: "Color",
        tipo: "texto",
        longitud: "30",
        requerido: false,
        descripcion: "Color exterior de la unidad",
      },
      {
        nombre: "Número de Ejes",
        tipo: "número",
        longitud: "2",
        requerido: true,
        descripcion:
          "Cantidad de ejes de la unidad, define el esquema de llantas",
      },
      {
        nombre: "Número de Llantas",
        tipo: "número",
        longitud: "2",
        requerido: true,
        descripcion: "Cantidad total de llantas que porta la unidad",
      },
      {
        nombre: "Capacidad de Carga (ton)",
        tipo: "número",
        longitud: "6",
        requerido: false,
        descripcion: "Peso máximo de carga en toneladas",
      },
      {
        nombre: "Odómetro Actual (km)",
        tipo: "número",
        longitud: "10",
        requerido: false,
        descripcion: "Lectura actual del kilometraje de la unidad",
      },
      {
        nombre: "Operador Asignado",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion: "Operador actualmente responsable de la unidad",
      },
      {
        nombre: "Estatus",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Activa, En Taller, Siniestrada o Baja",
      },
      {
        nombre: "Fecha de Alta",
        tipo: "fecha",
        longitud: "—",
        requerido: true,
        descripcion: "Fecha en que la unidad fue registrada en el sistema",
      },
    ],
    modales: [
      {
        nombre: "Crear / Editar Unidad",
        descripcion:
          "Formulario con pestañas para registrar o modificar una unidad. Incluye datos generales, especificaciones técnicas y configuración de ejes/llantas. Valida VIN único y formato de placas.",
      },
      {
        nombre: "Asignar Operador",
        descripcion:
          "Muestra la lista de operadores disponibles (sin unidad asignada) y permite vincular uno a la unidad seleccionada. Si la unidad ya tiene operador, se muestra opción de reasignar.",
      },
      {
        nombre: "Cargar Documento de Unidad",
        descripcion:
          "Sube documentos PDF o imágenes vinculados a la unidad: tarjeta de circulación, póliza de seguro, verificación vehicular, factura de compra, etc. Cada documento registra fecha de vigencia para alertas.",
      },
      {
        nombre: "Editar Datos Técnicos",
        descripcion:
          "Modal rápido para actualizar información que cambia frecuentemente: odómetro, estatus, color, placas (por reemplacamiento).",
      },
      {
        nombre: "Confirmar Baja de Unidad",
        descripcion:
          "Diálogo de confirmación para dar de baja una unidad. Requiere justificación (venta, siniestro total, obsolescencia). La unidad deja de aparecer en los catálogos activos pero conserva su historial.",
      },
    ],
    faq: [
      {
        pregunta: "¿Cómo asigno un operador a una unidad?",
        respuesta:
          "Desde el detalle de la unidad, haz clic en el botón 'Asignar Operador'. Se mostrará la lista de operadores disponibles. Selecciona uno y confirma. Si la unidad ya tenía un operador, el anterior queda libre automáticamente.",
      },
      {
        pregunta: "¿Qué pasa si doy de baja una unidad?",
        respuesta:
          "La unidad se marca como 'Baja' y deja de aparecer en los catálogos activos de despacho y asignación. Sin embargo, todo su historial (viajes, mantenimientos, documentos) se conserva para consulta. El operador asignado queda liberado.",
      },
      {
        pregunta: "¿Cómo funciona el esquema gráfico de llantas?",
        respuesta:
          "En la pestaña 'Llantas' del detalle de unidad se muestra un diagrama SVG del chasis con las posiciones de cada llanta. Puedes hacer clic en una posición para asignar, rotar o retirar una llanta. El color indica el estado: verde (buena), amarillo (desgaste), rojo (requiere cambio).",
      },
      {
        pregunta: "¿Cómo sé si un documento está por vencer?",
        respuesta:
          "El sistema muestra alertas automáticas cuando un documento está a 30 días de vencer (amarillo) o ya venció (rojo). También puedes filtrar unidades por 'Documentos por vencer' en el catálogo principal.",
      },
      {
        pregunta: "¿Puedo registrar remolques y dollys?",
        respuesta:
          "Sí. Al crear una unidad selecciona el tipo 'Remolque' o 'Dolly'. Estos tipos tienen campos específicos como número de ejes y capacidad de carga, pero no requieren campos de motor o transmisión.",
      },
      {
        pregunta: "¿Qué es el número económico?",
        respuesta:
          "Es el identificador interno que la empresa asigna a cada unidad (ej. T-001, R-045). Es único y se utiliza en toda la operación para referirse a la unidad de forma rápida.",
      },
    ],
    etiquetas: ["Básico", "Avanzado"],
  },
  {
    id: "llantas",
    titulo: "Llantas",
    icono: "CircleDot",
    descripcion:
      "El módulo de Llantas gestiona el inventario completo de neumáticos de la flota. Permite registrar cada llanta con su código interno, marca, medida y profundidad de huella. Controla la asignación a unidades por posición, registra rotaciones, renovados (recapas), mantenimientos y da de baja llantas en desecho. El objetivo es maximizar la vida útil de cada llanta y reducir costos operativos.",
    funcionalidades: [
      "Registro de llantas con código interno, marca, modelo, medida y DOT",
      "Control de profundidad de huella (mm) con indicador visual de desgaste",
      "Asignación de llantas a unidades por posición específica en el chasis",
      "Rotación de llantas entre posiciones o entre unidades",
      "Registro de renovados (recapas) con costo y proveedor",
      "Historial completo de movimientos por llanta (asignaciones, rotaciones, mantenimientos)",
      "Control de inventario: llantas en almacén vs. montadas vs. en renovado vs. desecho",
      "Dar de baja llantas con justificación (desgaste total, daño irreparable, robo)",
      "Alertas de profundidad mínima de huella por normativa",
      "exportacion del inventario a Excel",
      "Filtrado por estado (Nueva, Montada, Almacén, Renovado, Desecho)",
    ],
    campos: [
      {
        nombre: "Código Interno",
        tipo: "texto",
        longitud: "30",
        requerido: true,
        descripcion:
          "Identificador único de la llanta en el inventario (ej. LL-0001)",
      },
      {
        nombre: "Marca",
        tipo: "texto",
        longitud: "50",
        requerido: true,
        descripcion:
          "Fabricante de la llanta (ej. Michelin, Bridgestone, Continental)",
      },
      {
        nombre: "Modelo",
        tipo: "texto",
        longitud: "50",
        requerido: false,
        descripcion: "Línea o modelo específico de la llanta",
      },
      {
        nombre: "Medida",
        tipo: "texto",
        longitud: "20",
        requerido: true,
        descripcion: "Dimensiones de la llanta (ej. 295/80R22.5, 11R24.5)",
      },
      {
        nombre: "DOT",
        tipo: "texto",
        longitud: "12",
        requerido: false,
        descripcion:
          "Código DOT de fabricación que indica semana y año de manufactura",
      },
      {
        nombre: "Profundidad de Huella (mm)",
        tipo: "número",
        longitud: "4",
        requerido: true,
        descripcion:
          "Profundidad actual del dibujo en milímetros. Mínimo legal: 3mm",
      },
      {
        nombre: "Estado",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Nueva, Montada, Almacén, En Renovado o Desecho",
      },
      {
        nombre: "Posición",
        tipo: "texto",
        longitud: "10",
        requerido: false,
        descripcion:
          "Posición en el chasis donde está montada (ej. 1-LI, 2-RO). Vacío si está en almacén",
      },
      {
        nombre: "Unidad Asignada",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion:
          "Unidad vehicular donde está montada actualmente la llanta",
      },
      {
        nombre: "Costo de Adquisición",
        tipo: "moneda",
        longitud: "10",
        requerido: false,
        descripcion: "Precio de compra original de la llanta en MXN",
      },
      {
        nombre: "Proveedor",
        tipo: "texto",
        longitud: "100",
        requerido: false,
        descripcion: "Proveedor o casa llantea donde se adquirió",
      },
      {
        nombre: "Km Acumulados",
        tipo: "número",
        longitud: "10",
        requerido: false,
        descripcion:
          "Kilómetros totales recorridos por la llanta desde su alta",
      },
      {
        nombre: "Número de Recapas",
        tipo: "número",
        longitud: "2",
        requerido: false,
        descripcion:
          "Cantidad de veces que la llanta ha sido renovada/recapada",
      },
      {
        nombre: "Fecha de Alta",
        tipo: "fecha",
        longitud: "—",
        requerido: true,
        descripcion: "Fecha de ingreso de la llanta al inventario",
      },
    ],
    modales: [
      {
        nombre: "Crear / Editar Llanta",
        descripcion:
          "Formulario para registrar una nueva llanta o editar una existente. Incluye datos de identificación, medidas, estado, costo y proveedor. Valida que el código interno sea único.",
      },
      {
        nombre: "Asignar Llanta a Unidad",
        descripcion:
          "Muestra el esquema gráfico del chasis de la unidad seleccionada y permite elegir la posición exacta donde se montará la llanta. Valida que la posición no esté ya ocupada.",
      },
      {
        nombre: "Rotar Llanta",
        descripcion:
          "Permite mover una llanta de una posición a otra dentro de la misma unidad, o transferirla a otra unidad. Registra el motivo de la rotación y actualiza el historial.",
      },
      {
        nombre: "Registrar Renovado (Recapa)",
        descripcion:
          "Registra el envío de una llanta a renovar. Se captura el proveedor de renovado, costo, tipo de banda aplicada y fecha estimada de retorno. La llanta pasa a estado 'En Renovado'.",
      },
      {
        nombre: "Registrar Mantenimiento de Llanta",
        descripcion:
          "Captura intervenciones como reparación de ponchadura, balanceo, alineación o medición de huella. Registra costo, tipo de servicio y observaciones.",
      },
      {
        nombre: "Dar de Baja (Desecho)",
        descripcion:
          "Retira la llanta del inventario activo. Requiere justificación (desgaste total, daño lateral irreparable, estallamiento, robo). La llanta se marca como 'Desecho' y deja de aparecer en el inventario activo.",
      },
    ],
    faq: [
      {
        pregunta: "¿Cómo asigno una llanta a una unidad?",
        respuesta:
          "Desde el inventario de llantas, selecciona una llanta en estado 'Almacén' o 'Nueva' y haz clic en 'Asignar'. Elige la unidad destino y la posición en el chasis. La llanta cambiará su estado a 'Montada'.",
      },
      {
        pregunta:
          "¿Qué significa el indicador de color en la profundidad de huella?",
        respuesta:
          "Verde: profundidad ≥ 8mm (buena condición). Amarillo: entre 4mm y 7mm (desgaste moderado, planificar reemplazo). Rojo: ≤ 3mm (por debajo del mínimo legal, requiere cambio inmediato).",
      },
      {
        pregunta: "¿Cuántas veces se puede recapar una llanta?",
        respuesta:
          "Depende del fabricante y el estado del casco, pero generalmente se permiten entre 1 y 3 recapas. El sistema registra cada renovado para llevar el control. Al superar el límite recomendado, se sugiere dar de baja.",
      },
      {
        pregunta: "¿Qué pasa si doy de baja una llanta que está montada?",
        respuesta:
          "Primero debes desmontar la llanta de la unidad (retirarla de su posición). Una vez en estado 'Almacén', podrás proceder con la baja a 'Desecho'.",
      },
      {
        pregunta: "¿Cómo se calcula el costo por kilómetro de una llanta?",
        respuesta:
          "Se divide el costo total (adquisición + renovados + mantenimientos) entre los kilómetros acumulados. Este indicador permite comparar rendimiento entre marcas y modelos para decisiones de compra.",
      },
      {
        pregunta: "¿Qué es el código DOT?",
        respuesta:
          "Es un código estampado en la llanta por el fabricante que indica la semana y año de manufactura (ej. DOT 2523 = semana 25 del 2023). Sirve para verificar la antigüedad y evitar montar llantas con más de 5 años de fabricación.",
      },
    ],
    etiquetas: ["Básico", "Avanzado"],
  },
  {
    id: "viajes",
    titulo: "Viajes y Despacho",
    icono: "MapPin",
    descripcion:
      "El módulo de Viajes y Despacho es el núcleo operativo del sistema. Permite planificar, crear, despachar y dar seguimiento a todos los viajes de carga. Incluye un wizard paso a paso para la creación de viajes, asignación de unidad y operador, definición de rutas con origen-destino, generación de carta porte (CFDI 4.0 con complemento), seguimiento GPS en tiempo real y el proceso completo hasta la liquidación. Soporta configuraciones sencilla y full (ida y vuelta).",
    funcionalidades: [
      "Wizard de creación de viajes paso a paso (cliente, ruta, unidad, operador, carga)",
      "Configuración de viaje Sencillo o Full (ida y vuelta con doble carta porte)",
      "Asignación de tractocamión, remolque(s) y operador por viaje",
      "Definición de rutas con origen, destino y puntos intermedios",
      "Generación automática de carta porte complemento CFDI 4.0",
      "Captura de mercancías transportadas con clave SAT, peso y embalaje",
      "Seguimiento en tiempo real con integración GPS",
      "Control de estatus del viaje: Programado, En Tránsito, Entregado, Liquidado, Cancelado",
      "Registro de evidencias de entrega (fotos, firma digital)",
      "Cálculo automático de tarifa según ruta y cliente",
      "Panel de despacho con vista calendario y lista",
      "exportacion de viajes a Excel con filtros avanzados",
    ],
    campos: [
      {
        nombre: "Folio / Public ID",
        tipo: "texto",
        longitud: "15",
        requerido: true,
        descripcion:
          "Identificador único autogenerado del viaje (ej. TRP-00142)",
      },
      {
        nombre: "Cliente",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Cliente al que se facturará el servicio de transporte",
      },
      {
        nombre: "Origen",
        tipo: "texto",
        longitud: "200",
        requerido: true,
        descripcion: "Dirección o localidad de carga/origen del viaje",
      },
      {
        nombre: "Destino",
        tipo: "texto",
        longitud: "200",
        requerido: true,
        descripcion: "Dirección o localidad de entrega/destino del viaje",
      },
      {
        nombre: "Ruta",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion:
          "Ruta predefinida que incluye casetas, distancia y tiempo estimado",
      },
      {
        nombre: "Configuración",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Sencillo (solo ida) o Full (ida y vuelta)",
      },
      {
        nombre: "Tractocamión",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Unidad motriz asignada al viaje",
      },
      {
        nombre: "Remolque 1",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Primer remolque asignado",
      },
      {
        nombre: "Remolque 2",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion:
          "Segundo remolque (solo en configuración full o doble articulado)",
      },
      {
        nombre: "Operador",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Operador/chofer responsable del viaje",
      },
      {
        nombre: "Fecha Programada",
        tipo: "fecha",
        longitud: "—",
        requerido: true,
        descripcion: "Fecha y hora estimada de salida",
      },
      {
        nombre: "Fecha de Entrega",
        tipo: "fecha",
        longitud: "—",
        requerido: false,
        descripcion: "Fecha y hora real de entrega en destino",
      },
      {
        nombre: "Tarifa",
        tipo: "moneda",
        longitud: "12",
        requerido: true,
        descripcion: "Monto en MXN que se cobrará al cliente por el servicio",
      },
      {
        nombre: "Clave de Producto SAT",
        tipo: "texto",
        longitud: "8",
        requerido: true,
        descripcion: "Clave del catálogo SAT para la mercancía transportada",
      },
      {
        nombre: "Descripción de Mercancía",
        tipo: "texto",
        longitud: "500",
        requerido: true,
        descripcion: "Descripción detallada de la carga",
      },
      {
        nombre: "Peso (kg)",
        tipo: "número",
        longitud: "10",
        requerido: true,
        descripcion: "Peso bruto de la mercancía en kilogramos",
      },
      {
        nombre: "Estatus",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion:
          "Programado, En Tránsito, Entregado, Liquidado o Cancelado",
      },
    ],
    modales: [
      {
        nombre: "Wizard de Nuevo Viaje",
        descripcion:
          "Asistente de 5 pasos: 1) Selección de cliente y ruta, 2) Asignación de unidad y operador, 3) Captura de mercancías, 4) Configuración de tarifa, 5) Confirmación y despacho. Cada paso valida antes de avanzar.",
      },
      {
        nombre: "Asignar Unidad y Operador",
        descripcion:
          "Muestra las unidades disponibles (sin viaje activo) y los operadores libres. Permite filtrar por tipo de unidad y verificar documentos vigentes antes de asignar.",
      },
      {
        nombre: "Captura de Mercancías",
        descripcion:
          "Formulario para agregar una o más mercancías al viaje con clave SAT, descripción, peso, embalaje y cantidad. Calcula el peso total automáticamente.",
      },
      {
        nombre: "Registrar Evidencia de Entrega",
        descripcion:
          "Permite subir fotos de la mercancía entregada, comprobante de recepción firmado y notas del operador. Se vincula al viaje como prueba de cumplimiento.",
      },
      {
        nombre: "Cancelar Viaje",
        descripcion:
          "Diálogo de confirmación con campo obligatorio de motivo de cancelación. Si el viaje ya tiene carta porte emitida, se genera la solicitud de cancelación fiscal correspondiente.",
      },
      {
        nombre: "Generar Carta Porte",
        descripcion:
          "Genera el CFDI 4.0 con complemento carta porte. Valida que todos los datos requeridos por el SAT estén completos: mercancías, ubicaciones, autotransporte, operador y permisos SCT.",
      },
    ],
    faq: [
      {
        pregunta: "¿Cómo creo un viaje nuevo?",
        respuesta:
          "Desde el módulo de Despacho, haz clic en 'Nuevo Viaje'. Se abrirá un wizard de 5 pasos donde seleccionas cliente, ruta, unidad, operador, mercancías y tarifa. Al confirmar, el viaje queda en estatus 'Programado'.",
      },
      {
        pregunta: "¿Qué diferencia hay entre viaje Sencillo y Full?",
        respuesta:
          "Un viaje Sencillo es solo ida (un origen, un destino). Un viaje Full incluye ida y vuelta, generando dos tramos con sus respectivas cartas porte. El Full se usa cuando el operador regresa con carga del mismo o diferente cliente.",
      },
      {
        pregunta: "¿Puedo modificar un viaje que ya está en tránsito?",
        respuesta:
          "Solo ciertos campos son editables en tránsito: notas, fecha estimada de entrega y evidencias. No se puede cambiar la unidad, operador o mercancías una vez despachado. Para cambios mayores, se debe cancelar y crear uno nuevo.",
      },
      {
        pregunta: "¿Qué pasa si cancelo un viaje con carta porte emitida?",
        respuesta:
          "El sistema genera automáticamente la solicitud de cancelación del CFDI ante el SAT. Dependiendo del monto y antigüedad, puede requerir aceptación del receptor. El viaje se marca como 'Cancelado' y las unidades quedan liberadas.",
      },
      {
        pregunta: "¿Cómo funciona el seguimiento GPS?",
        respuesta:
          "Si la unidad tiene dispositivo GPS integrado, el mapa muestra su ubicación en tiempo real. Se actualiza cada 2-5 minutos y registra la ruta recorrida. También genera alertas de desvío de ruta o paradas no programadas.",
      },
      {
        pregunta: "¿Qué es la liquidación de un viaje?",
        respuesta:
          "Es el cierre financiero del viaje: se valida la tarifa cobrada, se descuentan anticipos al operador, se registran gastos de casetas y combustible, y se genera la cuenta por cobrar al cliente. Un viaje liquidado ya no puede modificarse.",
      },
    ],
    etiquetas: ["Básico", "Avanzado", "Facturación"],
  },
  {
    id: "mantenimiento",
    titulo: "Mantenimiento",
    icono: "Wrench",
    descripcion:
      "El módulo de Mantenimiento controla todas las intervenciones preventivas y correctivas de la flota. Permite programar servicios por kilometraje o fecha, registrar trabajos realizados con costos y refacciones, asignar mecánicos internos o talleres externos, y generar reportes de gasto por unidad. Las alertas automáticas avisan cuando una unidad requiere servicio próximo.",
    funcionalidades: [
      "Programación de mantenimientos preventivos por kilometraje o fecha",
      "Registro de mantenimientos correctivos con diagnóstico y solución",
      "Asignación de mecánicos internos o talleres externos",
      "Control de refacciones utilizadas con costo unitario",
      "Historial completo de mantenimientos por unidad",
      "Cálculo de costo total de mantenimiento por unidad, periodo y tipo",
      "Alertas automáticas de servicios próximos o vencidos",
      "Cambio automático de estatus de unidad a 'En Taller' al registrar mantenimiento activo",
      "Registro fotográfico de evidencias (antes y después)",
      "exportacion de reportes a Excel",
    ],
    campos: [
      {
        nombre: "Folio",
        tipo: "texto",
        longitud: "15",
        requerido: true,
        descripcion:
          "Identificador único de la orden de mantenimiento (autogenerado)",
      },
      {
        nombre: "Unidad",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Unidad vehicular que recibirá el mantenimiento",
      },
      {
        nombre: "Tipo",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Preventivo o Correctivo",
      },
      {
        nombre: "Categoría de Servicio",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion:
          "Ej. Motor, Frenos, Suspensión, Eléctrico, Carrocería, Llantas, Transmisión",
      },
      {
        nombre: "Descripción del Trabajo",
        tipo: "texto",
        longitud: "1000",
        requerido: true,
        descripcion: "Detalle de los trabajos realizados o por realizar",
      },
      {
        nombre: "Kilometraje al Servicio",
        tipo: "número",
        longitud: "10",
        requerido: true,
        descripcion: "Odómetro de la unidad al momento del mantenimiento",
      },
      {
        nombre: "Fecha de Inicio",
        tipo: "fecha",
        longitud: "—",
        requerido: true,
        descripcion: "Fecha en que inicia el mantenimiento",
      },
      {
        nombre: "Fecha de Fin",
        tipo: "fecha",
        longitud: "—",
        requerido: false,
        descripcion: "Fecha en que se completó el mantenimiento",
      },
      {
        nombre: "Mecánico / Taller",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion:
          "Mecánico interno asignado o taller externo que realiza el trabajo",
      },
      {
        nombre: "Costo de Mano de Obra",
        tipo: "moneda",
        longitud: "10",
        requerido: false,
        descripcion: "Costo del servicio de mano de obra en MXN",
      },
      {
        nombre: "Costo de Refacciones",
        tipo: "moneda",
        longitud: "10",
        requerido: false,
        descripcion: "Costo total de las refacciones utilizadas",
      },
      {
        nombre: "Costo Total",
        tipo: "moneda",
        longitud: "12",
        requerido: false,
        descripcion:
          "Suma de mano de obra + refacciones (calculado automáticamente)",
      },
      {
        nombre: "Próximo Servicio (km)",
        tipo: "número",
        longitud: "10",
        requerido: false,
        descripcion:
          "Kilometraje programado para el siguiente servicio preventivo",
      },
      {
        nombre: "Próximo Servicio (fecha)",
        tipo: "fecha",
        longitud: "—",
        requerido: false,
        descripcion: "Fecha programada para el siguiente servicio",
      },
      {
        nombre: "Estatus",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Programado, En Proceso, Completado o Cancelado",
      },
    ],
    modales: [
      {
        nombre: "Crear Orden de Mantenimiento",
        descripcion:
          "Formulario para registrar un nuevo mantenimiento. Selecciona la unidad, tipo (preventivo/correctivo), categoría de servicio, mecánico y captura los costos. Al guardar, la unidad cambia a estatus 'En Taller' automáticamente.",
      },
      {
        nombre: "Agregar Refacciones",
        descripcion:
          "Lista de refacciones utilizadas con nombre, número de parte, cantidad, costo unitario y proveedor. Calcula el subtotal automáticamente y lo suma al costo total del mantenimiento.",
      },
      {
        nombre: "Completar Mantenimiento",
        descripcion:
          "Cierra la orden de mantenimiento: registra fecha de fin, notas finales y programa el próximo servicio (por km o fecha). La unidad regresa a estatus 'Activa'.",
      },
      {
        nombre: "Subir Evidencias",
        descripcion:
          "Permite cargar fotos del antes y después del mantenimiento. Útil para documentar el estado de la pieza dañada y el trabajo terminado.",
      },
      {
        nombre: "Programar Servicio Preventivo",
        descripcion:
          "Crea una alerta futura: define unidad, tipo de servicio, kilometraje o fecha objetivo. El sistema notificará cuando la unidad se acerque al umbral programado.",
      },
    ],
    faq: [
      {
        pregunta: "¿Cómo programo un mantenimiento preventivo?",
        respuesta:
          "Desde el módulo de Mantenimiento, haz clic en 'Programar Servicio'. Selecciona la unidad, tipo de servicio y define el criterio: cada X kilómetros o cada X meses. El sistema generará alertas automáticas cuando se acerque la fecha o kilometraje.",
      },
      {
        pregunta: "¿Qué pasa con la unidad mientras está en mantenimiento?",
        respuesta:
          "La unidad cambia automáticamente a estatus 'En Taller' y no aparece como disponible para asignar viajes. Al completar el mantenimiento, regresa a 'Activa'.",
      },
      {
        pregunta:
          "¿Puedo registrar mantenimientos realizados en talleres externos?",
        respuesta:
          "Sí. Al crear la orden, selecciona 'Taller Externo' como responsable y captura el nombre del taller, dirección y factura del servicio. Todo queda vinculado al historial de la unidad.",
      },
      {
        pregunta: "¿Cómo veo cuánto he gastado en mantenimiento por unidad?",
        respuesta:
          "En el detalle de cada unidad hay una pestaña 'Mantenimientos' con el historial completo y un resumen de costos acumulados. También puedes usar los filtros del módulo principal para agrupar por unidad y periodo.",
      },
      {
        pregunta: "¿Qué categorías de servicio existen?",
        respuesta:
          "Las categorías predefinidas son: Motor, Frenos, Suspensión, Sistema Eléctrico, Carrocería, Llantas, Transmisión, Sistema de Escape, Aire Acondicionado y Otros. Pueden configurarse más desde Ajustes.",
      },
      {
        pregunta: "¿Se pueden cancelar órdenes de mantenimiento?",
        respuesta:
          "Sí. Si el mantenimiento aún no se ha completado, puedes cancelar la orden con un motivo. La unidad regresará a su estatus anterior. Los costos registrados hasta ese momento se conservan en el historial.",
      },
    ],
    etiquetas: ["Básico", "Avanzado"],
  },
  {
    id: "combustible",
    titulo: "Combustible",
    icono: "Fuel",
    descripcion:
      "El módulo de Combustible registra y controla todas las cargas de diésel y gasolina de la flota. Permite capturar cada carga con litros, monto, estación y odómetro, calcular el rendimiento por unidad y operador (km/litro), conciliar cargas contra estados de cuenta de tarjetas de combustible y detectar anomalías de consumo. Es fundamental para el control de costos operativos.",
    funcionalidades: [
      "Registro de cargas con litros, precio por litro, monto total, estación y odómetro",
      "Cálculo automático de rendimiento km/litro por unidad y por operador",
      "Conciliación de cargas contra estados de cuenta de tarjetas (GasLink, EdenRed, etc.)",
      "Detección de anomalías: consumo excesivo, cargas duplicadas, odómetro inconsistente",
      "Dashboard con gráficas de consumo por periodo, unidad y ruta",
      "Asignación de cargas a viajes específicos para costeo",
      "Registro de cargas en efectivo vs. tarjeta de combustible",
      "Alertas de rendimiento por debajo del umbral esperado",
      "importacion masiva de cargas desde archivos CSV del proveedor de tarjetas",
      "exportacion de reportes de consumo a Excel",
    ],
    campos: [
      {
        nombre: "Folio de Carga",
        tipo: "texto",
        longitud: "15",
        requerido: true,
        descripcion: "Identificador único de la carga (autogenerado)",
      },
      {
        nombre: "Unidad",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Unidad vehicular que recibió la carga",
      },
      {
        nombre: "Operador",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Operador que realizó la carga",
      },
      {
        nombre: "Fecha y Hora",
        tipo: "fecha",
        longitud: "—",
        requerido: true,
        descripcion: "Fecha y hora en que se realizó la carga",
      },
      {
        nombre: "Estación / Gasolinera",
        tipo: "texto",
        longitud: "150",
        requerido: true,
        descripcion: "Nombre o razón social de la estación de servicio",
      },
      {
        nombre: "Tipo de Combustible",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Diésel, Magna o Premium",
      },
      {
        nombre: "Litros",
        tipo: "número",
        longitud: "8",
        requerido: true,
        descripcion: "Cantidad de litros cargados",
      },
      {
        nombre: "Precio por Litro",
        tipo: "moneda",
        longitud: "6",
        requerido: true,
        descripcion: "Precio unitario del combustible en MXN",
      },
      {
        nombre: "Monto Total",
        tipo: "moneda",
        longitud: "10",
        requerido: true,
        descripcion:
          "Importe total de la carga (litros × precio, calculado automáticamente)",
      },
      {
        nombre: "Odómetro",
        tipo: "número",
        longitud: "10",
        requerido: true,
        descripcion: "Lectura del odómetro al momento de la carga",
      },
      {
        nombre: "Método de Pago",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Tarjeta de combustible, Efectivo o Transferencia",
      },
      {
        nombre: "Número de Tarjeta",
        tipo: "texto",
        longitud: "20",
        requerido: false,
        descripcion: "Últimos 4 dígitos de la tarjeta de combustible utilizada",
      },
      {
        nombre: "Viaje Asociado",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion: "Viaje al que se asigna esta carga para costeo",
      },
      {
        nombre: "Estado de Conciliación",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion: "Pendiente, Conciliado o Discrepancia",
      },
    ],
    modales: [
      {
        nombre: "Registrar Carga de Combustible",
        descripcion:
          "Formulario para capturar una nueva carga. Selecciona unidad y operador, captura litros, precio, odómetro y estación. El monto total se calcula automáticamente. Valida que el odómetro sea mayor al de la última carga registrada.",
      },
      {
        nombre: "Conciliar Cargas",
        descripcion:
          "Importa el estado de cuenta del proveedor de tarjetas (CSV) y lo compara con las cargas registradas en el sistema. Resalta discrepancias en monto, litros o fecha para revisión manual.",
      },
      {
        nombre: "Reporte de Rendimiento",
        descripcion:
          "Muestra el rendimiento km/litro por unidad en un periodo seleccionado. Compara contra el promedio de la flota y resalta unidades con rendimiento anormal (posible fuga o problema mecánico).",
      },
      {
        nombre: "Importar Cargas Masivas",
        descripcion:
          "Permite subir un archivo CSV con múltiples cargas de combustible. Mapea las columnas del archivo a los campos del sistema y valida cada registro antes de importar.",
      },
      {
        nombre: "Detalle de Anomalía",
        descripcion:
          "Muestra el detalle de una carga flaggeada como anómala: consumo excesivo, carga duplicada u odómetro inconsistente. Permite marcarla como revisada o crear una incidencia.",
      },
    ],
    faq: [
      {
        pregunta: "¿Cómo se calcula el rendimiento km/litro?",
        respuesta:
          "Se toma la diferencia de odómetro entre dos cargas consecutivas y se divide entre los litros de la segunda carga. Ejemplo: si el odómetro pasó de 50,000 a 52,400 km y se cargaron 400 litros, el rendimiento es 2,400/400 = 6.0 km/litro.",
      },
      {
        pregunta: "¿Qué pasa si el odómetro registrado es menor al anterior?",
        respuesta:
          "El sistema lo marca como anomalía de odómetro inconsistente. Esto puede deberse a un error de captura o a un cambio de tablero. Se debe revisar y corregir manualmente o justificar.",
      },
      {
        pregunta: "¿Cómo concilio las cargas con el estado de cuenta?",
        respuesta:
          "Desde el módulo de Conciliación, sube el CSV del proveedor de tarjetas. El sistema cruza automáticamente por fecha, monto y número de tarjeta. Las cargas que coinciden se marcan como 'Conciliadas', las que no se marcan como 'Discrepancia' para revisión.",
      },
      {
        pregunta: "¿Puedo registrar cargas en efectivo?",
        respuesta:
          "Sí. Al registrar la carga, selecciona 'Efectivo' como método de pago. Estas cargas no participan en el proceso de conciliación con tarjetas pero sí se incluyen en el cálculo de rendimiento y costos.",
      },
      {
        pregunta: "¿Cómo importo cargas masivas?",
        respuesta:
          "Haz clic en 'Importar CSV'. Selecciona el archivo del proveedor de tarjetas, mapea las columnas (fecha, monto, litros, estación) y el sistema validará cada registro. Los registros con errores se muestran para corrección antes de confirmar la importacion.",
      },
      {
        pregunta: "¿Qué se considera un rendimiento anormal?",
        respuesta:
          "Cada tipo de unidad tiene un rango de rendimiento esperado (ej. tractocamión: 2.5-4.0 km/litro). Si una carga produce un rendimiento fuera de ese rango, se marca como anomalía para investigar posibles causas: fuga, problema mecánico o error de captura.",
      },
    ],
    etiquetas: ["Básico", "Avanzado"],
  },
  {
    id: "finanzas",
    titulo: "Finanzas",
    icono: "DollarSign",
    descripcion:
      "El módulo de Finanzas centraliza la gestión financiera de la empresa: Cuentas por Cobrar (seguimiento de facturas emitidas a clientes), Cuentas por Pagar (obligaciones con proveedores y operadores), Tesorería (control de flujo de efectivo, cuentas bancarias y movimientos) y un Dashboard Financiero con KPIs clave. Permite tener visión completa de la salud financiera del negocio.",
    funcionalidades: [
      "Cuentas por Cobrar con aging report (corriente, 30, 60, 90+ días)",
      "Registro y seguimiento de pagos parciales y complementos de pago",
      "Cuentas por Pagar a proveedores con control de vencimientos",
      "Liquidación de viajes con desglose de ingresos y gastos",
      "Tesorería: saldos de cuentas bancarias y movimientos de efectivo",
      "Registro de ingresos y egresos con clasificación contable",
      "Dashboard financiero con KPIs: ingresos, utilidad, margen, cartera vencida",
      "Gráficas de tendencia de ingresos vs. egresos por periodo",
      "Conciliación bancaria manual",
      "exportacion de reportes financieros a Excel",
    ],
    campos: [
      {
        nombre: "Folio de Documento",
        tipo: "texto",
        longitud: "20",
        requerido: true,
        descripcion:
          "Folio de la factura, nota de crédito o complemento de pago",
      },
      {
        nombre: "Tipo",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Factura, Nota de Crédito, Complemento de Pago, Gasto",
      },
      {
        nombre: "Cliente / Proveedor",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Entidad asociada al movimiento financiero",
      },
      {
        nombre: "Concepto",
        tipo: "texto",
        longitud: "300",
        requerido: true,
        descripcion: "Descripción del concepto facturado o del gasto",
      },
      {
        nombre: "Monto",
        tipo: "moneda",
        longitud: "14",
        requerido: true,
        descripcion:
          "Importe total del documento en MXN (sin IVA o con IVA según configuración)",
      },
      {
        nombre: "IVA",
        tipo: "moneda",
        longitud: "12",
        requerido: false,
        descripcion: "Monto del IVA desglosado",
      },
      {
        nombre: "Total",
        tipo: "moneda",
        longitud: "14",
        requerido: true,
        descripcion: "Monto + IVA (calculado automáticamente)",
      },
      {
        nombre: "Fecha de Emisión",
        tipo: "fecha",
        longitud: "—",
        requerido: true,
        descripcion: "Fecha en que se emitió el documento",
      },
      {
        nombre: "Fecha de Vencimiento",
        tipo: "fecha",
        longitud: "—",
        requerido: true,
        descripcion: "Fecha límite de pago según días de crédito del cliente",
      },
      {
        nombre: "Estatus de Pago",
        tipo: "select",
        longitud: "—",
        requerido: true,
        descripcion: "Pendiente, Parcial, Pagado o Cancelado",
      },
      {
        nombre: "Saldo Pendiente",
        tipo: "moneda",
        longitud: "14",
        requerido: false,
        descripcion:
          "Monto que falta por cobrar o pagar (calculado automáticamente)",
      },
      {
        nombre: "Viaje Asociado",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion: "Viaje o viajes vinculados a este documento",
      },
      {
        nombre: "Cuenta Bancaria",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion: "Cuenta bancaria donde se recibió o realizó el pago",
      },
      {
        nombre: "Método de Pago",
        tipo: "select",
        longitud: "—",
        requerido: false,
        descripcion: "Transferencia, Cheque, Efectivo, Tarjeta",
      },
    ],
    modales: [
      {
        nombre: "Registrar Pago Recibido",
        descripcion:
          "Captura un pago de cliente: selecciona las facturas a liquidar, monto recibido, cuenta bancaria y método de pago. Soporta pagos parciales que dejan saldo pendiente y pagos múltiples a varias facturas.",
      },
      {
        nombre: "Registrar Pago a Proveedor",
        descripcion:
          "Registra el pago de una cuenta por pagar: selecciona el proveedor, factura(s) a pagar, monto, cuenta bancaria de salida y referencia de transferencia.",
      },
      {
        nombre: "Liquidar Viaje",
        descripcion:
          "Cierre financiero de un viaje: muestra ingresos (tarifa), gastos (combustible, casetas, anticipos al operador) y calcula la utilidad neta. Genera la cuenta por cobrar al cliente.",
      },
      {
        nombre: "Generar Complemento de Pago",
        descripcion:
          "Crea el CFDI de complemento de pago (REP) para facturas PPD. Vincula el pago recibido con las facturas correspondientes y genera el XML para timbrado.",
      },
      {
        nombre: "Registrar Movimiento de Tesorería",
        descripcion:
          "Captura un ingreso o egreso directo en tesorería: transferencias entre cuentas, retiros de efectivo, depósitos, comisiones bancarias y otros movimientos no vinculados a facturas.",
      },
      {
        nombre: "Detalle de Aging Report",
        descripcion:
          "Vista expandida del reporte de antigüedad de cartera. Muestra cada factura pendiente agrupada por cliente y clasificada por días de vencimiento con totales y porcentajes.",
      },
    ],
    faq: [
      {
        pregunta: "¿Qué es el aging report?",
        respuesta:
          "Es un reporte que clasifica las cuentas por cobrar según su antigüedad: Corriente (no vencida), 1-30 días vencida, 31-60 días, 61-90 días y más de 90 días. Ayuda a priorizar la cobranza y detectar clientes morosos.",
      },
      {
        pregunta: "¿Cómo registro un pago parcial?",
        respuesta:
          "Al registrar un pago, ingresa un monto menor al total de la factura. El sistema calculará automáticamente el saldo pendiente. La factura cambiará a estatus 'Parcial' y seguirá apareciendo en cuentas por cobrar por el monto restante.",
      },
      {
        pregunta: "¿Qué es un complemento de pago?",
        respuesta:
          "Es un CFDI tipo 'P' (Pago) que se emite cuando una factura fue emitida con método de pago PPD (Pago en Parcialidades o Diferido). Se genera al recibir cada pago y vincula el monto recibido con la factura original. Es obligatorio fiscalmente.",
      },
      {
        pregunta: "¿Cómo funciona la liquidación de viajes?",
        respuesta:
          "Al liquidar un viaje se hace el cierre financiero: se suman los ingresos (tarifa al cliente), se restan los gastos (combustible, casetas, anticipos al operador, viáticos) y se obtiene la utilidad neta del viaje. Se genera automáticamente la cuenta por cobrar.",
      },
      {
        pregunta: "¿Puedo tener varias cuentas bancarias?",
        respuesta:
          "Sí. En Tesorería puedes registrar múltiples cuentas bancarias con su banco, número de cuenta, CLABE y saldo. Cada movimiento (pago recibido, pago a proveedor, transferencia) se vincula a una cuenta específica para mantener los saldos actualizados.",
      },
      {
        pregunta: "¿Cómo veo la utilidad por viaje o por cliente?",
        respuesta:
          "En el Dashboard Financiero puedes filtrar por periodo y agrupar por viaje, cliente, ruta u operador. Cada vista muestra ingresos, gastos y margen de utilidad. También puedes exportar estos reportes a Excel para análisis más detallado.",
      },
    ],
    etiquetas: ["Avanzado", "Administración", "Facturación"],
  },
];
