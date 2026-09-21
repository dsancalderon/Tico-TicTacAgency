# ⚡ TICO — Agente de planeación e implementación publicitaria

**Un producto de TicTac Agency Performance**

TICO es el proyecto de una plataforma web por suscripción que permite a marcas y agencias transformar un brief, documentos de marca y presupuesto en un plan publicitario editable. Tras la aprobación del usuario y la asignación de creativos, la plataforma debe crear las campañas mediante las APIs oficiales de **Meta Ads y Google Ads**, dejándolas **pausadas** para revisión y activación humana.

> **Enfoque del producto:** reducir el trabajo entre recibir un brief y tener una campaña correctamente configurada, con control del presupuesto, aprobaciones y trazabilidad.

Este README unifica la documentación técnica de TICO y la definición de producto discutida el 20 de septiembre de 2026. Distingue la base técnica documentada, el comportamiento objetivo y las decisiones pendientes. **No se inspeccionó el código del repositorio para preparar esta versión:** los archivos, dependencias y comandos heredados deben contrastarse con el proyecto real.

## 1. Contexto y objetivo

TicTac es una agencia de dos hermanos que ofrece pauta publicitaria, diseño, creación de páginas web y servicios relacionados. Uno de los fundadores tiene aproximadamente seis años de experiencia en marketing y publicidad.

TICO busca convertir esa experiencia operativa en un producto que ayude a:

- Recopilar y organizar el contexto de una marca.
- Proponer una estrategia, copies, estructura y distribución de presupuesto.
- Revisar y aprobar el plan antes de modificar una cuenta publicitaria.
- Implementar lo aprobado mediante conectores oficiales.
- Mostrar el estado de cada trabajo y el consumo dentro de la plataforma.

La automatización debe mantener el control humano sobre la estrategia y la activación. La propuesta de valor se medirá por tiempo ahorrado, calidad y reducción de errores; **no se promete rendimiento publicitario garantizado**.

## 2. Estado y alcance de las decisiones

| Tema | Base del proyecto | Estado |
| --- | --- | --- |
| Nombre del producto | TICO | Identificado en el README original |
| Marca de la agencia | TicTac Agency Performance / TicTac AGC Performance | Nombre comercial exacto por normalizar |
| Producto | Web de planeación e implementación con IA | Visión planteada por los fundadores |
| Canales | Meta Ads y Google Ads | Visión del producto; orden de desarrollo pendiente |
| Control humano | Aprobación explícita y creación inicial en `PAUSED` | Coincide en ambas fuentes |
| Frontend | React 19, TypeScript, Vite y Tailwind CSS v4 | Base declarada; no verificada en código |
| Backend | Node.js, Express y TypeScript | Base declarada; no verificada en código |
| Python | Mencionado para el agente durante la exploración | Papel no definido; no implica migración del backend |
| Comercialización | Suscripción con créditos | Propuesta más reciente; tarifas y reglas pendientes |
| Integraciones y calidad de IA | Requieren pruebas | No se acreditó operación productiva en esta revisión |

No interpretar una función descrita en este documento como ya implementada. Actualizar su estado únicamente con evidencia del repositorio y de pruebas.

## 3. Usuarios objetivo

- **Agencias:** administrar varias marcas y preparar campañas de sus clientes.
- **Marcas y empresas:** preparar publicidad para su propio negocio.
- **Agencias de mayor volumen:** posible modalidad empresarial con alcance y costos específicos.

Se recomendó comenzar con pequeñas agencias que ya conocen la operación publicitaria, usando TicTac como primer entorno de aprendizaje. **La prioridad comercial y el nicho no están confirmados.**

El autoservicio para marcas sin experiencia puede necesitar acompañamiento adicional. Este servicio humano debe definirse y presupuestarse por separado.

## 4. Flujo principal

```text
Espacio de trabajo y marca
        ↓
Conexión oficial y diagnóstico de cuentas
        ↓
Brief + documentos + proyectos + presupuesto
        ↓
Confirmación del contexto y datos faltantes
        ↓
Propuesta de estrategia y flow de campañas
        ↓
Edición y aprobación del plan → Exportación Excel
        ↓
Carga y asignación de creativos
        ↓
Vista previa + validación + costo en créditos
        ↓
Aprobación de la versión final
        ↓
Creación mediante API en estado pausado
        ↓
Verificación, identificadores y enlace a la plataforma
        ↓
Revisión y activación manual en Meta o Google
```

La ubicación exacta de la contratación dentro de este recorrido está pendiente. El brief debe poder guardarse aunque la conexión requiera resolución adicional.

### Brief y documentos

El formulario contempla marca, URL, industria, oferta, objetivos, público o mercado deseado, ubicaciones, proyectos, presupuesto y fechas. Los PDFs complementan el contexto.

Se recomienda registrar moneda, zona horaria, prioridades, restricciones de marca y estado de la medición. Cuando sean relevantes, solicitar datos comerciales como capacidad de atención o margen.

El sistema debe mostrar qué entendió y qué falta. No debe completar información desconocida como si fuera un hecho.

**Pendiente:** definir qué es un “proyecto”, su relación con marcas y campañas, y los límites de documentos, páginas, tamaño y OCR.

### Estrategia y flow

El plan debe contener, según el canal y formato admitidos:

- Objetivo, estructura, fechas y cuenta de destino.
- Distribución de presupuesto entre proyectos y campañas.
- Segmentación propuesta, ubicaciones y exclusiones aplicables.
- Copies, titulares, descripciones y llamadas a la acción.
- Palabras clave y concordancias cuando corresponda a Search.
- Justificación, supuestos, datos faltantes y necesidades de creativos.

La distribución entre canales debe responder al contexto; no fijar porcentajes universales como 60 % Meta / 40 % Google. El sistema puede recomendar menos campañas si el presupuesto queda fragmentado, sujeto a aceptación.

El plan estructurado es la fuente de verdad. El Excel es una exportación para revisar o compartir. **Importar cambios hechos externamente en Excel no está definido.**

### Creativos, vistas previas y métricas

Conservar las vistas previas interactivas planteadas en el README original, como Instagram o Google Search, para los formatos realmente soportados. Son aproximaciones visuales, no garantías de renderizado final ni aprobación de la plataforma.

Cada creativo debe asociarse explícitamente a su anuncio. La generación de imágenes y videos con IA queda fuera del alcance inicial recomendado.

Las estimaciones de impresiones, clics, CTR o CPC mencionadas en el README anterior quedan **pendientes de definir y validar**. Solo mostrarlas con fuente, fecha, método y supuestos identificables. Si no hay datos suficientes, indicar que la estimación no está disponible. No generar cifras de rendimiento desde el modelo sin respaldo.

### Aprobación y creación en pausa

La aprobación debe identificar cuenta, versión del plan, presupuesto, fechas, copies, creativos y costo del trabajo. Cambiar cualquiera de los elementos materiales exige una nueva aprobación.

La implementación crea entidades reales en la plataforma. **“Creada y pausada” no equivale a “publicada y entregando anuncios”, ni necesariamente al borrador privado de la interfaz nativa.**

El usuario activa manualmente después de revisar. La creación no garantiza aceptación publicitaria, entrega ni resultados. Ningún reintento debe activar entidades o duplicar campañas accidentalmente.

## 5. Alcance de la primera versión

La visión conserva Meta y Google. Para reducir incertidumbre se recomendó entregar primero un recorrido completo en una plataforma y un objetivo habitual. **Empezar con Meta es una recomendación, no una decisión confirmada.**

| Núcleo previsto | Expansión o definición posterior |
| --- | --- |
| Brief y PDFs limitados | Documentación ilimitada |
| Plan editable, copies y Excel | Todos los objetivos y formatos |
| Imágenes aportadas por el cliente | Generación multimedia |
| Aprobación y vista previa | Optimización autónoma continua |
| Creación pausada y recuperación de errores | Activación automática |
| Créditos e historial operativo | Dashboard completo de resultados |
| Separación de marcas y cuentas | Marca blanca e instalaciones dedicadas |

El README original menciona **Google Search, anuncios RSA y Performance Max**. Se conservan como alcance técnico contemplado, **no como soporte comprobado ni compromiso de incluirlos todos en el MVP**. Performance Max requiere especificación y validación propias; no debe tratarse como una campaña Search con los mismos campos.

## 6. Conexiones oficiales y experiencia del usuario

La experiencia objetivo es conectar mediante un botón, completar la autorización oficial, elegir activos y volver a TICO. El usuario ordinario no debería copiar claves ni tokens manualmente.

Separar:

1. Autorización del usuario.
2. Aprobaciones y permisos de la aplicación.
3. Acceso efectivo del usuario a los activos seleccionados.

**Cuenta conectada no significa cuenta lista para implementar.** Mostrar nombre e identificador de cuenta y un diagnóstico con acciones concretas. Permitir reconexión, cambio de cuenta, recuperación del proceso y desconexión.

No pedir contraseñas, cookies ni credenciales compartidas para eludir el flujo oficial. No asumir que todos los clientes tienen la misma estructura de propiedad y permisos.

### Meta

Evaluar Facebook Login for Business y los permisos mínimos por función. La revisión anterior identificó requisitos de acceso avanzado para empresas externas y diferencias entre acceso de usuario y acceso empresarial para automatización.

**Pendiente:** confirmar requisitos vigentes, aplicación, verificación empresarial cuando aplique, revisión de permisos, tipo de acceso y prueba con un negocio externo autorizado. No confundir una prueba con cuentas del equipo con autorización para ofrecer el SaaS a terceros.

### Google Ads

Confirmar la arquitectura admitida antes de comprometer el flujo comercial. La revisión anterior detectó restricciones sobre intermediarios programáticos y requisitos asociados al acceso de las entidades usuarias.

No asumir que un proyecto compartido de TicTac con OAuth basta para cualquier uso multicliente; tampoco concluir que todo SaaS está prohibido. Revisar el caso concreto con Google, junto con verificación OAuth, acceso productivo y funcionalidad mínima cuando aplique.

Estas observaciones conservan el contexto del análisis, **no sustituyen una revisión vigente de políticas ni una aprobación de la arquitectura**.

## 7. Base técnica y responsabilidades

Se conserva el stack del README original como referencia para continuar el proyecto:

| Capa | Tecnología declarada | Responsabilidad prevista |
| --- | --- | --- |
| Frontend | React 19 + TypeScript | Brief, planes, aprobaciones, creativos, saldo y estados |
| Estilos | Tailwind CSS v4 | Sistema visual; el original propone dark mode y glassmorphism |
| Desarrollo y compilación | Vite | Entorno y compilación del frontend |
| Backend | Node.js + Express + TypeScript | API, trabajos, validaciones, permisos y conectores |
| Publicidad | Meta Marketing API / Graph API y Google Ads API | Crear la configuración autorizada |
| IA | Proveedor y modelo no seleccionados | Interpretación, estrategia y variantes |
| Python | Integración no definida | Posible servicio especializado del agente, si se justifica |
| Persistencia, cola, almacenamiento y pagos | No seleccionados en la documentación recibida | Datos, documentos, trabajos y suscripciones |

**No migrar de Node.js a Python basándose únicamente en la mención de Python durante la conversación.** Confirmar si el agente continuará en TypeScript o si necesita un servicio Python separado.

Distribución de responsabilidades:

- La IA propone datos estructurados y declara supuestos.
- El backend calcula presupuestos, construye Excel y valida reglas.
- El usuario aprueba una versión concreta.
- Los conectores ejecutan esa versión, sin reinterpretarla libremente.
- El registro de operaciones reconcilia resultados, errores y créditos.

### Estructura documentada previamente

El siguiente árbol procede del README original; debe comprobarse contra el repositorio:

```text
Tico-TicTacAgency/
├── docs/
│   ├── ARCHITECTURE.md
│   └── API_INTEGRATIONS.md
├── server/
│   ├── src/
│   │   ├── routes/campaigns.ts
│   │   ├── services/
│   │   │   ├── aiStrategist.ts
│   │   │   ├── metaAds.ts
│   │   │   └── googleAds.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── BriefingForm.tsx
│   │   ├── StrategyPreview.tsx
│   │   └── DeploymentConsole.tsx
│   ├── services/api.ts
│   ├── types/index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── package.json
└── vite.config.ts
```

## 8. Desarrollo local y modos de ejecución

Las instrucciones siguientes se conservan de la documentación anterior; **no se ejecutaron ni verificaron**. Antes de usarlas, revisar los `package.json`, el lockfile, los requisitos de las dependencias y `.env.example`.

El README anterior declara npm 10+ y pruebas con Node.js 24. Su referencia adicional a Node.js 18/20 no demuestra compatibilidad de todas las versiones del stack. Documentar la versión efectiva después de validarla.

Instalar dependencias conforme al gestor y la estructura real del repositorio. Copiar `.env.example` a `.env` sin publicar secretos:

```powershell
# Windows / PowerShell, desde la raíz del proyecto
Copy-Item .env.example .env
```

Scripts documentados:

```bash
npm run dev:all     # Frontend y backend
npm run dev         # Frontend: puerto 5173 según documentación previa
npm run server      # Backend: puerto 4000 según documentación previa
npm run build:all   # Compilación de frontend y backend
```

No se inventan variables de entorno ni pasos de instalación ausentes en los archivos recibidos. Completar esta sección al inspeccionar el repositorio.

### Demo, pruebas de API y producción

El README anterior describe un modo “Sandbox/Autónomo” sin claves y un fallback del cliente API. Su comportamiento no fue verificado. Para evitar ambigüedad, el comportamiento objetivo debe distinguir:

- **Demo o simulación:** datos y resultados simulados, visibles como tales; no crea campañas reales ni consume créditos facturados.
- **Pruebas de integración:** llamadas a entornos o cuentas autorizados según las capacidades de cada plataforma; no equivalen a una demo sin claves.
- **Producción:** conexiones autorizadas, persistencia, aprobación y verificación de resultados reales.

Un fallo real no debe transformarse silenciosamente en un “éxito” simulado. Los identificadores simulados no deben presentarse como campañas creadas en Meta o Google.

## 9. Calidad de IA

No hay modelo elegido ni evidencia comparativa propia. Los costos discutidos anteriormente no permiten concluir calidad estratégica.

Se recomienda comparar un modelo fuerte de referencia con opciones económicas usando briefs representativos y revisión ciega por profesionales. Evaluar comprensión, coherencia, afirmaciones inventadas, restricciones, copies y tiempo de corrección.

```text
Costo útil = IA + revisión humana + correcciones + fallos
```

Usar modelos económicos donde alcancen el nivel requerido; no elegirlos solo por precio ni reservar toda tarea al modelo más caro. La revisión de una estrategia no demuestra su rendimiento posterior.

El consejo multiagente se utilizó para analizar el proyecto. **No es un requisito de arquitectura de TICO** ni debe ejecutarse por defecto en cada campaña.

## 10. Suscripción y créditos

El modelo propuesto más recientemente es una suscripción con créditos incluidos y costo visible antes de ejecutar una acción. Los créditos representan uso del software y **no dinero disponible para invertir en anuncios**.

Pendiente de decisión: qué acciones consumen créditos. El análisis recomienda contemplar generación de planes y variantes, además de implementación, porque procesar documentos y generar estrategias cuesta aunque el usuario no implemente.

Reglas recomendadas:

- Mostrar costo y alcance antes de confirmar, junto con saldo posterior.
- Reservar saldo durante la ejecución y cobrar una sola vez al entregar la acción.
- No cobrar nuevamente por fallos propios, reintentos o duplicados.
- Recuperar implementaciones parciales sin activar ni duplicar entidades.
- Liberar los créditos de la implementación si no se completa; distinguir el cargo por un plan ya entregado.
- Incluir un número definido de revisiones y cotizar ampliaciones antes de realizarlas.
- Permitir consulta, edición manual y descarga sin cargos inesperados.
- Mostrar historial de consumo, reservas, devoluciones y vencimientos.
- Requerir autorización para cualquier recarga automática.

**No definidos:** precios, cuotas, equivalencia del crédito, paquetes, acumulación, vencimiento, recargas, cancelación, devoluciones y revisiones incluidas.

Los ejemplos previos de 10/20/3 créditos y de suscripciones de COP 249.000/599.000/1.499.000 fueron ilustrativos. **No son reglas ni tarifas de TICO** y no deben trasladarse automáticamente a la implementación.

### Modalidad empresarial

La venta por COP 10 millones con uso ilimitado fue una idea inicial, no una oferta aprobada. Se recomendó evitar obligaciones indefinidas de hosting, IA y soporte por un único pago.

Alternativas por definir: contrato anual, instalación más mantenimiento o licencia de una versión con costos separados. BYOK —API de IA pagada por el cliente— es una opción futura y no elimina infraestructura ni soporte. Tampoco resuelve por sí misma los permisos de Meta o Google.

### Costos a medir

IA, procesamiento documental, almacenamiento, infraestructura, comisiones, soporte, mantenimiento de integraciones, adquisición de clientes y recuperación del desarrollo.

```text
Contribución por cliente = ingreso - costos variables atribuibles
Punto de equilibrio = costos fijos / contribución por cliente
```

Las cuotas deben ser rentables con consumo completo, no solo cuando quedan créditos sin usar. No hay presupuesto de desarrollo ni costos reales medidos.

## 11. Dashboard y trazabilidad

El dashboard inicial es operativo: marca, cuenta, plan, aprobación, créditos, resultado, errores y enlace a la plataforma. No implica reporting de rendimiento completo.

Estados propuestos: brief incompleto, propuesta generada, pendiente de aprobación, falta de acceso, lista para implementar, en ejecución, parcialmente creada, requiere corrección y creada en pausa.

Solo mostrar estados externos como “activa” cuando se hayan consultado realmente. Proteger registros para que no expongan credenciales o datos de otras marcas.

## 12. Seguridad, políticas y tratamiento de datos

Requisitos de diseño; su presencia en este README no acredita implementación:

- Credenciales exclusivamente en backend, protegidas y fuera de prompts, frontend y logs públicos.
- Separación de organizaciones, marcas, documentos y activos.
- Permisos mínimos y acceso limitado a cuentas autorizadas.
- Aprobaciones versionadas y trazabilidad de quién autorizó qué.
- Prevención de duplicados y verificación de resultados remotos.
- Reglas de privacidad, conservación, eliminación y desconexión.
- Acuerdos con clientes y proveedores que procesen información, incluidos servicios de IA.
- Derechos sobre documentos y creativos y revisión de políticas publicitarias aplicables.

No reutilizar información de un cliente para otro ni entrenar modelos compartidos sin una evaluación específica de derechos, acuerdos y políticas. La autorización de conexión no es un permiso ilimitado de uso de datos.

Preparar política de privacidad, condiciones del servicio y reglas claras de créditos, errores, soporte y cancelación. La jurisdicción y los mercados están pendientes; si aplica Colombia, revisar también las obligaciones de protección de datos y los lineamientos de la SIC sobre IA.

La conformidad requiere revisar la implementación y los contratos finales, además de las versiones vigentes de políticas. No se certificó cumplimiento jurídico ni aprobación de las plataformas.

## 13. Validación y hoja de ruta recomendada

1. **Auditar la base existente:** contrastar stack, scripts, simulaciones y conectores con el código. Separar implementado, simulado y pendiente.
2. **Definir el primer recorrido:** segmento, plataforma, objetivo, formato y límites de una implementación.
3. **Resolver acceso y viabilidad técnica:** probar conexión y creación pausada con una empresa externa autorizada y las aprobaciones correspondientes.
4. **Evaluar IA:** se propuso comparar aproximadamente 30 briefs; tamaño y criterios finales pendientes.
5. **Piloto operativo:** aproximadamente diez campañas, midiendo tiempo total, correcciones, errores, IA y soporte.
6. **Piloto comercial:** agencias externas que paguen y repitan el uso; se sugirieron tres como inicio.
7. **Ajustar créditos y ampliar:** fijar tarifas con consumo real y margen antes de incorporar más canales y objetivos.

Se sugirió reducir al menos un 50 % el tiempo sin errores críticos de cuenta o presupuesto. Es un criterio propuesto, no un resultado conseguido.

Existen herramientas que documentan automatización publicitaria, como Smartly, Bïrch y Madgicx. Su existencia respalda la posibilidad técnica general, pero no prueba demanda por TICO. Validar la diferenciación frente a esas herramientas y frente a ChatGPT, Excel y carga manual.

## 14. Pendientes de definición

| Tema | Qué falta |
| --- | --- |
| Identidad | Nombre comercial uniforme de la agencia, entidad legal y dominio de TICO |
| Mercado | Países, nicho y segmento de lanzamiento |
| MVP | Plataforma, objetivo, formatos y prioridad de Search/Performance Max |
| Unidad del producto | Relación entre proyecto, marca, campaña e implementación |
| Backend y agente | Continuidad en TypeScript o servicio Python justificado |
| Estado del código | Funciones reales frente a demos, rutas y scripts verificados |
| IA | Proveedor, modelo, evaluación y límites de uso |
| Métricas estimadas | Fuentes, método, disponibilidad y presentación de incertidumbre |
| Documentos | Tamaño, páginas, formatos, OCR, retención y eliminación |
| Créditos | Acciones cobrables, tarifas, revisiones, vencimiento y recargas |
| Integraciones | Aplicaciones, permisos, aprobaciones y arquitectura Google |
| Operación | Base de datos, almacenamiento, trabajos, pagos y soporte |
| Colaboración | Roles y aprobación por el cliente final de la agencia |
| Planificación | Presupuesto, equipo y fechas de desarrollo |
| Empresa | Modalidad empresarial, mantenimiento y posible BYOK |
| Analítica | Alcance de conversiones, seguimiento y reporting posterior |

## 15. Qué se unificó

| Diferencia entre documentos | Resolución |
| --- | --- |
| Nombre no definido frente a TICO | Se conserva TICO |
| Stack desconocido/Python frente a React y Node.js | Se conserva la base técnica documentada y se deja el papel de Python pendiente |
| “Agente autónomo de alto rendimiento” | Automatización con aprobación humana; rendimiento por validar |
| “Publicación” frente a `PAUSED` | Creación en pausa y activación manual claramente diferenciadas |
| Search y Performance Max mencionados como alcance | Se conservan como contemplados, sin afirmar soporte real |
| Predicciones de CTR, CPC y otras métricas | Condicionadas a fuentes y metodología; sin cifras inventadas |
| Demo y fallback “autónomo” | Simulación visible y separada de errores o resultados reales |
| Suscripciones y venta perpetua | Créditos como propuesta comercial reciente; venta empresarial pendiente |
| Precios hipotéticos | No se presentan como tarifas aprobadas |
| Producto genérico frente a contexto técnico | Una única referencia de producto y desarrollo con pendientes explícitos |

## 16. Referencias y mantenimiento

Fuentes consultadas en la conversación; revalidar antes de implementar o lanzar:

- [Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business)
- [Condiciones de la plataforma de Meta](https://developers.facebook.com/terms/dfc_platform_terms)
- [Políticas de Google Ads para desarrolladores](https://support.google.com/adspolicy/answer/6169371)
- [Funcionalidad mínima requerida de Google Ads](https://developers.google.com/google-ads/api/docs/api-policy/rmf)
- [Política de datos de Google](https://developers.google.com/terms/api-services-user-data-policy)
- [Creación de campañas de Google Ads](https://developers.google.com/google-ads/api/docs/campaigns/create-campaigns)
- [Precios de OpenAI](https://developers.openai.com/api/docs/pricing) y [Gemini](https://ai.google.dev/gemini-api/docs/pricing)
- [Smartly: automatización de campañas](https://docs.smartly.io/docs/use-cases-for-campaign-automation-with-example-feeds-1)
- [Bïrch: funciones](https://help.bir.ch/en/articles/8841880-what-services-do-you-provide)
- [Madgicx: lanzamiento de campañas](https://academy.madgicx.com/lessons/launch-a-campaign-with-madgicx)
- [SIC: datos personales e IA](https://sedeelectronica.sic.gov.co/transparencia/normativa/circular-externa-2-de-2024-de-la-superintendencia-de-industria-y-comercio-lineamientos-sobre-el-tratamiento-de-datos)

Al continuar el proyecto, actualizar las decisiones con los fundadores y el estado técnico con evidencia. No convertir ejemplos, recomendaciones o simulaciones en funcionalidades verificadas ni compromisos comerciales.
