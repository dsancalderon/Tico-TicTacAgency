import { LegalLayout, type LegalSectionContent } from '../components/LegalLayout';
import { legalHref } from '../legalPaths';

const email = 'tictacagencyperformance@gmail.com';

const sections: LegalSectionContent[] = [
  {
    id: 'responsable', title: '1. Responsable del servicio', content: <p>Tico es ofrecido por TIC TAC AGENCY PERFORMANCE SAS, NIT 901.884.496-0, con domicilio en Cr 90 No. 8-10, Ap 614, Torre 4, Bogotá D.C., Colombia. Puede contactarnos en <a href={`mailto:${email}`}>{email}</a> o al 322 204 6768.</p>
  },
  {
    id: 'aceptacion', title: '2. Aceptación de los términos', content: <p>Al crear una cuenta o utilizar Tico, usted acepta estos Términos y Condiciones. Si actúa en nombre de una empresa, declara estar autorizado para vincularla. Si no está de acuerdo, debe abstenerse de usar el servicio.</p>
  },
  {
    id: 'servicio', title: '3. Descripción del servicio', content: <p>Tico es una plataforma por suscripción que ayuda a planear, implementar, administrar y analizar campañas de publicidad digital mediante herramientas de IA, paneles de seguimiento e integraciones con Meta Ads, Google Ads y proveedores de IA. Algunas funciones pueden habilitarse de forma gradual y estarán sujetas a la disponibilidad de las integraciones correspondientes.</p>
  },
  {
    id: 'cuenta', title: '4. Registro, cuenta y elegibilidad', content: <p>El servicio está dirigido a personas mayores de 18 años. Usted debe proporcionar información veraz y actualizada, proteger sus credenciales y avisarnos si detecta un acceso no autorizado a su cuenta.</p>
  },
  {
    id: 'autorizacion', title: '5. Acceso a cuentas publicitarias', content: <p>Cuando una integración esté disponible, usted podrá autorizar el acceso a sus cuentas publicitarias mediante el mecanismo admitido por Meta o Google, incluido OAuth cuando corresponda. Tico accederá únicamente a las cuentas, permisos y datos autorizados para prestar las funciones solicitadas. Puede revocar el acceso desde Meta o Google y solicitar la eliminación de los datos conservados por Tico conforme a nuestra <a href={legalHref('/data-deletion')}>página de eliminación de datos</a>. Revocar el acceso en una plataforma no equivale por sí solo a solicitar la eliminación de los datos almacenados en Tico.</p>
  },
  {
    id: 'uso-aceptable', title: '6. Uso aceptable', content: <p>Usted debe cumplir las leyes aplicables y las políticas publicitarias de Meta y Google. Está prohibido usar Tico para contenido ilegal, engañoso o discriminatorio, vulnerar derechos de terceros, eludir controles de seguridad o acceder sin autorización a cuentas ajenas.</p>
  },
  {
    id: 'inteligencia-artificial', title: '7. Contenido generado por IA', content: <p>Las estrategias, campañas, segmentaciones, textos y análisis generados por IA son sugerencias automatizadas que pueden contener errores. Usted debe revisarlos y aprobarlos antes de su publicación o activación. Tras la aprobación del usuario, Tico crea los recursos publicitarios en Meta Ads en estado pausado; solo el usuario decide cuándo activarlos. Tico no garantiza ventas, conversiones ni resultados específicos.</p>
  },
  {
    id: 'inversion', title: '8. Inversión publicitaria', content: <p>El presupuesto de pauta es independiente de la suscripción a Tico. Cuando se activen campañas, el usuario pagará la inversión publicitaria directamente a Meta o Google según la configuración de sus propias cuentas. El usuario controla y supervisa su presupuesto, la activación y los cargos de las plataformas publicitarias; no garantizamos el rendimiento de las campañas.</p>
  },
  {
    id: 'suscripcion', title: '9. Suscripción, pagos y cancelación', content: <><p>El valor de la suscripción y las condiciones del plan se informan en la plataforma o al momento de contratar el servicio, antes de confirmar el pago. Allí se indicarán el período de facturación, los impuestos aplicables, el medio de pago, las condiciones de renovación y cancelación y los posibles reembolsos, cuando correspondan.</p><p>La inversión publicitaria se paga por separado a Meta o Google. Para consultar las condiciones de su plan o solicitar la cancelación de una suscripción activa, escriba a <a href={`mailto:${email}`}>{email}</a>.</p></>
  },
  {
    id: 'propiedad-intelectual', title: '10. Propiedad intelectual', content: <p>Las marcas Tico y TicTac Agency, el software, el diseño y los contenidos propios del servicio pertenecen a TIC TAC AGENCY PERFORMANCE SAS o a sus licenciantes. Usted conserva la titularidad de sus datos, cuentas publicitarias y materiales que aporte. El uso del servicio no transfiere derechos de propiedad intelectual.</p>
  },
  {
    id: 'datos-personales', title: '11. Protección de datos personales', content: <p>Tratamos los datos personales conforme a la Ley 1581 de 2012 y a nuestra <a href={legalHref('/privacy')}>Política de Privacidad</a>, donde explicamos finalidades, derechos, conservación y canales de contacto.</p>
  },
  {
    id: 'terceros', title: '12. Servicios de terceros', content: <p>Tico depende de servicios de terceros, entre ellos Meta, Google, proveedores de IA, alojamiento web y base de datos. Su disponibilidad, reglas y APIs pueden cambiar. Cuando usted conecte una cuenta de un tercero, también estará sujeto a las condiciones de esa plataforma.</p>
  },
  {
    id: 'disponibilidad', title: '13. Disponibilidad y modificaciones', content: <p>Procuramos mantener el servicio disponible, pero pueden ocurrir mantenimientos, interrupciones o cambios técnicos. Podremos modificar funciones para mejorar la seguridad, cumplir obligaciones aplicables o adaptarnos a cambios de las plataformas integradas.</p>
  },
  {
    id: 'responsabilidad', title: '14. Responsabilidad', content: <p>En la medida permitida por la ley aplicable, no respondemos por decisiones comerciales del usuario, resultados publicitarios, cambios en plataformas externas ni interrupciones ajenas a nuestro control. Esta cláusula no limita derechos que no puedan excluirse legalmente ni nuestra responsabilidad por actuaciones propias cuando la ley la imponga.</p>
  },
  {
    id: 'suspension', title: '15. Suspensión y terminación', content: <p>Podremos suspender el acceso si detectamos uso prohibido, un riesgo de seguridad o una obligación legal que lo exija. Comunicaremos el motivo cuando sea razonablemente posible. El usuario puede solicitar el cierre de su cuenta y la eliminación de sus datos según nuestra <a href={legalHref('/data-deletion')}>página de Eliminación de datos</a>, sin perjuicio de las obligaciones legales de conservación.</p>
  },
  {
    id: 'cambios', title: '16. Cambios a estos términos', content: <p>Si modificamos estos términos, publicaremos la nueva versión con su fecha de actualización en esta página. Cuando el cambio sea sustancial, también procuraremos avisar a los usuarios registrados por correo o dentro del servicio antes de que entre en vigor.</p>
  },
  {
    id: 'ley-aplicable', title: '17. Ley aplicable y jurisdicción', content: <p>Estos términos se rigen por las leyes de la República de Colombia. Las controversias se someterán a las autoridades y tribunales competentes de Bogotá D.C., sin perjuicio de las reglas de competencia o protección al consumidor que resulten obligatorias.</p>
  },
  {
    id: 'contacto', title: '18. Contacto', content: <p>Para dudas sobre el servicio o estos términos, escriba a <a href={`mailto:${email}`}>{email}</a> o llame al 322 204 6768.</p>
  }
];

export function Terms() {
  return <LegalLayout title="Términos y Condiciones" introduction={<p>Estas condiciones regulan el acceso y uso de Tico. Léalas antes de utilizar el servicio.</p>} sections={sections} />;
}
