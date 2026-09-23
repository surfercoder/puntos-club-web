// Fuente de verdad de las claves. `en.ts` esta tipado contra este objeto, asi
// que agregar un mensaje aca y olvidarse del ingles rompe el type-check.
export const es = {
  // --- Comunes -------------------------------------------------------------
  'common.ok': 'OK',
  'common.cancel': 'Cancelar',
  'common.close': 'Cerrar',
  'common.back': 'Volver',
  'common.error': 'Error',
  'common.success': 'Listo',
  'common.loading': 'Cargando...',
  'common.points': 'puntos',
  'common.pts': 'pts',
  'common.clearSearch': 'Borrar búsqueda',
  'common.noResults': 'Sin resultados',

  // --- Errores -------------------------------------------------------------
  // Nunca exponen el detalle del servidor: dicen el motivo y que hacer.
  'error.unexpected': 'Ocurrió un error inesperado. Intentá nuevamente.',
  'error.network':
    'No pudimos conectarnos. Revisá tu conexión a internet e intentá de nuevo.',

  'error.auth.invalidCredentials':
    'El email o la contraseña no son correctos. Revisalos e intentá de nuevo.',
  'error.auth.emailNotConfirmed':
    'Todavía no confirmaste tu email. Buscá el correo que te enviamos y tocá el enlace para activar tu cuenta.',
  'error.auth.emailExists': 'Ya existe una cuenta registrada con ese email.',
  'error.auth.weakPassword':
    'La contraseña es demasiado débil. Usá al menos 6 caracteres combinando letras y números.',
  'error.auth.samePassword':
    'La contraseña nueva tiene que ser distinta de la actual.',
  'error.auth.emailInvalid': 'Ese email no es válido. Revisá cómo lo escribiste.',
  'error.auth.validationFailed':
    'Faltan datos o alguno no es válido. Revisá el formulario e intentá de nuevo.',
  'error.auth.signupDisabled':
    'El registro no está disponible en este momento. Probá más tarde.',
  'error.auth.userBanned':
    'Esta cuenta está suspendida. Escribinos para recuperar el acceso.',
  'error.auth.userNotFound': 'No encontramos una cuenta con ese email.',
  'error.auth.linkExpired':
    'El enlace venció o ya se usó. Pedí uno nuevo e intentá otra vez.',
  'error.auth.sessionExpired':
    'Tu sesión expiró. Volvé a iniciar sesión para continuar.',
  'error.auth.captchaFailed':
    'No pudimos verificar que seas una persona. Intentá de nuevo.',
  'error.auth.reauthNeeded':
    'Por seguridad, volvé a iniciar sesión antes de hacer este cambio.',
  'error.auth.rateLimit':
    'Hiciste demasiados intentos seguidos. Esperá un momento antes de volver a probar.',
  'error.auth.rateLimitSeconds':
    'Por seguridad, esperá {seconds} segundos antes de volver a intentarlo.',
  'error.auth.notBeneficiary':
    'Esta cuenta no está registrada como usuario final. Usá la app que corresponde a tu cuenta.',
  'error.auth.noPermission': 'Esta cuenta no tiene permisos de usuario final.',
  'error.auth.documentExists': 'Ya existe una cuenta registrada con ese DNI.',
  'error.auth.emailOrDocumentExists':
    'Ya existe una cuenta registrada con ese email o ese DNI.',
  'error.auth.signUpFailed':
    'No pudimos crear tu cuenta. Intentá nuevamente en unos minutos.',

  'error.db.duplicate': 'Ese dato ya está registrado. Revisalo e intentá de nuevo.',
  'error.db.inUse':
    'No se puede completar la operación porque este dato está en uso.',
  'error.db.missingField': 'Faltan datos obligatorios. Revisá el formulario.',
  'error.db.invalidValue': 'Alguno de los datos no es válido. Revisalo e intentá de nuevo.',
  'error.db.forbidden': 'No tenés permiso para hacer esta acción.',
  'error.db.notFound': 'No encontramos lo que buscabas.',

  'error.rpc.insufficientPoints': 'No tenés puntos suficientes para este producto.',
  'error.rpc.outOfStock': 'Este producto se quedó sin stock.',
  'error.rpc.membershipInactive':
    'Tu membresía con esta organización no está activa.',
  'error.rpc.alreadyDelivered': 'Este canje ya fue entregado.',

  'error.noSession': 'No hay una sesión activa. Volvé a iniciar sesión.',
  'error.join.alreadyMember': 'Ya perteneces a esta organización.',
  'error.join.notAvailable':
    'No es posible unirse a esta organización en este momento.',
  'error.join.reactivateFailed':
    'No pudimos reactivar tu membresía. Intentá nuevamente.',
  'error.join.failed':
    'No pudimos unirte a la organización. Intentá nuevamente.',

  // --- Notificaciones ------------------------------------------------------
  // El canal se ve con este nombre en Ajustes > Notificaciones de Android.
  'notifications.channelName': 'Puntos y canjes',

  // --- Pantalla no encontrada ---------------------------------------------
  'notFound.title': 'No encontrado',
  'notFound.message': 'No pudimos abrir esta pantalla.',
  'notFound.action': 'Ir al inicio',

  // --- Barra de navegación -------------------------------------------------
  'tabs.home': 'Inicio',
  'tabs.explore': 'Explorar',
  'tabs.history': 'Historial',
  'tabs.more': 'Más',
  'tabs.scan': 'Escanear',

  // --- Ingreso -------------------------------------------------------------
  'signIn.title': '¡Bienvenido de nuevo!',
  'signIn.subtitle': 'Inicia sesión para continuar acumulando beneficios',
  'signIn.email': 'Email',
  'signIn.emailPlaceholder': 'tu@email.com',
  'signIn.password': 'Contraseña',
  'signIn.passwordPlaceholder': 'Tu contraseña',
  'signIn.showPassword': 'Mostrar contraseña',
  'signIn.hidePassword': 'Ocultar contraseña',
  'signIn.forgot': '¿Olvidaste tu contraseña?',
  'signIn.submit': 'Iniciar Sesión',
  'signIn.divider': 'o continuá con',
  'signIn.biometric': 'Usar huella digital',
  'signIn.biometricPill': 'Rápido y seguro',
  'signIn.noAccountTitle': '¿No tienes una cuenta?',
  'signIn.noAccountText':
    'Únete a Puntos Club y comienza a disfrutar de todos los beneficios.',
  'signIn.signUpLink': 'Regístrate',
  'signIn.missingFields': 'Por favor completá todos los campos.',
  'signIn.feature.secureTitle': 'Seguro',
  'signIn.feature.secureText': 'Tus datos están protegidos',
  'signIn.feature.easyTitle': 'Fácil',
  'signIn.feature.easyText': 'Acumula y canjea tus puntos',
  'signIn.feature.benefitsTitle': 'Beneficios',
  'signIn.feature.benefitsText': 'Descuentos y premios exclusivos',

  'biometric.title': 'Huella digital',
  'biometric.offer': '¿Querés usar tu huella para ingresar la próxima vez?',
  'biometric.later': 'Ahora no',
  'biometric.enable': 'Activar',
  'biometric.notReady':
    'Ingresá una vez con tu email y contraseña para activar el ingreso con huella.',
  'biometric.prompt': 'Ingresá con tu huella digital',

  'forgot.title': 'Recuperar contraseña',
  'forgot.needEmail': 'Escribí tu email arriba y volvé a tocar el enlace.',
  'forgot.sent':
    'Te enviamos un email con el link para crear una nueva contraseña.',

  // --- Alta ----------------------------------------------------------------
  'signUp.header': 'Crear Cuenta',
  'signUp.subtitle':
    'Únete a PuntosClub y empieza a disfrutar\nde todos los beneficios',
  'signUp.firstName': 'Nombre *',
  'signUp.firstNamePlaceholder': 'Juan',
  'signUp.lastName': 'Apellido *',
  'signUp.lastNamePlaceholder': 'Perez',
  'signUp.email': 'Email *',
  'signUp.phone': 'Teléfono',
  'signUp.phonePlaceholder': '+54 11 1234-5678',
  'signUp.document': 'DNI / Documento',
  'signUp.documentPlaceholder': '12345678',
  'signUp.password': 'Contraseña *',
  'signUp.passwordPlaceholder': 'Mínimo 6 caracteres',
  'signUp.confirmPassword': 'Confirmar Contraseña *',
  'signUp.confirmPasswordPlaceholder': 'Repite tu contraseña',
  'signUp.showConfirmPassword': 'Mostrar confirmación de contraseña',
  'signUp.hideConfirmPassword': 'Ocultar confirmación de contraseña',
  'signUp.address': 'Dirección *',
  'signUp.noticeTitle': 'Tu información está segura',
  'signUp.noticeText':
    'Protegemos tus datos personales y nunca los compartimos con terceros.',
  'signUp.legalTitle': 'Antes de continuar',
  'signUp.legalText':
    'Para crear tu cuenta PuntosClub necesitás aceptar nuestros Términos y Condiciones y conocer nuestra Política de Privacidad.',
  'signUp.acceptTerms': 'Acepto los Términos y Condiciones de PuntosClub',
  'signUp.viewTerms': 'Ver Términos',
  'signUp.readPrivacy': 'He leído la Política de Privacidad',
  'signUp.viewPrivacy': 'Ver Política de Privacidad',
  'signUp.optional': 'Opcional',
  'signUp.marketing': 'Quiero recibir promociones y novedades de PuntosClub',
  'signUp.submit': 'Crear Cuenta',
  'signUp.haveAccount': '¿Ya tienes una cuenta? ',
  'signUp.signInLink': 'Inicia Sesión',
  'signUp.missingFields': 'Por favor completá todos los campos obligatorios.',
  'signUp.passwordMismatch': 'Las contraseñas no coinciden.',
  'signUp.passwordTooShort': 'La contraseña debe tener al menos 6 caracteres.',
  'signUp.missingAddressTitle': 'Falta tu dirección',
  'signUp.missingAddressBody': 'Completá {fields} para crear la cuenta.',
  'signUp.missingConsentTitle': 'Falta tu aceptación',
  'signUp.missingConsentBody':
    'Para crear la cuenta necesitás aceptar los Términos y Condiciones y confirmar que leíste la Política de Privacidad.',
  'signUp.createdTitle': 'Revisá tu email',
  'signUp.createdBody':
    'Te enviamos un correo para confirmar tu cuenta. Tocá el enlace del mail y después iniciá sesión.',

  // --- Documentos legales --------------------------------------------------
  'legal.terms': 'Términos y Condiciones',
  'legal.privacy': 'Política de Privacidad',
  // Los documentos legales solo existen en español: una version inglesa no
  // revisada seria igual de vinculante y nadie la aprobo.
  'legal.spanishOnly':
    'This document is available in Spanish only. Ask us for a certified translation if you need one.',

  // --- Dirección -----------------------------------------------------------
  'address.street': 'Calle',
  'address.streetPlaceholder': 'Nombre de la calle',
  'address.number': 'Número',
  'address.numberPlaceholder': 'Número',
  'address.city': 'Ciudad',
  'address.cityPlaceholder': 'Ciudad',
  'address.state': 'Provincia/Estado',
  'address.statePlaceholder': 'Provincia o Estado',
  'address.zip': 'Código Postal',
  'address.zipPlaceholder': 'Código Postal',
  'address.searchPlaceholder': 'Buscar dirección...',
  'address.searchWithGoogle': 'Buscar con Google Maps',
  'address.enterManually': 'Ingresar manualmente',
  'address.hintTitle': 'Ingresa tu dirección fácilmente',
  'address.hintBody': 'Podés buscar tu dirección o ingresarla manualmente.',
  // Se listan en el aviso de "falta tu dirección", en minúscula.
  'address.field.street': 'calle',
  'address.field.number': 'número',
  'address.field.city': 'ciudad',
  'address.field.state': 'provincia',
  'address.field.zip': 'código postal',

  // --- Inicio --------------------------------------------------------------
  'home.greeting': '¡Hola, {name}! 👋',
  'home.defaultUser': 'Usuario',
  'home.greetingSub': 'Escaneá el QR para\nampliar tus beneficios',
  'home.pointsLabel': 'Mis puntos disponibles',
  'home.expandQr': 'Ampliar mi código QR',
  'home.scanQr': 'Escanear QR',
  'home.myOrganizations': 'Mis organizaciones',
  'home.memberSince': 'Miembro desde {date}',
  'home.organization': 'Organización',
  'home.emptyTitle': 'Todavía no perteneces a ninguna organización.',
  'home.emptyBody': 'Explorá organizaciones para empezar a acumular puntos.',
  'home.exploreTitle': 'Explorar organizaciones',
  'home.exploreBody': 'Descubrí nuevas tiendas y empezá a acumular puntos',
  'home.exploreAction': 'Explorar',
  'home.quickActions': 'Accesos rápidos',
  'home.quick.earn': '¿Cómo\nacumulo?',
  'home.quick.redeem': '¿Cómo\ncanjeo?',
  'home.quick.promos': 'Promociones',
  'home.quick.help': 'Ayuda',
  'home.quick.news': 'Novedades',
  'home.account': 'Tu cuenta',
  'home.editProfile': 'Editar perfil',
  'home.name': 'Nombre',
  'home.email': 'Email',
  'home.phone': 'Teléfono',
  'home.document': 'DNI',
  'home.qrModalTitle': 'Tu código QR',
  'home.qrModalSubtitle': 'Mostrá este código al cajero para acumular puntos',

  'signOut.action': 'Cerrar sesión',
  'signOut.confirmTitle': 'Cerrar sesión',
  'signOut.confirmBody': '¿Estás seguro que deseas cerrar sesión?',

  // --- Explorar ------------------------------------------------------------
  'explore.title': 'Explorar',
  'explore.scanQr': 'Escanear QR',
  'explore.heroTitle': '¡Descubrí nuevas\norganizaciones!',
  'explore.heroSubtitle': 'Sumate escaneando un QR\no buscando en la lista.',
  'explore.searchPlaceholder': 'Buscar organizaciones...',
  'explore.qrCardTitle': 'Escanear QR',
  'explore.qrCardSubtitle':
    'Escaneá el QR de una organización\npara unirte rápidamente',
  'explore.qrCardLabel': 'Escanear el QR de una organización',
  'explore.available': 'Organizaciones disponibles',
  'explore.countOne': '1 organización encontrada',
  'explore.countMany': '{count} organizaciones encontradas',
  'explore.member': 'Miembro',
  'explore.join': 'Unirse',
  'explore.emptySearch': 'No se encontraron organizaciones con ese nombre.',
  'explore.empty': 'No hay organizaciones disponibles.',
  'explore.helpTitle': '¿No encontrás tu organización?',
  'explore.helpBody': 'Pedí el código QR a la empresa\no institución para unirte.',

  'join.confirmTitle': 'Unirse a {name}',
  'join.confirmBody':
    '¿Querés unirte a {name} para empezar a acumular puntos?',
  'join.action': 'Unirse',
  'join.successTitle': '¡Listo!',
  'join.successBody':
    'Te uniste a {name}. Ya podés empezar a acumular puntos.',
  'join.viewOrganization': 'Ver organización',

  // --- Escaneo de QR -------------------------------------------------------
  'scan.permissionTitle': 'Permiso de cámara',
  'scan.permissionBody':
    'Necesitamos acceso a la cámara para escanear códigos QR de organizaciones.',
  'scan.permissionAction': 'Dar permiso',
  'scan.instruction': 'Escaneá el código QR de la organización',
  'scan.instructionSub': 'Buscá el QR en el local o preguntá al personal',
  'scan.invalidQr':
    'Código QR no válido. Escaneá el QR de una organización.',
  'scan.unreadableQr':
    'No pudimos leer el código QR. Asegurate de escanear un QR válido de organización.',
  'scan.thisOrganization': 'esta organización',

  // --- Perfil --------------------------------------------------------------
  'profile.header': 'Mi Perfil',
  'profile.title': 'Mi Perfil',
  'profile.subtitle': 'Actualizá tu información personal',
  'profile.firstName': 'Nombre',
  'profile.lastName': 'Apellido',
  'profile.email': 'Email',
  'profile.phone': 'Teléfono',
  'profile.document': 'DNI',
  'profile.address': 'Dirección (Opcional)',
  'profile.save': 'Guardar Cambios',
  'profile.saveFailed': 'No pudimos actualizar tu perfil. Intentá nuevamente.',
  'profile.savedTitle': '¡Listo!',
  'profile.savedBody': 'Tu perfil se actualizó correctamente.',
  'profile.emailChangedTitle': 'Email actualizado',
  'profile.emailChangedBody':
    'Revisá tu nuevo correo electrónico para confirmar el cambio.',
  'profile.language': 'Idioma',
  'profile.languageEs': 'Español',
  'profile.languageEn': 'English',

  // --- Detalle de organización --------------------------------------------
  'org.loading': 'Cargando...',
  'org.notFound': 'No encontrado',
  'org.notFoundBody': 'No encontramos tu membresía con esta organización.',
  'org.fallbackName': 'Organización',
  'org.companyInfo': 'Info de la empresa',
  'org.noAddress': 'Sin dirección cargada',
  'org.noContactData':
    'Esta organización todavía no cargó sus datos de contacto.',
  'org.pointsLabel': 'Tus puntos disponibles',
  'org.stats': 'Estadísticas',
  'org.history': 'Historial',
  'org.pointsEarned': 'Puntos ganados',
  'org.pointsRedeemed': 'Puntos canjeados',
  'org.pointsAvailable': 'Puntos disponibles',
  'org.membershipInfo': 'Información de membresía',
  'org.memberSince': 'Miembro desde',
  'org.status': 'Estado',
  'org.active': 'Activo',
  'org.inactive': 'Inactivo',
  'org.category': 'Categoría',
  'org.memberId': 'ID de miembro',
  'org.loadingOffers': 'Cargando promociones...',
  'org.activeOffers': 'Promociones activas',
  'org.rewardsTitle': 'Canjeá tus puntos',
  'org.rewardsSubtitle': 'Descubrí todos los premios disponibles',
  'org.seeAll': 'Ver todos',
  'org.loadingRewards': 'Cargando premios...',
  'org.rewardsError':
    'No pudimos cargar los premios. Revisá tu conexión y volvé a entrar.',
  'org.rewardsEmpty': 'Todavía no hay premios para canjear. Seguí sumando puntos.',
  'org.unfollow': 'Dejar de seguir organización',
  'org.unfollowConfirmTitle': 'Dejar de seguir organización',
  'org.unfollowConfirmBody':
    '¿Estás seguro que querés dejar de seguir a {name}? Tu historial de puntos y canjes se mantiene guardado y podés volver a seguirla cuando quieras.',
  'org.unfollowAction': 'Dejar de seguir',
  'org.unfollowFailed':
    'No pudimos dejar de seguir la organización. Intentá nuevamente.',
  'org.unfollowedTitle': '¡Listo!',
  'org.unfollowedBody':
    'Dejaste de seguir a {name}. Podés volver a seguirla desde la pantalla de Explorar.',

  'industry.retail': 'Retail',
  'industry.gastronomy': 'Gastronomía',
  'industry.services': 'Servicios',
  'industry.health': 'Salud',
  'industry.beauty': 'Belleza y bienestar',
  'industry.other': 'Otro',

  'day.0': 'Dom',
  'day.1': 'Lun',
  'day.2': 'Mar',
  'day.3': 'Mié',
  'day.4': 'Jue',
  'day.5': 'Vie',
  'day.6': 'Sáb',

  // --- Canje ---------------------------------------------------------------
  'redeem.action': 'Canjear',
  'redeem.noPointsShort': 'Sin puntos',
  'redeem.noPoints': 'Puntos insuficientes',
  'redeem.confirmTitle': 'Confirmar canje',
  'redeem.confirmBody':
    '¿Canjear "{product}" por {points} puntos? Reservamos la unidad y la podés retirar en una sucursal cuando quieras.',
  'redeem.failedTitle': 'No se pudo canjear',
  'redeem.doneTitle': 'Canje realizado',
  'redeem.doneBody':
    'Reservamos tu producto. Acercate a una sucursal para retirarlo. Seguí el estado en tu Historial.',

  // --- Catálogo de productos ----------------------------------------------
  'products.header': 'Canjeá tus puntos',
  'products.searchPlaceholder': 'Buscar producto por nombre',
  'products.allCategories': 'Todas',
  'products.stock': 'Stock disponible: {count}',
  'products.missingPoints': 'Te faltan {points} pts',
  'products.loading': 'Cargando productos...',
  'products.errorTitle': 'No pudimos cargar los productos',
  'products.errorBody':
    'Revisá tu conexión y volvé a entrar. Si sigue pasando, actualizá la app.',
  'products.noResultsBody': 'Probá con otro nombre o quitá el filtro de categoría.',
  'products.emptyTitle': 'No hay productos disponibles',
  'products.emptyBody': 'Pronto habrá productos para canjear con tus puntos.',

  // --- Historial -----------------------------------------------------------
  'history.header': 'Historial de actividad',
  'history.filterAll': 'Todo',
  'history.filterEarned': 'Ganados',
  'history.filterRedeemed': 'Canjeados',
  'history.filtersLabel': 'Búsqueda y filtros',
  'history.searchPlaceholder': 'Buscar por producto, tipo o fecha',
  'history.periodAll': 'Todo',
  'history.period7': '7 días',
  'history.period30': '30 días',
  'history.period365': 'Último año',
  'history.countOne': '1 movimiento',
  'history.countMany': '{count} movimientos',
  'history.sortNewest': 'Más nuevo primero',
  'history.sortOldest': 'Más viejo primero',
  'history.sortNewestLabel': 'Mostrar primero lo más nuevo',
  'history.sortOldestLabel': 'Mostrar primero lo más viejo',
  'history.summary': 'Resumen',
  'history.recent': 'Actividad reciente',
  'history.loadMore': 'Cargar más',
  'history.emptyTitle': 'Sin actividad todavía',
  'history.emptyBody': 'Tus compras y canjes en {name} van a aparecer acá.',
  'history.noResultsBody': 'Probá con otro texto o ampliá el período.',
  'history.purchase': 'Compra realizada',
  'history.purchaseCancelled': 'Compra cancelada',
  'history.purchaseAt': 'Compra en {name}',
  'history.redemption': 'Canje realizado',
  'history.redemptionCancelled': 'Canje cancelado',
  'history.deletedProduct': 'Producto eliminado',
  'history.theOrganization': 'la organización',

  // --- Historial general (todas las organizaciones) ------------------------
  'historyAll.header': 'Historial general',
  'historyAll.subtitle': 'Todas tus actividades en PuntosClub',
  'historyAll.assignedPoints': 'Puntos asignados',
  'historyAll.cancelledPoints': 'Puntos cancelados',
  'historyAll.redemptionsDone': 'Canjes realizados',
  'historyAll.filterAll': 'Todos',
  'historyAll.filterAssigned': 'Asignaciones',
  'historyAll.filterCancelled': 'Cancelaciones',
  'historyAll.filterRedeemed': 'Canjes',
  'historyAll.periodLabel': 'Período',
  'historyAll.period0': 'Todo el historial',
  'historyAll.period7': 'Últimos 7 días',
  'historyAll.period30': 'Últimos 30 días',
  'historyAll.period90': 'Últimos 3 meses',
  'historyAll.period365': 'Último año',
  'historyAll.today': 'Hoy, {date}',
  'historyAll.yesterday': 'Ayer, {date}',
  'historyAll.redemption': 'Canje de premio',
  'historyAll.loadMore': 'Cargar más movimientos',
  'historyAll.emptyTitle': 'Sin movimientos todavía',
  'historyAll.emptyBody':
    'Tus compras y canjes en todas tus organizaciones van a aparecer acá.',
  'historyAll.noResultsTitle': 'Sin movimientos en este período',
  'historyAll.noResultsBody': 'Probá con otro filtro o ampliá el período.',
  // --- Panel de notificaciones ---------------------------------------------
  'notif.header': 'Notificaciones',
  'notif.subtitle': 'Todo lo que pasa en tus clubes, en un solo lugar',
  'notif.bell': 'Notificaciones',
  'notif.unread': '{count} sin leer',
  'notif.today': 'Hoy',
  'notif.yesterday': 'Ayer',
  'notif.thisWeek': 'Esta semana',
  'notif.older': 'Anteriores',
  'notif.pointsTitle': '¡Recibiste puntos! 🎉',
  'notif.pointsBody': '{org} te acreditó {points} puntos por tu compra.',
  'notif.redeemTitle': '¡Canje realizado! 🎁',
  'notif.redeemBody': 'Canjeaste {product} en {org}. ¡Gracias por ser parte!',
  'notif.rewardsTitle': 'Nuevos premios disponibles ✨',
  'notif.rewardsBody': '{org} sumó {count} premios nuevos para vos.',
  'notif.joinedTitle': '¡Nueva organización! ⭐',
  'notif.joinedBody': 'Te sumaste a {org}. Descubrí todos sus beneficios.',
  'notif.emptyTitle': 'Sin notificaciones',
  'notif.emptyBody':
    'Tus puntos, canjes y las novedades de tus clubes van a aparecer acá.',
  'notif.clear': 'Borrar notificaciones',
  'notif.clearTitle': '¿Borrar todo?',
  'notif.clearBody':
    'Se vacía el panel en este teléfono. Tus puntos y canjes no se tocan: seguís viéndolos en el historial.',
  'notif.clearConfirm': 'Borrar',
} as const;
