# Briefing V2 — plan y verificación

Flag: `VITE_TICO_FORM_V2=true` (cliente) y `TICO_FORM_V2=true` (servidor). Apagados por defecto.

## Plan de implementación
1. Contrato compartido, esquema sin dependencias y adaptador al payload existente.
2. Conexiones múltiples en Vault, rutas autenticadas y selección de activos Graph v21.0.
3. Análisis de web, redes, catálogo, documentos, entrevista y grabación directa de voz con Gemini.
4. Stepper, confirmación y casillas de delegación; anuncio individual y compatibilidad con Preview.
5. Validación previa, multimedia, creación en PAUSED y recuperación de fallos.
6. Analítica sin contenido personal, tests con mocks, lint, compilación y revisión visual.

Cada fase tendrá su propio commit. Se reutilizan React, Tailwind, fetch, Supabase y node:test. No se añaden dependencias.

## Decisiones confirmadas
- Casilla marcada: Tico decide. Desmarcada: configuración manual de ese apartado.
- El monto nunca se delega. Los valores manuales se conservan al alternar.
- También se admite insertar un anuncio en un conjunto existente.
- La voz se graba en el formulario; no se solicita subir un audio.
- Las migraciones se entregan en el repositorio; la validación local no demuestra conexión real con Meta/Gemini.

## Referencias de implementación
- https://github.com/facebook/facebook-python-business-sdk/tree/21.0.0/facebook_business/adobjects
- https://developers.facebook.com/docs/marketing-api/currencies/
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/generate-content/audio

## Parámetros pendientes de verificación
- `PHONE_CALL` no aparece en DestinationType del SDK 21.0.0. No se enviará sin verificar soporte.
- La página oficial de offsets de moneda no se pudo recuperar. La implementación debe rechazar monedas sin offset validado en vez de asumir ×100 universalmente.
