# Proyecciones y cumplimiento de Tico

Implementación local del 28 de septiembre de 2026. Migración de Supabase aplicada y permisos verificados el 29 de septiembre UTC (28 de septiembre en Bogotá). Frontend/backend no publicados; Gemini y Meta siguen pendientes de pruebas reales para este módulo.

## Decisiones del producto

- Después de revisar la estrategia final y antes de desplegar en Meta, Gemini recibe el negocio, objetivo, textos, referencias a creativos, público, ubicaciones, puja, presupuesto y duración. El modelo sigue siendo `gemini-3.6-flash`.
- En “Iniciar modo de prueba” Gemini no interviene. El usuario elige una conexión y creativos reales, revisa los textos predeterminados e introduce sus metas esperadas. Tico calcula conservador y optimista como 80 % y 120 % de cada meta indicada. Estas cifras son supuestos manuales, no promedios observados. Tras la aprobación se despliega en Meta en `PAUSED` y se cobran los créditos normales.
- Tres escenarios con el mismo presupuesto: conservador, esperado y optimista. El esperado es la meta original, inmutable desde que empieza el despliegue. Las cifras del modelo se presentan como estimaciones orientativas, no como promedios históricos comprobados.
- El periodo comienza en la fecha de inicio futura de la campaña o en el día de la proyección. Termina al alcanzar el primero de estos límites: 30 días, fin de campaña o vencimiento de la suscripción. Fechas de calendario en la zona de la cuenta. Los días parciales se estiman como días de planificación completos; no se promete entrega uniforme por hora.
- Confirmación del usuario: si empieza el 28 y vence el 15 del siguiente mes, proyectar hasta el vencimiento y desglosar ambos meses. La distribución mensual es proporcional, conserva los totales enteros y no renueva ni prolonga metas automáticamente.
- Cualquier edición relevante requiere recalcular. La API verifica configuración, periodo, suscripción, intereses resueltos y el identificador de la proyección que el usuario aprobó. Una respuesta tardía de Gemini no reemplaza en pantalla una configuración más reciente.
- Nuevos recursos continúan en `PAUSED`. El periodo es el plan aprobado, no una medición de días activos. Pausar o retrasar la activación no reescribe la meta. El vencimiento de Tico **no detiene** el gasto en Meta.

## Presupuesto y alcance

Para campañas nuevas, CBO usa el presupuesto de campaña una sola vez y ABO suma sus conjuntos. El presupuesto total se prorratea por la duración de la campaña; el diario se multiplica por los días del periodo.

Para un anuncio en una campaña existente se releen objetivo, presupuesto, fechas, segmentación, puja y atribución desde Meta antes de proyectar y desplegar. El usuario debe indicar la fracción estimada del presupuesto compartido que recibirá ese anuncio; Meta no garantiza ese reparto. La comparación usa exclusivamente el ID del anuncio creado. La proyección de un anuncio dentro de una campaña CBO de presupuesto total queda bloqueada hasta validar el periodo completo del presupuesto compartido.

El dashboard consulta Insights directamente desde el backend cada 60 segundos mientras está visible, con actualización manual, control de respuestas tardías y conservación de la última lectura cuando falla Meta. No es streaming ni garantiza que Meta haya terminado de atribuir todas las conversiones. El informe usa la fecha de impresión y la configuración de atribución del conjunto.

Se consultan por separado el periodo completo y cada mes, por ID firmado de campaña o anuncio. No se suman alcances diarios/mensuales ni acciones agregadas con subtipos. Clics = `inline_link_clicks`, interacciones = `post_engagement`; contactos, compras y conversaciones tienen mapas explícitos. Un campo ausente, falta de entrega o fallo del proveedor no se transforma en cero confirmado. No se mezclan cuentas ni monedas. La referencia a la fecha es lineal y se ancla a la fecha de la lectura.

## Leads calificados: recomendación y evolución

1. Definir por negocio criterios observables: contacto válido, zona atendida, necesidad compatible, presupuesto/plazo de compra cuando corresponda. No deducir calidad comercial de un clic o conversación.
2. En esta entrega se guardan criterios y una tasa opcional declarada por el usuario. La meta de calificados se deriva del escenario de leads; sin tasa queda por validar. La API de Insights no se usa para inventar el estado comercial: el resultado calificado permanece pendiente.
3. Siguiente entrega recomendada con el stack actual: registro de leads y etapas en Supabase con RLS (`nuevo`, `contactado`, `calificado`, `descartado`, `cliente`), identificador externo deduplicado, motivo, fecha y usuario que calificó; conservar los IDs de campaña/conjunto/anuncio de origen. Empezar con registro manual o importación validada.
4. Después integrar el CRM elegido o n8n mediante webhook autenticado e idempotente. Acordar la ventana y fecha de atribución comercial antes de comparar con leads publicitarios. Validar por separado una futura integración de eventos comerciales con Meta; no está implementada ni se afirma que los permisos actuales la permitan.
5. Cuando haya historial suficiente, contrastar las tasas estimadas con resultados comerciales reales y mostrar error de proyección y tamaño de muestra. Conservar la meta original del periodo; recalibrar solo metas futuras.

## Persistencia y preparación para activar

- Aplicada `supabase/migrations/20260929015933_campaign_performance_goals.sql` en `tico-tictacagency` (`ivltssrxjgvxfxoehzuq`), registrada como `20260929015933 / campaign_performance_goals`. El archivo local se alineó con la versión remota para evitar duplicar la migración. Creó `campaign_performance_goals` (RLS por usuario, contenido firmado) y `subscription_entitlements` (lectura propia; escritura únicamente por un backend de confianza).
- Configurar un `TICO_DEPLOYMENT_SECRET` aleatorio de al menos 32 caracteres en el servidor. Las metas no usan un secreto fijo de respaldo. Cambiar este secreto invalida firmas históricas; planificar una rotación versionada antes de hacerlo en producción.
- Integrar el cobro/webhook futuro para mantener `current_period_start`, `current_period_end` y `status`. **No existe todavía proveedor de facturación o webhook de suscripciones en este repositorio.** No llenar fechas ficticias. El flujo de Gemini exige vigencia confirmada para desplegar; el modo sin Gemini admite metas manuales y, si falta la vigencia, limita el periodo a 30 días o al fin de campaña. Esto no establece ni renueva una suscripción.
- Habilitar la facturación del proyecto Gemini cuando sea posible. Una cuota agotada no dispara modelos alternativos ni metas sintéticas. La llamada es explícita, después de pulsar “Calcular escenarios”. Las referencias de archivos no equivalen a un análisis visual del creativo.
- Desplegar frontend y backend juntos; la migración ya está aplicada. El flujo V2 exige una meta vigente de Gemini o una meta manual del modo sin Gemini. Las campañas históricas sin proyección conservan las métricas por cuenta, pero no reciben metas retroactivas inventadas.
- Las rutas están dentro de `/api/brief/goals`: `GET /context`, `POST /forecast`, `POST /manual`, `GET /`, `POST /insights`. Heredan autenticación y `Cache-Control: no-store`. El despliegue carga la meta firmada desde el servidor, no cifras enviadas por el navegador.

## Verificación

- `npm test`: pruebas de periodo, límites, zona horaria, reparto exacto, presupuesto, validación de JSON, firma/propietario, cambios de configuración, errores de cuota, mapas de métricas, alcance no aditivo y falta de datos.
- `npm run build:all`: frontend y servidor.
- `npm run lint`: revisar advertencias existentes por separado; no confundir salida 0 con ausencia de avisos.
- `npm run dev -- --host 127.0.0.1 --port 5177` y `http://127.0.0.1:5177/tests/goals.html`: interfaz de prueba marcada con datos ficticios y sin conexión a proveedores. No está en el entrypoint de producción.
- Verificación real de Supabase: RLS activo en ambas tablas; pruebas transaccionales de lectura/escritura propia, aislamiento frente a otra identidad, bloqueo de suplantación de propietario y acceso anónimo, suscripción no editable por el cliente y meta congelada por el trigger. Todas pasaron. `ROLLBACK` confirmado: ambas tablas quedaron con cero registros. `service_role` conserva escritura para el futuro backend de cobro.
- Pendientes con servicios reales: configurar `TICO_DEPLOYMENT_SECRET` en el servidor, desplegar el nuevo frontend/backend, guardar una meta manual y desplegar una campaña en pausa, comprobar sus IDs y contrastar Insights con Ads Manager; repetir para anuncio individual y los objetivos habilitados. La ruta Gemini y la vigencia auténtica siguen pendientes de facturación. El secreto de firma corresponde al backend de la aplicación, no a una fila pública de Supabase.
- Asesor de seguridad antes/después: ningún aviso nuevo por estas tablas. Persisten los avisos anteriores de [funciones SECURITY DEFINER accesibles a usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [tablas privadas con RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) y [protección contra contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se cambiaron esos componentes ajenos a esta migración.

Referencias de implementación: [salida estructurada de Gemini](https://ai.google.dev/gemini-api/docs/structured-output), [modelo AdsInsights del SDK oficial de Meta](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adsinsights.py). La documentación de Meta no sustituye la validación pendiente contra la cuenta real.

Limitación específica: para el objetivo de visitas al perfil, Gemini puede proyectar esa métrica, pero el campo real de Insights queda `Por validar`; no se calcula cumplimiento usando clics como sustituto.
