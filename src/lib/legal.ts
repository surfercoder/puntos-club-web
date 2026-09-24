// Texto de los documentos legales, extraido de los .docx que adjunto legales al
// ticket. Va embebido y no en una URL: el alta tiene que poder leerse sin
// depender de que la web este arriba, y la version aceptada debe coincidir
// exactamente con lo que el beneficiario vio en pantalla.
//
// Formato minimo para no meter un parser de markdown: "## " = titulo de
// seccion, "- " = item de lista, el resto es parrafo. Lo lee app/(auth)/legal.tsx.
//
// Al reemplazar un documento hay que subir tambien su version de abajo: es la
// que queda guardada como constancia de aceptacion en beneficiary.

export const TERMS_VERSION = '1.1';
export const PRIVACY_VERSION = '1.1';

export const TERMS_TEXT = `PuntosClub
Términos y Condiciones de Uso — Beneficiarios
Versión 1.1 — Borrador para revisión legal
Fecha de vigencia: [PENDIENTE]
## 1. Identificación
Los presentes Términos y Condiciones regulan el acceso y utilización de la plataforma PuntosClub, operada por ADAMANTIO SAS, CUIT 30-71680750-5.
PuntosClub facilita una plataforma tecnológica destinada a conectar a personas beneficiarias con programas de puntos, beneficios, premios y canjes administrados por organizaciones adheridas.
Para consultas generales o contingencias relacionadas con el servicio: hola@puntosclub.com.ar
Para cuestiones relacionadas específicamente con protección de datos personales: dpo@puntosclub.com.ar
## 2. Aceptación
Para crear y utilizar una cuenta PuntosClub, el usuario deberá aceptar estos Términos y Condiciones y conocer la Política de Privacidad vigente.
La aceptación será registrada electrónicamente, identificando como mínimo la versión correspondiente y la fecha y hora de aceptación.
Si el usuario no acepta los Términos vigentes, no podrá continuar utilizando la plataforma.
## 3. ¿Qué es PuntosClub?
PuntosClub es una plataforma tecnológica que facilita la relación entre las organizaciones que administran programas de beneficios y las personas que participan de dichos programas.
PuntosClub proporciona herramientas para administrar programas; configurar reglas de puntos; registrar operaciones; calcular puntos; administrar premios; gestionar canjes; enviar comunicaciones; y consultar información relacionada con los programas.
Las condiciones comerciales particulares de cada programa son determinadas por la organización que lo administra.
## 4. Definiciones
PuntosClub: La plataforma tecnológica operada por ADAMANTIO SAS.
Beneficiario: La persona que posee una cuenta PuntosClub y participa de uno o más programas.
Organización / Owner: La persona o entidad que administra un programa dentro de PuntosClub.
Programa: El programa de beneficios, fidelización o puntos administrado por una Organización.
Cajero: El usuario autorizado por una Organización para realizar determinadas operaciones dentro de su programa.
Puntos: Unidades de beneficio generadas y utilizadas dentro de un Programa conforme a las reglas establecidas por la Organización.
Premio: El producto, beneficio o prestación ofrecido por una Organización a cambio de puntos.
Canje: La operación mediante la cual un Beneficiario utiliza puntos para solicitar un Premio.
Operación: El registro de una actividad que puede generar, utilizar, ajustar o revertir puntos.
## 5. Cuenta PuntosClub
La cuenta PuntosClub es personal, individual e intransferible.
Cada persona deberá utilizar una única cuenta personal.
El Beneficiario deberá proporcionar información verdadera, completa y actualizada y será responsable de informar cualquier modificación relevante.
PuntosClub podrá adoptar medidas de verificación cuando existan indicios de cuentas duplicadas, información incorrecta o uso indebido.
## 6. Credenciales de acceso
Las credenciales de acceso son personales y deberán mantenerse confidenciales.
El Beneficiario no deberá compartir su contraseña, facilitar sus códigos de acceso, permitir deliberadamente que terceros utilicen su cuenta ni utilizar las credenciales de otra persona.
Ante la sospecha de acceso no autorizado, el Beneficiario deberá utilizar los mecanismos de recuperación disponibles o comunicarse con PuntosClub.
PuntosClub podrá adoptar medidas de seguridad, incluyendo bloqueo temporal o restablecimiento de credenciales, cuando resulte necesario.
## 7. Datos proporcionados durante el registro
Para crear una cuenta podrán solicitarse datos personales, incluyendo nombre, apellido, DNI, fecha de nacimiento, email y contraseña.
El teléfono y la ubicación son datos opcionales.
La ubicación podrá incorporarse posteriormente desde el perfil.
El tratamiento de estos datos se encuentra regulado por la Política de Privacidad.
## 8. Participación en programas
Una cuenta PuntosClub puede participar simultáneamente en múltiples programas.
La incorporación a un programa se produce cuando el Beneficiario decide suscribirse al mismo y es automática, sin necesidad de aprobación previa de la Organización.
La participación en un programa no implica la participación en los demás programas disponibles en PuntosClub.
## 9. Información accesible para las Organizaciones
Una Organización solamente podrá acceder a la información correspondiente a los Beneficiarios que participan de su propio Programa y dentro de las funcionalidades habilitadas.
La Organización podrá acceder, entre otros datos, a nombre, apellido, puntos, operaciones, canjes e historial relacionado con su Programa.
La Organización no tendrá acceso a la base general de Beneficiarios de PuntosClub ni, en particular, a datos como DNI, email, teléfono, contraseña, fecha de nacimiento o información correspondiente a otros programas.
La información geográfica que PuntosClub pueda proporcionar a las Organizaciones será presentada de forma agregada y no exacta.
## 10. Abandono de un Programa
El Beneficiario podrá dejar de participar de un Programa.
El abandono no implica automáticamente la eliminación de los registros históricos asociados al Programa.
Los puntos que permanezcan vigentes podrán conservarse mientras el Beneficiario se encuentre fuera del Programa.
Si el Beneficiario vuelve a participar antes del vencimiento de dichos puntos, podrá recuperar los puntos que continúen vigentes.
El abandono no suspende ni modifica las fechas de vencimiento establecidas por la Organización.
## 11. Bloqueo por una Organización
Una Organización podrá bloquear a un Beneficiario respecto de su propio Programa.
El bloqueo no afecta la cuenta general de PuntosClub ni la participación del Beneficiario en otros programas.
Mientras dure el bloqueo, el Programa dejará de estar disponible para el Beneficiario y éste no podrá acceder al catálogo de la Organización, catálogo de premios, historial del Programa, nuevos canjes ni nuevas operaciones.
Si existiera un canje pendiente al momento del bloqueo, dicho canje podrá ser revertido y el Premio volverá a estar disponible para la Organización, conforme a las reglas del Programa. Los puntos utilizados serán restituidos conforme al funcionamiento del sistema.
Los registros de la operación no se eliminarán automáticamente como consecuencia del bloqueo.
## 12. Naturaleza de los puntos
Los puntos no constituyen dinero, moneda de curso legal ni instrumentos financieros.
No pueden venderse, transferirse entre personas ni convertirse en dinero.
No pueden utilizarse fuera del Programa que los generó.
El valor, equivalencia, forma de obtención, condiciones de utilización y vencimiento de los puntos serán determinados por cada Organización dentro de su Programa.
## 13. Generación de puntos
Los puntos se generan a partir de operaciones procesadas conforme a las reglas y campañas configuradas por la Organización.
El proceso podrá comprender: compra → carga de operación → cálculo → revisión → confirmación → acreditación.
PuntosClub ejecutará el cálculo conforme a las reglas vigentes configuradas en el sistema.
## 14. Confirmación de operaciones
Antes de acreditar los puntos, el usuario autorizado de la Organización deberá verificar la operación y los puntos calculados.
El sistema podrá requerir una confirmación adicional antes de completar la operación.
Los puntos serán acreditados una vez confirmada definitivamente la operación.
La Organización y sus usuarios autorizados son responsables de verificar la exactitud de la información ingresada y del resultado antes de confirmar la operación.
## 15. Cambios en las reglas de puntos
Las modificaciones realizadas por una Organización a sus reglas o campañas tendrán efecto conforme a la fecha de entrada en vigencia establecida.
Las operaciones ya confirmadas conservarán las condiciones y reglas aplicadas al momento de su confirmación.
Una modificación posterior de las reglas no deberá recalcular automáticamente operaciones históricas ya confirmadas.
## 16. Reversión de operaciones
Una operación confirmada podrá ser revertida cuando corresponda, incluyendo casos de error de carga, devolución, operación incorrecta, fraude, error de configuración u otros supuestos admitidos por el Programa, siempre que la reversión pueda efectuarse sin generar un saldo negativo de puntos para el Beneficiario.
La reversión no eliminará silenciosamente la operación original. El sistema impedirá las reversiones que impliquen que el saldo disponible resulte inferior a cero.
La imposibilidad de efectuar una reversión por falta de puntos disponibles no generará una deuda de puntos a cargo del Beneficiario.
## La operación original y su correspondiente reversión podrán conservarse como registros de trazabilidad.
Cuando PuntosClub detecte un error propio de cálculo, acreditación, registro o procesamiento, podrá realizar las correcciones necesarias para restablecer el funcionamiento correcto del Programa.
Estas correcciones podrán realizarse aun cuando el Beneficiario no hubiera presentado previamente un reclamo.
La facultad de corrección estará limitada a errores atribuibles al funcionamiento de PuntosClub y deberá conservar la trazabilidad correspondiente.
El saldo disponible de puntos no podrá ser inferior a cero.
## 18. Premios
Los Premios son ofrecidos y administrados por las Organizaciones.
La Organización es responsable de las características, disponibilidad, calidad, condiciones y entrega de los Premios que ofrece dentro de su Programa, de acuerdo con la legislación aplicable.
PuntosClub proporciona las herramientas tecnológicas para su publicación y gestión.
## 19. Canjes
El Canje se produce cuando el Beneficiario confirma la utilización de sus puntos para solicitar un Premio.
El Canje podrá permanecer pendiente hasta que el Premio sea entregado o hasta que se produzca otro estado definido por la Organización.
Los Canjes podrán encontrarse, entre otros, en estado pendiente, entregado o cancelado/revertido.
## 20. Cancelación de Canjes
Los Canjes podrán ser cancelados o revertidos por la Organización o por un Cajero autorizado.
Cuando un Canje sea cancelado, los puntos utilizados serán restituidos al Beneficiario, conforme al funcionamiento del sistema.
El Beneficiario no dispondrá, en principio, de una función de cancelación directa desde la plataforma.
Las condiciones particulares que la Organización establezca respecto de los Canjes deberán ser comunicadas de manera adecuada a los Beneficiarios.
## 21. Organización que finaliza su Programa
Cuando una Organización deje de operar en PuntosClub, su Programa podrá dejar de estar disponible para nuevas operaciones y dejará de aparecer en el catálogo de Programas del Beneficiario.
Los puntos asociados a dicho Programa dejarán de ser reclamables o utilizables, conforme a las condiciones aplicables.
Sin perjuicio de ello, los Canjes pendientes que ya hubieran sido confirmados podrán permanecer disponibles para el Beneficiario a efectos de reclamar el Premio correspondiente.
La Organización continuará siendo responsable de resolver las obligaciones derivadas de dichos Canjes.
## 22. Comunicaciones comerciales
Las Organizaciones podrán utilizar las herramientas de PuntosClub para enviar comunicaciones comerciales mediante notificaciones push a los Beneficiarios que participen de su Programa.
Actualmente, las comunicaciones comerciales de una Organización podrán dirigirse a todos los Beneficiarios de su Programa.
La Organización no podrá utilizar esta herramienta para comunicarse con Beneficiarios que no participen de su Programa.
## 23. Moderación de comunicaciones
Los mensajes comerciales creados por las Organizaciones podrán ser sometidos a un mecanismo automatizado de moderación mediante inteligencia artificial antes de su envío.
El sistema podrá impedir el envío cuando determine que el contenido no cumple las reglas aplicables al canal, incluyendo contenido ofensivo, discriminatorio, amenazante, ilegal, abusivo o incompatible con una comunicación comercial permitida.
La aprobación del mensaje por el sistema de moderación no implica que PuntosClub garantice la veracidad, legalidad, exactitud o cumplimiento de la promoción ofrecida por la Organización.
La responsabilidad por el contenido comercial corresponde a la Organización que lo crea y envía.
## 24. Conductas prohibidas
El Beneficiario no podrá:
- crear cuentas fraudulentas
- utilizar datos de terceros
- compartir deliberadamente sus credenciales
- manipular puntos
- intentar generar puntos indebidamente
- explotar errores del sistema
- acceder a información ajena
- interferir con el funcionamiento de PuntosClub
- utilizar mecanismos automatizados no autorizados
- realizar actividades fraudulentas o ilícitas
- intentar eludir mecanismos de seguridad.
## 25. Fraude y seguridad
PuntosClub podrá investigar actividades que presenten indicios razonables de fraude, abuso, manipulación o utilización indebida de la plataforma.
Podrá adoptar medidas proporcionales, incluyendo solicitudes de verificación, suspensión temporal, bloqueo, reversión de operaciones, cancelación de puntos obtenidos fraudulentamente y cancelación de cuentas.
Las Organizaciones también podrán adoptar medidas respecto de operaciones realizadas dentro de sus propios Programas, conforme a sus facultades y responsabilidades.
## 26. Uso indebido por Organizaciones
PuntosClub podrá intervenir frente a Organizaciones que utilicen la plataforma de manera abusiva, fraudulenta o contraria a estos Términos.
Entre otras medidas, podrá restringir funcionalidades, suspender usuarios administrativos, suspender temporalmente el Programa, bloquear determinadas operaciones o cancelar el acceso de la Organización.
PuntosClub no podrá ser utilizado por una Organización para obtener acceso a información de Beneficiarios fuera del alcance de su propio Programa.
## 27. Responsabilidades
Cada participante será responsable de aquello que se encuentre bajo su control.
PuntosClub. Responsable de la plataforma tecnológica y de su funcionamiento dentro de sus obligaciones.
Organización. Responsable del Programa, reglas, campañas, premios, condiciones comerciales, información proporcionada, disponibilidad y entrega de premios.
Cajero. Responsable de las operaciones que ingrese y confirme dentro de las funciones que la Organización le haya autorizado.
Beneficiario. Responsable de la información proporcionada, protección de sus credenciales, utilización legítima de la cuenta y cumplimiento de las condiciones de cada Programa.
## 28. Reclamos
Los reclamos relacionados con una Organización deberán dirigirse inicialmente a la Organización correspondiente cuando se trate de premios, disponibilidad, entrega, compras, condiciones comerciales, errores de carga o reglas configuradas por la Organización.
Los reclamos relacionados con el funcionamiento técnico de PuntosClub podrán dirigirse a hola@puntosclub.com.ar.
Las cuestiones relacionadas con datos personales deberán dirigirse a dpo@puntosclub.com.ar.
Nada de lo establecido en estos Términos pretende limitar derechos que correspondan al consumidor conforme a la legislación aplicable.
## 29. Suspensión de la cuenta PuntosClub
PuntosClub podrá suspender temporalmente una cuenta cuando resulte necesario para proteger la seguridad, investigar actividad sospechosa, prevenir fraude, cumplir obligaciones legales, proteger a otros usuarios o proteger la integridad de la plataforma.
La suspensión preventiva no implica necesariamente que se haya determinado que el Beneficiario cometió una infracción.
Cuando resulte razonablemente posible y no exista impedimento legal o de seguridad, PuntosClub podrá comunicar al usuario la medida adoptada y los mecanismos disponibles para solicitar una revisión.
## 30. Cancelación de la cuenta por PuntosClub
PuntosClub podrá cancelar una cuenta cuando existan circunstancias graves que lo justifiquen, incluyendo fraude comprobado, utilización ilícita o incumplimientos graves de estos Términos.
La cancelación no implica necesariamente la eliminación inmediata de todos los registros cuando exista una obligación legal o una finalidad legítima que justifique su conservación.
## 31. Baja voluntaria
El Beneficiario podrá solicitar la eliminación de su cuenta.
Antes de confirmar la eliminación completa, PuntosClub deberá advertir que la acción implica, entre otras consecuencias: pérdida de la cuenta; pérdida de los puntos acumulados en todos los Programas; pérdida de acceso a los Programas; pérdida de acceso a Canjes pendientes; y pérdida de acceso al historial.
La eliminación será ejecutada conforme a la Política de Privacidad y a las excepciones legales aplicables.
## 32. Propiedad intelectual
PuntosClub y ADAMANTIO SAS conservan los derechos correspondientes sobre la plataforma, software, código, diseño, interfaces, marca, contenidos propios y demás elementos protegidos.
El uso de PuntosClub no transfiere al Beneficiario ningún derecho de propiedad sobre dichos elementos.
Queda prohibida la utilización no autorizada, copia, modificación, distribución, ingeniería inversa o explotación de los componentes de PuntosClub, salvo cuando la legislación aplicable disponga lo contrario.
## 33. Disponibilidad del servicio
PuntosClub realizará esfuerzos razonables para mantener la disponibilidad y seguridad de la plataforma.
No obstante, pueden producirse interrupciones derivadas de mantenimiento, actualizaciones, fallas técnicas, problemas de conectividad, incidentes de seguridad, circunstancias externas, fuerza mayor u otros acontecimientos fuera del control razonable de PuntosClub.
Esta disposición no limita responsabilidades que legalmente no puedan excluirse.
## 34. Modificación de la plataforma
PuntosClub podrá incorporar, modificar, mejorar o retirar funcionalidades de la plataforma.
Las modificaciones tecnológicas no afectarán retroactivamente operaciones ya confirmadas, salvo cuando resulte necesario corregir un error, fraude, incumplimiento o situación similar conforme a estos Términos y la legislación aplicable.
## 35. Modificación de los Términos
PuntosClub podrá modificar estos Términos.
Cuando exista una nueva versión, se comunicará al Beneficiario de acuerdo con los mecanismos disponibles.
La nueva versión indicará su fecha de entrada en vigencia.
Cuando la aceptación sea necesaria, el Beneficiario deberá aceptarla para continuar utilizando aquellas funcionalidades respecto de las cuales la aceptación resulte requerida.
Si el Beneficiario no acepta la nueva versión y decide dejar de utilizar PuntosClub, podrá iniciar el proceso de baja y eliminación de cuenta.
## 36. Comunicaciones necesarias
PuntosClub podrá enviar comunicaciones necesarias para seguridad, recuperación de cuenta, operaciones, puntos, Canjes, funcionamiento del servicio, cambios relevantes, modificaciones de estos Términos y cuestiones relacionadas con la cuenta.
Estas comunicaciones son distintas de las comunicaciones comerciales.
## 37. Protección de datos personales
El tratamiento de los datos personales se encuentra regulado por la Política de Privacidad de PuntosClub.
La Política de Privacidad explica qué información se recopila, para qué se utiliza, quién puede acceder, cómo se protege, cómo se conserva y cómo puede solicitarse su modificación o eliminación.
## 38. Legislación aplicable
Estos Términos se regirán por las leyes de la República Argentina, sin perjuicio de los derechos y normas imperativas que resulten aplicables al Beneficiario.
La jurisdicción específica será determinada en la versión definitiva de estos Términos conforme al domicilio legal de ADAMANTIO SAS y a las normas aplicables, especialmente aquellas relativas a relaciones de consumo.
## 39. Vigencia
Estos Términos entrarán en vigencia en la fecha indicada en la versión correspondiente.
Cada versión deberá identificarse mediante número o denominación de versión, fecha de publicación y fecha de entrada en vigencia.
PuntosClub conservará evidencia de la versión aceptada por cada usuario conforme a las reglas de conservación aplicables.
Salvedades incorporadas en V1.1
- Las reversiones del Owner no podrán ejecutarse cuando impliquen un saldo inferior a cero.
- El sistema deberá impedir técnicamente dichas reversiones.
- El Beneficiario nunca tendrá un saldo negativo ni una deuda de puntos como consecuencia de una reversión.
- Si el error es atribuible a PuntosClub, PuntosClub podrá corregirlo sin generar saldo negativo ni deuda de puntos.
- Las operaciones originales y sus correcciones/reversiones deberán mantener trazabilidad.
## Estado del documento
V1.0 — Borrador funcional/jurídico para revisión profesional.
Este documento constituye un borrador de trabajo basado en las decisiones funcionales definidas para PuntosClub. Antes de su publicación, deberá ser revisado y validado por un profesional del derecho en Argentina.
Cuestiones deliberadamente pendientes de validación jurídica: jurisdicción concreta; plazos específicos de conservación de determinados registros; y alcance exacto de responsabilidad de PuntosClub frente a relaciones de consumo.`;

export const PRIVACY_TEXT = `PuntosClub
Política de Privacidad
Versión 1.1
Fecha de vigencia: 24 de septiembre de 2026
## 1. Responsable del tratamiento
Esta Política establece cómo ADAMANTIO SAS, CUIT 30-71680750-5, trata los datos personales de las personas que utilizan PuntosClub.
PuntosClub es una plataforma tecnológica destinada a facilitar la relación entre organizaciones que administran programas de beneficios y las personas que participan de dichos programas.
Contacto general: hola@puntosclub.com.ar. Protección de datos personales: dpo@puntosclub.com.ar.
## 2. Alcance de esta Política
Esta Política se aplica a los datos personales tratados por PuntosClub en relación con creación de cuentas, utilización de la aplicación, participación en programas, operaciones, puntos, canjes, comunicaciones, seguridad, prevención del fraude y atención de solicitudes y reclamos.
Esta Política se refiere al tratamiento realizado por PuntosClub. Las Organizaciones que administran sus propios programas pueden estar sujetas además a sus propias obligaciones de privacidad respecto de tratamientos que realicen por fuera de PuntosClub.
## 3. ¿Qué datos recopilamos?
Datos obligatorios de registro: nombre, apellido, DNI, fecha de nacimiento, correo electrónico y contraseña.
Datos opcionales: teléfono y ubicación.
La ubicación podrá proporcionarse durante el registro o agregarse posteriormente desde el perfil.
Datos asociados al dispositivo y a los permisos que el Beneficiario otorgue:
- Cámara: la aplicación utiliza la cámara únicamente para leer códigos QR. Las imágenes se procesan en el dispositivo; no se almacenan ni se transmiten a PuntosClub. La aplicación no graba audio.
- Autenticación biométrica: si el Beneficiario la habilita, la verificación por huella o reconocimiento facial la realiza el sistema operativo del dispositivo. PuntosClub no recibe, no accede y no almacena datos biométricos.
- Identificador de notificaciones: cuando el Beneficiario acepta recibir notificaciones, el dispositivo genera un identificador (token de notificación) que se conserva para poder enviarle avisos y se elimina cuando revoca el permiso o cierra la sesión.
## 4. ¿Para qué utilizamos estos datos?
Administración de la cuenta: crear y administrar la cuenta, identificar al Beneficiario, permitir el acceso, recuperar el acceso y mantener la seguridad.
Participación en programas: vincular al Beneficiario con los programas que elija, administrar sus puntos, registrar operaciones, administrar canjes, mostrar historial y permitir el funcionamiento de las funcionalidades del programa.
Prevención de duplicaciones y fraude: el DNI podrá utilizarse para identificar al Beneficiario, evitar cuentas duplicadas, colaborar en seguridad e investigar posibles usos fraudulentos.
La fecha de nacimiento podrá utilizarse para determinar la edad cuando resulte necesario para aplicar restricciones, verificar requisitos, habilitar futuras funcionalidades o cumplir obligaciones legales.
## 5. Email
El correo electrónico podrá utilizarse para creación de la cuenta, autenticación, recuperación de acceso, seguridad, comunicaciones necesarias, información relacionada con la cuenta y modificaciones importantes del servicio.
Cuando corresponda, podrá utilizarse para comunicaciones comerciales conforme a las preferencias del Beneficiario.
## 6. Teléfono
El teléfono es opcional. Cuando sea proporcionado, podrá utilizarse para funcionalidades o comunicaciones que PuntosClub habilite y que requieran este medio de contacto.
## 7. Ubicación
La ubicación es un dato opcional. El Beneficiario podrá proporcionarla durante el registro o incorporarla posteriormente desde su perfil.
PuntosClub podrá utilizar esta información para generar información estadística y geográfica agregada sobre la distribución de los participantes.
PuntosClub no pondrá a disposición de las Organizaciones la ubicación exacta individual del Beneficiario. Las Organizaciones podrán acceder, cuando corresponda, a representaciones geográficas agregadas o no exactas.
La configuración técnica deberá procurar que estas representaciones no permitan identificar indirectamente el domicilio o ubicación de una persona determinada.
## 8. Información generada por el uso de PuntosClub
Puede incluir programas a los que el Beneficiario está suscripto, puntos, operaciones, canjes, historial, estados de operaciones y registros relacionados con la seguridad de la cuenta.
Esta información se utiliza para prestar y administrar el servicio.
## 9. ¿Qué información puede ver una Organización?
Una Organización solamente podrá acceder a información relacionada con los Beneficiarios que participen de su propio Programa, dentro de las funcionalidades habilitadas.
Podrá acceder, según corresponda, a nombre, apellido, puntos, operaciones, canjes, historial relacionado con su Programa e información geográfica agregada/no exacta.
## 10. ¿Qué información NO puede ver una Organización?
Las Organizaciones no tendrán acceso a la base general de Beneficiarios de PuntosClub.
Tampoco tendrán acceso a DNI, correo electrónico, teléfono, contraseña, fecha de nacimiento, ubicación exacta o información de otros programas.
## 11. Información de otros programas
Un Beneficiario puede participar simultáneamente en varios programas. La participación en un Programa no permite a una Organización conocer los programas, puntos, operaciones o canjes de otros programas.
PuntosClub aplicará controles de acceso destinados a limitar la información disponible a cada Organización según su propio Programa.
## 12. Tratamiento de puntos, operaciones y canjes
PuntosClub tratará información relacionada con asignación de puntos, cálculo, operaciones, reversiones, correcciones, canjes, cancelaciones y entrega de premios.
Esta información es necesaria para administrar los programas y mantener la trazabilidad de las operaciones.
## 13. Comunicaciones necesarias
PuntosClub podrá enviar comunicaciones necesarias para el funcionamiento de la cuenta y del servicio, incluyendo recuperación de contraseña, seguridad, operaciones, puntos, canjes, modificaciones importantes y cuestiones relacionadas con la cuenta.
Estas comunicaciones son diferentes de las comunicaciones comerciales.
## 14. Comunicaciones comerciales de PuntosClub
PuntosClub podrá enviar comunicaciones comerciales cuando corresponda y de acuerdo con las preferencias del Beneficiario y la legislación aplicable.
El Beneficiario podrá gestionar sus preferencias mediante las funcionalidades que PuntosClub habilite.
## 15. Comunicaciones comerciales de las Organizaciones
Las Organizaciones pueden utilizar el motor de notificaciones de PuntosClub para enviar comunicaciones comerciales mediante notificaciones push a los Beneficiarios que participan de su Programa.
Actualmente, una Organización podrá enviar esas comunicaciones a todos los Beneficiarios de su propio Programa y no podrá utilizarlas para personas que no participen de él.
## 16. Moderación mediante inteligencia artificial
Los mensajes comerciales creados por las Organizaciones podrán ser sometidos, antes de su envío, a un mecanismo automatizado de moderación mediante inteligencia artificial.
El sistema podrá impedir el envío cuando detecte contenido incompatible con una comunicación comercial permitida, incluyendo lenguaje ofensivo, insultos, amenazas, discriminación, contenido sexual inapropiado, violencia, ilegalidad, acoso o abuso manifiesto.
La IA realiza la auditoría necesaria para determinar si el mensaje puede enviarse. PuntosClub no conserva el contenido del mensaje como un registro permanente de moderación por esta finalidad.
## 17. Responsabilidad por las comunicaciones
La moderación no significa que PuntosClub certifique la veracidad, precio, disponibilidad, condiciones comerciales, legalidad integral o cumplimiento de la promoción.
La Organización que crea y envía la comunicación continúa siendo responsable de su contenido y de la promoción ofrecida.
## 18. Seguridad
PuntosClub implementará medidas técnicas y organizativas razonables destinadas a proteger los datos personales contra acceso no autorizado, pérdida, alteración, divulgación indebida, destrucción y utilización no autorizada.
Las medidas podrán incluir controles de acceso, autenticación, gestión de permisos, seguridad de las comunicaciones y registros necesarios para proteger la plataforma.
## 19. Credenciales
Las contraseñas y credenciales son personales. PuntosClub implementará medidas razonables para protegerlas. Los Beneficiarios deberán mantenerlas confidenciales.
Cuando el Beneficiario habilita el desbloqueo biométrico, la verificación la realiza el sistema operativo del dispositivo y PuntosClub únicamente recibe su resultado.
## 20. Prevención del fraude
PuntosClub podrá tratar información necesaria para detectar actividades sospechosas, investigar fraude, prevenir abusos, proteger la plataforma y a sus usuarios e investigar operaciones potencialmente fraudulentas.
Cuando resulte necesario y legalmente procedente, determinada información podrá conservarse durante el período necesario para estas finalidades.
## 21. Bloqueos y medidas de seguridad
PuntosClub podrá utilizar información personal para adoptar medidas frente a cuentas duplicadas, fraude, accesos no autorizados, manipulación de operaciones, explotación de errores o incumplimientos de seguridad.
Estas medidas pueden incluir bloqueo temporal, suspensión, investigación y cancelación.
## 22. Conservación de datos
PuntosClub no establece actualmente un único período general de conservación aplicable a todos los datos.
La información será conservada durante el período necesario para cumplir las finalidades para las que fue recopilada y, cuando corresponda, cumplir obligaciones legales, resolver controversias, proteger la seguridad, investigar fraude, ejercer o defender derechos y mantener evidencia de determinadas operaciones o aceptaciones.
Cuando los datos dejen de resultar necesarios o pertinentes, serán eliminados, anonimizados o tratados conforme resulte jurídicamente procedente.
## 23. Cuenta inactiva
La falta de utilización de PuntosClub no implica automáticamente la eliminación de la cuenta ni de sus datos.
## 24. Eliminación de la cuenta
El Beneficiario podrá solicitar la eliminación de su cuenta.
Antes de confirmar una eliminación completa, PuntosClub deberá informar que implica la pérdida de los puntos acumulados en todos los programas, acceso a programas, canjes pendientes e historial asociado.
Una vez confirmada, los datos personales serán eliminados cuando corresponda, los puntos serán eliminados, la participación será eliminada/desvinculada y los canjes e historial dejarán de estar disponibles.
## 25. Excepciones a la eliminación
La eliminación no necesariamente implicará destrucción inmediata de toda información cuando exista obligación legal de conservarla, sea necesaria para proteger derechos o intereses legítimos, investigar o prevenir fraude, mantener evidencia de una aceptación o exista otra base jurídica que permita o exija su conservación.
## 26. Registros de aceptación
PuntosClub podrá conservar determinados registros mínimos relacionados con la aceptación de Términos, Política de Privacidad u otras condiciones jurídicamente relevantes.
Podrán incluir versión del documento, fecha, hora e identificación necesaria para acreditar la aceptación. El alcance y período de conservación deberá ser validado jurídicamente.
## 27. Derechos del titular
El Beneficiario podrá ejercer los derechos reconocidos por la normativa aplicable, incluyendo acceso, rectificación, actualización, supresión, confidencialidad cuando corresponda e información sobre el tratamiento.
## 28. Cómo ejercer los derechos
Mientras no exista un módulo específico en la aplicación, las solicitudes podrán enviarse a dpo@puntosclub.com.ar.
La solicitud deberá permitir verificar razonablemente la identidad del solicitante.
## 29. Acceso a los datos
El Beneficiario podrá solicitar información sobre los datos personales que PuntosClub trate respecto de él. La respuesta se realizará conforme a los requisitos y plazos legales.
## 30. Rectificación y actualización
El Beneficiario podrá solicitar la corrección o actualización de información incorrecta, incompleta o desactualizada. Cuando sea posible, también podrá modificar determinados datos desde su perfil.
## 31. Supresión
El Beneficiario podrá solicitar la supresión de sus datos cuando corresponda. La solicitud será evaluada conforme a la legislación y sus excepciones.
## 32. Datos sensibles
PuntosClub no solicita como parte del registro ordinario información especialmente sensible, como salud, afiliación sindical, opiniones políticas, convicciones religiosas, origen racial o étnico o vida sexual.
El Beneficiario no deberá incorporar voluntariamente este tipo de información en campos no destinados específicamente para ello.
## 33. Menores de edad
Actualmente PuntosClub no establece una restricción general de edad para crear cuentas.
La fecha de nacimiento se solicita para determinar la edad cuando resulte necesario.
El tratamiento de datos de niñas, niños y adolescentes deberá adecuarse a la normativa aplicable y será revisado antes de implementar funcionalidades específicas por edad.
Este punto queda expresamente sujeto a revisión legal antes del lanzamiento.
## 34. Organizaciones
Las Organizaciones reciben únicamente la información necesaria para administrar sus propios programas dentro de las funcionalidades habilitadas por PuntosClub.
No podrán utilizar las herramientas para acceder a la base general de Beneficiarios.
La determinación jurídica exacta del rol de cada Organización respecto del tratamiento de datos deberá ser validada antes de la publicación definitiva.
## 35. Terceros y proveedores
PuntosClub se apoya en proveedores tecnológicos que tratan datos personales por su cuenta y conforme a sus instrucciones:
- Supabase: infraestructura de base de datos, autenticación y almacenamiento, donde residen los datos de las cuentas y de los programas.
- Expo: envío de notificaciones push y distribución de actualizaciones de la aplicación. Trata el identificador de notificaciones del dispositivo.
- Google: cuando el Beneficiario utiliza el buscador de direcciones, el texto que escribe y la dirección que selecciona se consultan contra el servicio de Google para completar los datos de domicilio.
Estos proveedores actúan como encargados del tratamiento y no disponen de los datos para finalidades propias.
## 36. Futuros proveedores
PuntosClub podrá incorporar proveedores tecnológicos u otros terceros cuando sean necesarios para prestar, mantener, proteger o mejorar sus servicios.
Antes de incorporar un proveedor que trate datos personales se evaluarán información procesada, finalidad, ubicación, seguridad, condiciones contractuales, rol jurídico, transferencias internacionales y garantías.
## 37. Transferencias internacionales
Los proveedores indicados en la sección 35 tratan los datos fuera de la República Argentina, principalmente en los Estados Unidos de América.
Esto implica una transferencia internacional de datos personales, realizada al solo efecto de prestar el servicio y sujeta a las condiciones contractuales acordadas con cada proveedor.
Al utilizar PuntosClub el Beneficiario queda informado de esta circunstancia. Ante cualquier consulta puede escribir a dpo@puntosclub.com.ar.
## 38. Registro de bases de datos
PuntosClub evaluará las obligaciones aplicables a sus bases de datos personales y realizará las inscripciones o actualizaciones que correspondan ante el Registro Nacional de Bases de Datos Personales.
Este punto deberá ser validado por el abogado antes del lanzamiento.
## 39. Incidentes de seguridad
Ante un incidente que pueda comprometer datos personales, PuntosClub podrá adoptar medidas para contenerlo, investigar su alcance, proteger cuentas, mitigar riesgos, corregir vulnerabilidades y cumplir obligaciones legales.
Las obligaciones de comunicación a titulares o autoridades serán determinadas conforme a la normativa aplicable y las circunstancias del incidente.
## 40. Cambios en esta Política
PuntosClub podrá modificar esta Política para reflejar cambios en el servicio, nuevas funcionalidades, cambios legales, incorporación de proveedores, modificaciones en finalidades o mejoras en privacidad.
Cuando corresponda, se comunicará al Beneficiario una nueva versión, identificando número o denominación, fecha de publicación y fecha de entrada en vigencia.
## 41. Contacto
Consultas generales: hola@puntosclub.com.ar
Derechos relacionados con datos personales: dpo@puntosclub.com.ar
## 42. Autoridad de control
La autoridad de aplicación en materia de protección de datos personales en Argentina es la Agencia de Acceso a la Información Pública (AAIP).
El Beneficiario podrá recurrir a los mecanismos previstos por la normativa aplicable cuando considere que sus derechos no fueron atendidos adecuadamente.`;
