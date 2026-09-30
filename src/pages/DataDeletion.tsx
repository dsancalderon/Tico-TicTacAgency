import { LegalLayout, type LegalSectionContent } from '../components/LegalLayout';
import { legalHref } from '../legalPaths';

const email = 'tictacagencyperformance@gmail.com';
const deletionMailto = `mailto:${email}?subject=${encodeURIComponent('Eliminación de datos')}&body=${encodeURIComponent('Hola, solicito la eliminación de mis datos de Tico.\n\nCorreo de registro: \n\nGracias.')}`;

const sections: LegalSectionContent[] = [
  {
    id: 'solicitud', title: '1. Cómo solicitar la eliminación', content: <><p>Puede pedir la eliminación de sus datos de Tico en cualquier momento. No necesita iniciar sesión para enviar la solicitud.</p><ol><li>Si conectó Meta, revoque el acceso de “Tico Performance Ads” desde la configuración de su cuenta de Meta, en Integraciones de empresa o Apps y sitios web. Si la autorización se hizo desde un portafolio comercial, revise también Configuración del negocio → Integraciones → Apps conectadas. La ubicación exacta puede variar según la interfaz de Meta.</li><li>Envíe un correo a <a href={`mailto:${email}`}>{email}</a> con el asunto “Eliminación de datos” e indique el correo con el que se registró en Tico. Si usa Google Ads, también puede revocar la autorización desde su cuenta de Google.</li><li>Verificaremos que la solicitud corresponde al titular y le confirmaremos por correo la recepción y el resultado de la eliminación.</li></ol><p><a href={deletionMailto} className="inline-flex rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold !text-white !no-underline hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Solicitar eliminación</a></p></>
  },
  {
    id: 'datos-eliminados', title: '2. Qué datos eliminamos', content: <p>Eliminaremos los datos operativos de su cuenta bajo nuestro control, incluidos datos de perfil, tokens de acceso, conexiones, métricas almacenadas y contenido generado o aportado en Tico. La revocación de una integración en Meta o Google detiene nuevos accesos, pero no sustituye la solicitud para borrar los datos que Tico ya haya guardado.</p>
  },
  {
    id: 'plazo', title: '3. Plazo y excepciones', content: <p>Atenderemos el reclamo y, cuando proceda la supresión, eliminaremos los datos operativos bajo nuestro control de los sistemas activos en un máximo de <strong>15 días hábiles</strong> contados desde el día siguiente a la recepción de la solicitud. Si no es posible atenderla dentro de ese plazo, le informaremos los motivos antes de su vencimiento y la nueva fecha, que no podrá superar los <strong>8 días hábiles</strong> siguientes. Si el reclamo está incompleto, le solicitaremos la información necesaria para tramitarlo. Las copias de respaldo administradas por proveedores se depuran conforme a sus ciclos de retención; si se restaura una copia anterior, volveremos a aplicar la solicitud de eliminación. Podremos conservar información mínima cuando exista una obligación legal o contractual vigente, por ejemplo documentos contables o registros necesarios para atender una reclamación. Si aplica una excepción, le informaremos qué categorías se conservan y por qué motivo.</p>
  },
  {
    id: 'contacto', title: '4. Ayuda y seguimiento', content: <p>Si necesita ayuda o desea consultar el estado de su solicitud, escriba a <a href={`mailto:${email}`}>{email}</a>. Puede consultar más información en nuestra <a href={legalHref('/privacy')}>Política de Privacidad</a>.</p>
  }
];

export function DataDeletion() {
  return <LegalLayout title="Eliminación de datos" introduction={<p>Estas instrucciones permiten solicitar la eliminación de los datos asociados a su cuenta de Tico y a las integraciones publicitarias que haya autorizado.</p>} sections={sections} />;
}
