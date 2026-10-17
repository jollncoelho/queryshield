/**
 * Diccionario español.
 *
 * Tipado a partir del francés de referencia (`Dictionary = typeof fr`): una
 * clave que falte es un error de compilación, no un texto vacío en pantalla.
 */

import type { Dictionary } from './fr';

export const es: Dictionary = {
  meta: {
    languageName: 'Español',
    switchLabel: 'Idioma',
    title: 'QueryShield — Análisis de mensajes sospechosos y detección de estafas',
    description:
      'Pegue un correo, un SMS o un mensaje sospechoso: QueryShield evalúa el nivel de riesgo, explica cada señal detectada y le ayuda a decidir antes de actuar.',
    ogTitle: 'QueryShield — Análisis de mensajes sospechosos',
    ogDescription:
      'Detección de phishing y estafas mediante análisis heurístico y semántico. Puntuación de riesgo, señales explicadas, ningún dato conservado.',
  },

  nav: {
    analyzer: 'Analizador',
    site: 'Verificar un sitio',
    pricing: 'Precios',
    api: 'API',
    account: 'Mi cuenta',
    privacy: 'Privacidad',
  },

  header: {
    support: 'support@query-intel.com',
    openAccess: 'Obtener acceso',
  },

  footer: {
    tagline:
      'Análisis de mensajes sospechosos y verificación de sitios para la detección de phishing, estafas y fraude. Un servicio de query-intel.com.',
    ecosystem: 'Descubre el ecosistema query-intel.com',
    productTitle: 'Producto',
    legalTitle: 'Legal',
    resourcesTitle: 'Recursos',
    linkAnalyzer: 'Analizador de mensajes',
    linkSite: 'Verificar un sitio',
    linkPricing: 'Planes y precios',
    linkApiDocs: 'Documentación de la API',
    linkHealth: 'Estado del servicio',
    linkPrivacy: 'Política de privacidad',
    linkTerms: 'Términos y advertencia',
    linkMentions: 'Aviso legal',
    disclaimer:
      'QueryShield ofrece una evaluación automatizada del nivel de riesgo y una puntuación de probabilidad. Ningún sistema automatizado es 100 % fiable: la puntuación es una ayuda a la decisión y no sustituye la verificación con la organización en cuestión, ni el consejo de un profesional. Los mensajes enviados se procesan en memoria y no se conservan.',
    rights: '© {year} query-intel.com — QueryShield. Todos los derechos reservados.',
    legalNotice:
      'Los textos jurídicos se redactan en francés y prevalece esa versión. Solo la versión francesa es vinculante.',
  },

  common: {
    scoreAria: 'Puntuación de riesgo {score} sobre 100',
    outOf: 'SOBRE 100',
    clear: 'Borrar',
    copyReport: 'Copiar informe',
    engine: 'Motor',
    duration: 'Duración',
    quotaToday: 'Cuota de hoy',
    headers: 'Cabeceras',
    headersAnalyzed: 'analizadas',
    headersMissing: 'no facilitadas',
    confidenceChip: 'Fiabilidad {level} ({percent} %)',
    confidenceHigh: 'alta',
    confidenceMedium: 'media',
    confidenceLow: 'baja',
    noSignal: 'Ninguna señal activada',
    noFindingsDetail:
      'No se activó ninguna regla. El mensaje no contiene enlaces dudosos, ni solicitud de datos sensibles, ni un patrón de ingeniería social identificable por análisis estático.',
    signalsDetected: 'Señales detectadas',
    categoriesTitle: 'Reparto de las señales',
    semanticActive: 'Pasada semántica activa',
    rulesTriggered: '{count} regla activada',
    rulesTriggeredPlural: '{count} reglas activadas',
    trigger: 'Elemento desencadenante',
    whatToDo: 'Qué hacer ahora',
    semantic: 'Semántica',
    privacyShort: 'Análisis estático · ningún dato conservado',
    networkError: 'El servicio no está disponible. Compruebe su conexión e inténtelo de nuevo.',
    genericError: 'El análisis ha fallado. Inténtelo de nuevo en unos instantes.',
    errors: {
      rate_limited: 'Demasiadas solicitudes desde su conexión. Espere un momento e inténtelo de nuevo.',
      quota_exceeded: 'Cuota diaria alcanzada. Cambie a un plan superior para continuar.',
      payload_too_large: 'El mensaje es demasiado grande. Reduzca su tamaño e inténtelo de nuevo.',
      invalid_json: 'Solicitud ilegible. Recargue la página e inténtelo de nuevo.',
      missing_text: 'No hay nada que analizar. Pegue el mensaje recibido (mínimo 4 caracteres).',
      missing_url: 'No hay ninguna dirección que verificar. Introduzca un nombre de dominio o una dirección completa.',
      invalid_url:
        'Esta entrada no es una dirección de sitio utilizable. Utilice un nombre de dominio (ejemplo.com) o una dirección completa (https://ejemplo.com/pagina). No se aceptan direcciones de red interna.',
    },
    siteContactedNever: 'el sitio nunca se abre',
  },

  severity: {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Moderado',
    low: 'Bajo',
    info: 'Información',
  },

  category: {
    lien: 'Enlaces y dominios',
    identite: 'Suplantación de identidad',
    'ingenierie-sociale': 'Ingeniería social',
    'donnees-sensibles': 'Solicitud de datos sensibles',
    'entetes-email': 'Autenticación del correo',
    contenu: 'Contenido y formato',
    metadata: 'Contexto del mensaje',
  },

  verdict: {
    safe: 'Riesgo bajo',
    suspicious: 'Sospechoso',
    dangerous: 'Fraude probable',
    safeSummary:
      'No se ha detectado ningún indicador de fraude. El mensaje no contiene enlaces dudosos, ni solicitud de datos sensibles, ni presión de tiempo característica.',
  },

  siteVerdict: {
    official: 'Sitio oficial verificado',
    unknown: 'Autenticidad no verificable',
    suspicious: 'Sitio sospechoso',
    phishing: 'Sitio fraudulento',
  },

  home: {
    chip: 'Análisis estático · motor heurístico · cero datos conservados',
    titleLead: 'Analizador táctico de amenazas',
    titleAccent: '—',
    titleTail: 'envíe un SMS, un correo o una URL para inspección heurística instantánea',
    intro:
      'Inspección heurística de correos, SMS y mensajes instantáneos. Extracción de indicadores, correspondencia con el referencial de marcas, léxico de ingeniería social: cada señal se explica, se pondera y se restituye en puntuación y vía de remediación.',
    ctaAnalyze: 'Lanzar la auditoría de la muestra',
    ctaSite: 'Verificar un sitio',
    ctaPricing: 'Ver los planes',
    ctaApi: 'Integrar la API',
    stepsTitle: 'Cómo funciona',
    step1Title: 'Pegue el mensaje',
    step1Body:
      'Correo, SMS, mensaje de WhatsApp o Telegram. Puede añadir las cabeceras originales para activar la verificación SPF, DKIM y DMARC.',
    step2Title: 'El motor analiza',
    step2Body:
      'Extracción de enlaces e identificadores, comparación de los dominios con las marcas oficiales, aplicación del léxico de ingeniería social y ponderación de las señales.',
    step3Title: 'Usted decide',
    step3Body:
      'Una puntuación de riesgo, la lista de señales con su explicación y las acciones concretas que debe tomar. El informe puede exportarse para sus registros.',
    coverageTitle: 'Qué detecta el motor',
    coverageIntro:
      'Más de 80 reglas heurísticas, organizadas en familias de señales independientes. Es la convergencia de varias familias la que eleva la puntuación: es lo que hace fiable el veredicto.',
    coverage1Title: 'Suplantación de dominio',
    coverage1Body:
      'Typosquatting, homoglifos cirílicos, punycode, subdominios engañosos, direcciones IP sin procesar, acortadores.',
    coverage2Title: 'Ingeniería social',
    coverage2Body:
      'Presión de tiempo, amenaza de suspensión, falso soporte técnico, cebo financiero, imposición de secreto, control remoto.',
    coverage3Title: 'Solicitudes sensibles',
    coverage3Body:
      'Contraseñas, códigos recibidos por SMS, códigos de doble autenticación, datos bancarios, frases de recuperación de criptomonedas, documentos de identidad.',
    coverage4Title: 'Autenticación del correo',
    coverage4Body:
      'Lectura de los resultados SPF, DKIM y DMARC, incoherencia entre From, Reply-To y Return-Path, nombre mostrado que suplanta una marca.',
    coverage5Title: 'Medios de pago de riesgo',
    coverage5Body:
      'Transferencias instantáneas, cupones prepago, tarjetas Transcash o PCS, números de tarificación especial, falsas tasas de aduana.',
    coverage6Title: 'Ofuscación técnica',
    coverage6Body:
      'Caracteres invisibles, mezcla de alfabetos, marcas desmembradas, URL muy codificadas, redirecciones ocultas.',
    warningTitle: 'Advertencia',
    warningBody:
      'QueryShield ofrece una evaluación automatizada del nivel de riesgo y una puntuación de probabilidad. Ningún sistema automatizado es 100 % fiable: un mensaje fraudulento puede no activar ninguna señal y un mensaje legítimo puede activar algunas. El informe es una ayuda a la decisión y no sustituye la verificación con la organización en cuestión, ni el consejo de un profesional.',
    warningLink: 'Leer los términos completos',
    ctaTitle: '¿Necesita acceso habitual o un volumen mayor?',
    ctaBody:
      'Planes mensuales y anuales, acceso a la API con clave de licencia, cuotas adaptadas a equipos. Pago con tarjeta mediante Stripe.',
    ctaButton: 'Consultar los planes',
  },

  analyzer: {
    channelEmail: 'Correo',
    channelSms: 'SMS',
    channelMessaging: 'Mensajería',
    channelOther: 'Otro',
    senderPlaceholder: 'Remitente (opcional) — ej. «Atención al Cliente <contact@dominio.com>»',
    senderLabel: 'Dirección del remitente',
    subjectPlaceholder: 'Asunto del mensaje (opcional)',
    subjectLabel: 'Asunto del mensaje',
    textPlaceholder:
      'Pegue aquí el mensaje sospechoso, manteniendo los enlaces tal cual.\n\nEjemplo: «Su paquete está retenido, pague la tasa en 24h: http://ejemplo.top/…»',
    textLabel: 'Mensaje que se va a analizar',
    senderHelp:
      'El remitente se analiza automáticamente si aparece en el texto pegado (una línea «De: …»). Indicarlo aquí sigue siendo más fiable: es el dominio después de la @ lo que determina si la dirección es auténtica.',
    headersShow: '+ Añadir las cabeceras originales del correo (SPF / DKIM / DMARC)',
    headersHide: '− Ocultar las cabeceras originales',
    headersPlaceholder:
      'Pegue aquí las cabeceras completas.\n\nEn Gmail: menú «Más» > «Mostrar original».\nEn Outlook: «Opciones» > «Propiedades del mensaje».',
    headersLabel: 'Cabeceras originales del correo',
    headersHelp:
      'Es la verificación más fiable: SPF, DKIM y DMARC permiten saber si el dominio remitente es auténtico. Sin cabeceras, el dominio del remitente se analiza igualmente a partir del campo anterior o de la línea «De: …» del mensaje.',
    samplesLabel: 'Ejemplos de demostración',
    submit: 'Inspeccionar el vector',
    submitting: 'Inspeccionando el vector…',
    privacyNote: 'Procesado en memoria · ningún mensaje conservado · ningún enlace abierto',
    disclaimer:
      'Este informe es una ayuda a la decisión basada en un análisis automatizado. Ningún sistema garantiza una detección 100 % fiable: en caso de duda, verifique directamente con la organización en cuestión mediante un número que haya encontrado usted mismo.',
  },

  samples: {
    'sms-colis': { label: 'SMS — paquete retenido', hint: 'Falsas tasas de aduana' },
    'email-banque': { label: 'Correo — falso banco', hint: 'Cabeceras DMARC fallidas' },
    'faux-conseiller': { label: 'Mensajería — falso asesor', hint: 'Petición de código SMS + secreto impuesto' },
    'faux-support': { label: 'Falso soporte técnico', hint: 'Control remoto' },
    'faux-gain': { label: 'Falso premio / cripto', hint: 'Cebo financiero y frase de recuperación' },
    'faux-gain-sans-lien': { label: 'Falso premio — sin enlace', hint: 'Dominio aleatorio, sin pedir credenciales' },
    'fausse-administration': { label: 'Falsa administración', hint: 'Dominio que imita a una institución' },
    casino: { label: 'Oferta de casino', hint: 'Cebo de juego no solicitado' },
    legitime: { label: 'Mensaje legítimo', hint: 'Caso de control' },
  },

  site: {
    metaTitle: 'Verificar un sitio',
    metaDescription:
      'Compruebe si una dirección de sitio es auténtica, sospechosa o fraudulenta. El sitio analizado nunca se abre.',
    chip: 'Verificación de dirección · análisis estático · el sitio nunca se abre',
    titleLead: '¿Es este sitio',
    titleAccent: 'realmente',
    titleTail: 'el que dice ser?',
    intro:
      'Pegue una dirección de sitio o un nombre de dominio. QueryShield compara el dominio con la lista de referencia de organizaciones, detecta las imitaciones y, si lo activa, comprueba la antigüedad del dominio en el registro oficial. El sitio sospechoso nunca se contacta: abrirlo avisaría al atacante.',
    ctaAnalyzer: 'Inspeccionar el vector',
    ctaApi: 'Integrar la API',
    criteriaTitle: 'Qué se verifica',
    criteria1Title: 'Suplantación de marca',
    criteria1Body:
      'El dominio reutiliza el nombre de un banco, un transportista o una administración sin ser uno de sus dominios oficiales.',
    criteria2Title: 'Similitud engañosa',
    criteria2Body:
      'Typosquatting (un carácter de diferencia), homoglifos cirílicos, codificación punycode, extensión conocida desviada a subdominio.',
    criteria3Title: 'Dominio generado automáticamente',
    criteria3Body:
      'Entropía anómala, secuencias de consonantes, ausencia de vocales: la firma de los dominios registrados en lote para una campaña.',
    criteria4Title: 'Antigüedad y reputación',
    criteria4Body:
      'Verificaciones opcionales: fecha de registro del dominio en el registro oficial (RDAP) y denuncias conocidas.',
    limitsTitle: 'Qué no dice el resultado',
    limitsBody:
      '«Ninguna señal de fraude» no significa «sitio de confianza». Un dominio desconocido para nuestra lista aparece como no verificable, y eso es deliberado: preferimos mostrar una incertidumbre antes que una falsa tranquilidad. Esta verificación no sustituye la introducción manual de la dirección oficial, ni el consejo de un profesional en caso de duda.',
    formTitle: 'Verificar una dirección de sitio',
    urlPlaceholder: 'ejemplo.com o https://ejemplo.com/pagina',
    urlLabel: 'Dirección del sitio que se va a verificar',
    activeLabel: 'Verificación activa',
    activeBody:
      'consulta el registro de dominios (antigüedad y registrador) y la reputación del sitio. Mucho más fiable, pero la dirección se transmite entonces a esos servicios.',
    activeNeverContacted: 'El propio sitio nunca se contacta',
    activeTail: ', ni ahora ni más adelante.',
    submit: 'Verificar este sitio',
    submitting: 'Verificando…',
    examplesLabel: 'Ejemplos',
    exampleOfficial: 'Sitio oficial',
    exampleBank: 'Imitación de banco',
    exampleSubdomain: 'Subdominio engañoso',
    exampleRandom: 'Dominio aleatorio',
    organisation: 'Organización: {name} ({category})',
    impersonated: 'Organización suplantada: {brands}',
    knownOrganisation: 'una organización conocida',
    host: 'Host',
    domain: 'Dominio',
    extension: 'Extensión',
    activeChip: 'Verificación activa',
    networkTitle: 'Verificaciones de red',
    networkSource: 'fuente: registro de dominios · no se ha contactado con el sitio',
    dnsResolution: 'Resolución DNS',
    dnsNotChecked: 'no verificada',
    dnsAddresses: '{count} dirección(es)',
    dnsFails: 'no resuelve',
    domainAge: 'Antigüedad del dominio',
    domainAgeDays: '{days} día(s)',
    domainAgeUnknown: 'no disponible',
    registeredOn: 'Registrado el',
    registrar: 'Registrador',
    reputation: 'Reputación',
    reputationFlagged: 'denunciado',
    reputationClean: 'sin denuncias',
    reputationNotChecked: 'no consultada',
    reputationUnavailable:
      'No se ha podido realizar la verificación de reputación. Esto no significa que el sitio esté limpio: no se ha obtenido ninguna opinión, en ningún sentido.',
    footnote:
      'Esta verificación es una ayuda a la decisión. El sitio analizado nunca se abre: el informe se basa en la estructura del dominio, en la lista de referencia de marcas y, si lo ha activado, en el registro de dominios. Ningún sistema garantiza una detección 100 % fiable.',
    summaryOfficial:
      '{host} es el dominio oficial de {brand}. Puede iniciar sesión con confianza, siempre que haya escrito la dirección usted mismo.',
    summaryPhishing:
      'Puntuación de riesgo {score}/100: {host} imita a {brands} sin ser su dominio oficial. No introduzca ningún dato en este sitio.',
    summarySuspicious:
      'Puntuación de riesgo {score}/100: {host} presenta anomalías estructurales sin imitar a ninguna organización identificable. Trate este sitio como no fiable hasta verificarlo.',
    summaryUnknown:
      'No se ha detectado ningún signo de fraude en {host}, pero este dominio no pertenece a ninguna organización de nuestra lista de referencia. Por eso no podemos confirmar que sea auténtico: no detectar problemas no es una validación.',
    summaryInvalid:
      'Esta entrada no es una dirección de sitio utilizable. Introduzca un nombre de dominio (ejemplo.com) o una dirección completa (https://ejemplo.com/pagina).',
  },

  siteRecs: {
    'site-rec-invalid-input':
      'Compruebe el formato de la dirección: un nombre de dominio contiene al menos un punto y termina en una extensión (.fr, .com, .gouv.fr...).',
    'site-rec-type-address':
      'Escriba la dirección usted mismo en la barra del navegador en lugar de hacer clic en un enlace recibido: es la única forma de tener la certeza de llegar al sitio correcto.',
    'site-rec-check-padlock':
      'Compruebe que el candado del navegador está presente y que el nombre de dominio mostrado es exacto, sin errores tipográficos.',
    'site-rec-unknown-org':
      'Ninguna organización de nuestra lista de referencia corresponde a este dominio. Si se presenta como su banco, su operador o una administración, no es su sitio oficial.',
    'site-rec-use-search':
      'Para verificar un servicio, utilice un buscador o un documento oficial, nunca el enlace que quiere controlar.',
    'site-rec-no-credentials':
      'No introduzca usuario, contraseña ni número de tarjeta en este sitio.',
    'site-rec-report-brand':
      'Este sitio imita a una organización conocida. Vaya al sitio oficial escribiendo su dirección usted mismo y denuncie el intento desde el área de cliente o el servicio de atención de la organización imitada.',
    'site-rec-inspect-chars':
      'El dominio usa caracteres visualmente engañosos (alfabeto mezclado o codificación internacional). Copie la dirección y péguela en un editor de texto: los caracteres extranjeros se ven con claridad.',
    'site-rec-expand-shortener':
      'La dirección pasa por un acortador: el destino real es invisible antes del clic. Amplíela con una herramienta de resolución antes de actuar.',
    'site-rec-domain-gone':
      'Este nombre de dominio ya no resuelve: probablemente el sitio se retiró tras servir a una campaña. Por tanto, el enlace recibido procede de un mensaje antiguo o fraudulento.',
    'site-rec-domain-young':
      'Este dominio se registró hace muy poco. Los sitios fraudulentos se montan durante unos días o semanas: la juventud del dominio es en sí misma una señal de desconfianza.',
    'site-rec-safe-browsing':
      'Este sitio figura en la lista de sitios peligrosos de Google Safe Browsing. No acceda a él y elimine el mensaje que lo contenía.',
    'site-rec-report-authority':
      'Denuncie la dirección: la plataforma Pharos (internet-signalement.gouv.fr) para contenidos fraudulentos, o Signal Spam para correos electrónicos.',
  },

  randomSignals: {
    'entropy-very-high': 'entropía muy alta ({value} bits por carácter)',
    'entropy-high': 'entropía alta ({value} bits por carácter)',
    'consonant-run': '{value} consonantes consecutivas',
    'no-vowel': 'ninguna vocal',
    'few-vowels': 'casi ninguna vocal ({value} %)',
    'interleaved-digits': 'dígitos intercalados en el nombre',
    'very-long': 'nombre muy largo ({value} caracteres)',
  },

  findings: {
    'url-dangerous-scheme': {
      title: 'Esquema de URL peligroso',
      detail:
        'La dirección usa un esquema `data:`, `javascript:` o `file:`. Este tipo de dirección ejecuta código o abre un archivo local sin pasar por un sitio web: no tiene razón de estar en un mensaje legítimo.',
    },
    'url-ip-literal': {
      title: 'Enlace a una dirección IP sin procesar',
      detail:
        'El enlace apunta directamente a una dirección IP en lugar de a un nombre de dominio. Los servicios oficiales usan siempre un dominio; la IP sin procesar evita las listas de bloqueo y los certificados.',
    },
    'url-punycode': {
      title: 'Dominio codificado en punycode',
      detail:
        'El dominio contiene una etiqueta `xn--`. Es la codificación de caracteres no latinos: permite mostrar un nombre visualmente idéntico al de una marca oficial cuando el dominio es distinto.',
    },
    'url-homoglyph': {
      title: 'Dominio con caracteres homoglifos',
      detail:
        'El dominio mezcla el alfabeto latino con caracteres cirílicos o griegos visualmente idénticos. Es la técnica más eficaz para imitar una marca: a la vista, el dominio es indistinguible.',
    },
    'url-userinfo-trick': {
      title: 'Dominio oculto tras una arroba',
      detail:
        'La URL contiene una arroba antes de la ruta. Todo lo que precede a la arroba lo ignora el navegador: el dominio realmente visitado no es el que aparece primero.',
    },
    'url-risky-tld': {
      title: 'Extensión de dominio de riesgo',
      detail:
        'La extensión del dominio figura entre las más usadas por las campañas de phishing, porque se venden a bajo precio y sin verificación de identidad.',
    },
    'url-shortener': {
      title: 'Enlace acortado',
      detail:
        'El enlace pasa por un servicio de acortamiento: el destino real es invisible antes del clic. En un mensaje no solicitado, considere el destino como desconocido.',
    },
    'url-brand-impersonation': {
      title: 'Dominio que suplanta una marca conocida',
      detail:
        'El dominio reutiliza el nombre de {brands} sin ser un dominio oficial de esa marca. Es la firma más frecuente del phishing dirigido.',
    },
    'url-typosquat': {
      title: 'Error tipográfico que imita un dominio oficial',
      detail:
        'El dominio difiere en un solo carácter de un dominio oficial. Esta técnica (typosquatting) explota un error tipográfico o una lectura rápida del mensaje.',
    },
    'url-typosquat-approx': {
      title: 'Dominio visualmente próximo a uno oficial',
      detail:
        'El dominio se parece mucho a un dominio oficial, sin ser idéntico. Compruébelo carácter por carácter antes de cualquier acción.',
    },
    'url-random-domain': {
      title: 'Dominio generado automáticamente',
      detail:
        'El dominio no se parece a ningún nombre legible ({signals}). Los dominios producidos aleatoriamente se registran en lote durante unos días: no tienen historia, ni reputación, ni razón de estar en un mensaje legítimo.',
    },
    'url-random-domain-weak': {
      title: 'Nombre de dominio inusual',
      detail:
        'La estructura del dominio es inusual ({signals}). Señal que deben confirmar las demás comprobaciones.',
    },
    'url-institutional-mimicry': {
      title: 'Dominio que imita una institución',
      detail:
        'El dominio reutiliza el vocabulario de una institución pública ({words}) sin ser un dominio oficial. Las administraciones usan dominios .gouv.fr o .gov: una variante comercial es una suplantación.',
    },
    'url-tld-as-label': {
      title: 'Extensión desviada a subdominio',
      detail:
        'La dirección contiene una extensión conocida (.com, .gov, .fr…) en una posición que no es la extensión final. El dominio realmente registrado es el que sigue, pero la vista se detiene en la parte anterior: el montaje solo sirve para engañar a la lectura.',
    },
    'url-lure-keywords': {
      title: 'Términos de cebo en el dominio',
      detail:
        'El dominio contiene términos destinados a atraer ({tokens}). Un nombre de dominio elegido por su argumento comercial es casi siempre un dominio registrado para una campaña de envío masivo.',
    },
    'url-sensitive-path': {
      title: 'Palabras clave de acceso en el enlace',
      detail:
        'El enlace contiene términos de inicio de sesión o de pago ({keywords}) en un dominio que no es el de la organización anunciada. Están ahí para tranquilizar a la víctima.',
    },
    'url-sensitive-path-strong': {
      title: 'Palabras clave de acceso en el enlace',
      detail:
        'El enlace acumula varios términos de inicio de sesión o de pago ({keywords}) en un dominio que no es el de la organización anunciada. Están ahí para tranquilizar a la víctima.',
    },
    'url-plain-http-sensitive': {
      title: 'Página sensible servida por HTTP',
      detail:
        'El enlace apunta a una página de inicio de sesión o de pago sin cifrado. Ningún servicio legítimo recoge credenciales por HTTP.',
    },
    'url-many-subdomains': {
      title: 'Apilamiento de subdominios',
      detail:
        'El dominio tiene un número inusual de subdominios. El apilamiento sirve para empujar el dominio real fuera de la zona visible de la barra de direcciones.',
    },
    'url-long-host': {
      title: 'Nombre de dominio anormalmente largo',
      detail:
        'El nombre de dominio es muy largo. Los dominios generados automáticamente por los kits de phishing suelen serlo.',
    },
    'url-many-hyphens': {
      title: 'Guiones múltiples en el dominio',
      detail:
        'El dominio encadena varios guiones, patrón típico de los dominios generados para imitar un nombre oficial.',
    },
    'url-odd-port': {
      title: 'Puerto no estándar',
      detail:
        'La dirección indica un puerto no estándar. Los sitios oficiales no los usan y eso suele traducir un servidor de ataque.',
    },
    'url-redirect-param': {
      title: 'Redirección a un destino oculto',
      detail:
        'El enlace contiene un parámetro de redirección. La página mostrada puede parecer legítima y aun así remitir a otro sitio tras la validación.',
    },
    'url-heavy-encoding': {
      title: 'URL muy codificada',
      detail:
        'El enlace contiene numerosas secuencias de escape. La codificación sirve para ocultar el destino real y eludir los filtros.',
    },
    'url-zero-width': {
      title: 'Caracteres invisibles en el enlace',
      detail:
        'El enlace contiene caracteres de anchura nula, invisibles en pantalla. Solo sirven para engañar a los filtros y al ojo humano.',
    },
    'url-anchor-mismatch': {
      title: 'Texto del enlace distinto de su destino',
      detail:
        'El texto mostrado del enlace indica un dominio, pero el enlace apunta a otro dominio. Es una prueba directa de intención engañosa.',
    },
    'site-official-domain': {
      title: 'Dominio oficial verificado',
      detail:
        'Este dominio está registrado como el dominio oficial de {brand}. Es una dirección de confianza: los mensajes y los enlaces que apuntan aquí son coherentes.',
    },
    'site-impersonates-brand': {
      title: 'Este sitio suplanta a una organización conocida',
      detail:
        'El dominio reutiliza el nombre de {brands} sin ser uno de sus dominios oficiales. Es la definición misma de un sitio de phishing: imita a una organización para recoger credenciales o pagos.',
    },
    'site-insecure-scheme': {
      title: 'Dirección por HTTP, sin cifrado',
      detail:
        'La dirección facilitada es `http://`. Ningún sitio comercial o bancario serio funciona ya así: la conexión no está cifrada y nada garantiza la identidad del servidor.',
    },
    'site-not-resolving': {
      title: 'El dominio no resuelve',
      detail:
        'La resolución DNS de este nombre de dominio falla. El sitio ya no existe, o nunca se configuró para responder: es frecuente en dominios registrados y luego abandonados tras una campaña de phishing.',
    },
    'site-newly-registered': {
      title: 'Dominio registrado muy recientemente',
      detail:
        'Este dominio se registró hace {days} día(s) (el {date}). Los sitios de phishing viven unos días o unas semanas: un dominio nuevo que se presenta como una organización establecida es casi siempre fraudulento.',
    },
    'site-recently-registered': {
      title: 'Dominio reciente',
      detail:
        'Este dominio se registró hace {days} día(s). No es anómalo en sí mismo, pero un dominio de menos de seis meses no puede tener la antigüedad de una organización establecida.',
    },
    'site-safe-browsing-flagged': {
      title: 'Sitio señalado como peligroso',
      detail:
        'Este sitio figura en una lista pública de sitios peligrosos ({threats}). Ya está identificado como distribuidor de contenido malicioso o como sitio de phishing.',
    },
  },
};
