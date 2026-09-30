import { LegalLayout, type LegalSectionContent } from '../components/LegalLayout';

const email = 'tictacagencyperformance@gmail.com';

const sections: LegalSectionContent[] = [
  {
    id: 'responsable', title: '1. Responsable del tratamiento', content: <p>TIC TAC AGENCY PERFORMANCE SAS, NIT 901.884.496-0, con domicilio en Cr 90 No. 8-10, Ap 614, Torre 4, Bogotá D.C., Colombia, es responsable del tratamiento de los datos personales descritos aquí. Contacto de privacidad: <a href={`mailto:${email}`}>{email}</a>; teléfono: 322 204 6768.</p>
  },
  {
    id: 'datos', title: '2. Datos que tratamos', content: <><ul><li>Datos de cuenta: nombre, correo electrónico, empresa y datos de contacto que usted proporcione.</li><li>Datos de Meta: identificadores de cuentas publicitarias, campañas, conjuntos de anuncios, anuncios, métricas y credenciales o tokens necesarios para una conexión autorizada.</li><li>Datos de Google Ads: información equivalente cuando usted conecte esa plataforma y la integración esté habilitada.</li><li>Datos técnicos: dirección IP, navegador, dispositivo y registros de uso necesarios para operación y seguridad.</li><li>Contenido que usted ingrese o genere en la plataforma: briefs, estrategias, textos y creatividades.</li></ul><p>La integración publicitaria de Meta consulta métricas de resultados, incluidos conteos de clientes potenciales, e identificadores y nombres de formularios. No consulta los registros individuales ni los datos de contacto de las personas que ven o interactúan con los anuncios.</p></>
  },
  {
    id: 'origen', title: '3. Cómo obtenemos los datos', content: <p>Recibimos los datos que usted ingresa directamente y, cuando una integración esté habilitada, los que autorice compartir desde Meta o Google mediante sus mecanismos de acceso, incluido OAuth cuando corresponda. El acceso se limita a los permisos y recursos autorizados por usted.</p>
  },
  {
    id: 'finalidades', title: '4. Finalidades del tratamiento', content: <p>Usamos los datos para crear y administrar la cuenta; preparar campañas y, tras la aprobación expresa del usuario, crear los recursos publicitarios en Meta en estado pausado para que el usuario los revise y active; mostrar métricas, análisis y sugerencias de optimización; prestar soporte; gestionar la suscripción cuando exista un plan contratado; prevenir abusos y mejorar el servicio.</p>
  },
  {
    id: 'terceros', title: '5. Proveedores y terceros', content: <><p>Podemos comunicar los datos estrictamente necesarios a proveedores que apoyen la operación: Gemini/Google para estrategias y análisis asistidos por IA; Vercel para alojamiento; y Supabase para autenticación, base de datos y almacenamiento. Si se habilitan pagos mediante una pasarela, informaremos al usuario qué proveedor los procesa antes de contratar o efectuar un pago.</p><p>Algunos de estos proveedores pueden tratar datos fuera de Colombia. Cuando actúen por cuenta de TIC TAC AGENCY PERFORMANCE SAS como encargados del tratamiento, la comunicación será una transmisión internacional sujeta a las obligaciones y salvaguardas aplicables. Si un proveedor actúa como responsable independiente, solo realizaremos la transferencia internacional cuando exista una base legal válida y se cumplan los requisitos de autorización y protección exigidos por la ley. No vendemos datos personales.</p></>
  },
  {
    id: 'meta', title: '6. Datos obtenidos de Meta', content: <p>Los datos obtenidos de la Plataforma de Meta se utilizan únicamente para las funciones de Tico descritas en esta política y autorizadas por el usuario. No se transfieren a intermediarios de datos ni se usan para publicidad ajena al servicio. Tratamos esos datos de acuerdo con las Políticas de la Plataforma de Meta aplicables.</p>
  },
  {
    id: 'seguridad-conservacion', title: '7. Almacenamiento, seguridad y conservación', content: <><p>Aplicamos controles de acceso, protección de credenciales y transmisión cifrada para reducir el riesgo de acceso no autorizado. Los tokens de integración se protegen y no se publican como parte de la información visible a otros usuarios.</p><p>Conservamos los datos de cuenta, campañas, métricas y contenido mientras la cuenta permanezca activa y sean necesarios para prestar el servicio. Cuando proceda la supresión solicitada, eliminaremos los datos operativos bajo nuestro control, incluidos los tokens, de los sistemas activos dentro de los plazos de atención de reclamos de la sección 8. Las copias de respaldo administradas por proveedores se depuran conforme a sus ciclos de retención; si se restaura una copia anterior, volveremos a aplicar la solicitud de eliminación.</p><p>Los registros técnicos ordinarios bajo nuestro control se conservarán por un máximo de <strong>90 días</strong>, salvo que un incidente de seguridad o una obligación legal justifique conservar los registros pertinentes por más tiempo. Los proveedores pueden conservar registros técnicos conforme a sus propios plazos; puede solicitar detalles por nuestro canal de privacidad. Los documentos contables o contractuales sujetos a conservación legal se mantendrán solo durante el plazo exigible y con acceso restringido. No utilizaremos esos documentos retenidos para operar campañas ni para nuevos análisis de IA.</p></>
  },
  {
    id: 'derechos', title: '8. Derechos del titular y atención de solicitudes', content: <><p>Conforme a la Ley 1581 de 2012, usted puede conocer, actualizar y rectificar sus datos, solicitar prueba de su autorización, conocer su uso, solicitar la supresión y revocar la autorización cuando proceda. TIC TAC AGENCY PERFORMANCE SAS atiende estas solicitudes a través de <a href={`mailto:${email}`}>{email}</a>. Envíe su consulta o reclamo desde el correo asociado a su cuenta o incluya información suficiente para verificar su identidad e indique los hechos y la solicitud concreta. También puede adjuntar documentos de soporte.</p><p>Las consultas se responderán en un máximo de <strong>10 días hábiles</strong> desde su recepción. Si no es posible atenderlas en ese plazo, le informaremos los motivos antes de su vencimiento y la nueva fecha de respuesta, que no podrá superar los <strong>5 días hábiles</strong> siguientes.</p><p>Los reclamos de corrección, actualización o supresión se resolverán en un máximo de <strong>15 días hábiles</strong> contados desde el día siguiente a su recepción. Cuando proceda la supresión, eliminaremos los datos de los sistemas activos dentro de ese mismo plazo. Si no es posible atender el reclamo en ese plazo, le informaremos los motivos antes de su vencimiento y la nueva fecha, que no podrá superar los <strong>8 días hábiles</strong> siguientes. Si el reclamo está incompleto, le solicitaremos la información necesaria para tramitarlo. Si considera que no se atendieron sus derechos, puede acudir a la Superintendencia de Industria y Comercio.</p></>
  },
  {
    id: 'eliminacion', title: '9. Eliminación de datos', content: <p>Puede solicitar la eliminación en cualquier momento. Consulte los pasos, el alcance y el plazo en nuestra página de <a href="/data-deletion">Eliminación de datos</a>. Revocar una integración en Meta o Google impide nuevos accesos, pero debe enviarnos también la solicitud si desea eliminar datos ya almacenados por Tico.</p>
  },
  {
    id: 'cookies', title: '10. Cookies y tecnologías similares', content: <p>Tico utiliza almacenamiento local y de sesión, así como las cookies técnicas que puedan requerir sus proveedores, para mantener la sesión, recordar preferencias, proteger conexiones y permitir el funcionamiento de la plataforma. En este momento no usamos herramientas propias de analítica o publicidad basadas en cookies. Si incorporamos esas herramientas, actualizaremos esta política antes de utilizarlas.</p>
  },
  {
    id: 'menores', title: '11. Menores de edad', content: <p>Tico no está dirigido a personas menores de 18 años. Si detectamos una cuenta de un menor, tomaremos las medidas necesarias para cerrar la cuenta y eliminar los datos que no deban conservarse legalmente.</p>
  },
  {
    id: 'cambios', title: '12. Cambios a esta política', content: <p>Publicaremos cualquier actualización en esta página con la fecha correspondiente. Si un cambio afecta de forma sustancial las finalidades o derechos del titular, informaremos a los usuarios registrados y solicitaremos una nueva autorización cuando sea necesaria.</p>
  },
  {
    id: 'contacto', title: '13. Contacto de privacidad', content: <p>Escriba a <a href={`mailto:${email}`}>{email}</a>, llame al 322 204 6768 o dirija su comunicación a Cr 90 No. 8-10, Ap 614, Torre 4, Bogotá D.C., Colombia.</p>
  }
];

export function Privacy() {
  return <LegalLayout title="Política de Privacidad" introduction={<p>Esta política explica qué datos trata Tico, para qué los utiliza y cómo puede ejercer sus derechos.</p>} sections={sections} />;
}
