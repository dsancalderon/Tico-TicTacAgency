# Datos del espacio de usuario

Proyecto: `ivltssrxjgvxfxoehzuq` (tico-tictacagency).
Migración aplicada: `20260922090000_user_workspace.sql`.

| Sección | Persistencia |
| --- | --- |
| Perfil | `profiles`, gestionado con Supabase Auth |
| Inicio y créditos | saldo calculado de `credit_transactions`; sin saldo editable por el navegador |
| Tico Agent | `user_workspace`: briefing, estrategia, copys, asignaciones y paso actual |
| Conexiones | `ad_connections`: identificadores, nombres, permisos y diagnósticos; token Meta cifrado en Vault |
| Campañas | `campaign_history`: estrategias recuperables y resultados del despliegue |
| Dashboards | `performance_daily`: métricas diarias por usuario, plataforma, cuenta y moneda |
| Archivos | bucket privado `user-creatives`, rutas `user_id/uuid/nombre` |

Cada tabla expuesta tiene RLS por `auth.uid()`. El cliente no puede escribir créditos ni métricas. Un usuario solo puede recuperar su propio token mediante la función `load_ad_token`; la tabla que relaciona tokens con usuarios está en un esquema privado sin acceso directo. Los enlaces de archivos son firmados por una hora y se regeneran al recuperar la estrategia; las URL firmadas no se guardan en los documentos.

Los borradores se guardan después de 500 ms sin cambios. El botón Guardar ahora y el cierre de sesión esperan confirmación del servidor. Una recarga inmediata antes de confirmar el guardado puede perder la última edición. Cambiar de cuenta vacía el estado anterior y carga el nuevo antes de habilitar formularios.

## Operación pendiente

- `sync-performance` está desplegada en Supabase (versión 1, ACTIVE, `verify_jwt=true`) tras autorización del usuario. `VITE_ENABLE_METRICS_SYNC=true` habilita el botón en la configuración local; para el sitio público se debe establecer esa variable y desplegar el frontend. La función valida además el usuario con Auth, exige correo confirmado y consulta su conexión bajo RLS. Solo envía el token a la ruta fija HTTPS de insights de Meta, con redirecciones bloqueadas. La paginación reconstruye esa misma ruta a partir del cursor. Falta comprobar una sincronización con una sesión y cuenta Meta reales; no se usaron tokens reales para las pruebas.
- Google guarda la configuración de cuenta con estado `needs_auth`; OAuth y sincronización real todavía no están implementados.
- Pagos/recargas y cargos por despliegue requieren un proceso de backend autorizado. No se generan movimientos ni saldos de ejemplo. Solo el rol de servicio puede registrar movimientos verificados con `external_reference` único.
- La habilitación de anuncios sigue regida por `ENABLE_ADVERTISING_API`. Guardar datos no activa campañas ni cambia esta configuración.
- Los cambios del frontend/backend están en este repositorio. Para que lleguen al sitio público hay que desplegar esta versión por el flujo habitual. La migración sí está aplicada al proyecto Supabase.

## Verificación

`supabase/tests/user_isolation.sql` se ejecuta en una transacción que termina en ROLLBACK. Verifica persistencia del propietario, separación de usuarios, cifrado/recuperación y eliminación de tokens, y protección de créditos/métricas frente a escrituras del cliente. No modifica usuarios reales ni deja fixtures.

`node --test supabase/tests/sync-performance.test.mjs` verifica rechazo de sesiones inválidas, fechas inválidas, conexión ausente, escritura vinculada al usuario autenticado, paginación de destino fijo y rechazo de respuestas incompletas. Las solicitudes HTTP al endpoint desplegado sin JWT y con JWT falso devolvieron 401. La función requiere un JWT de usuario conforme a la [guía de autorización de Supabase](https://supabase.com/docs/guides/functions/auth-headers).

El asesor de seguridad informa dos funciones SECURITY DEFINER intencionales (`save_ad_connection` y `load_ad_token`); ambas fijan el search_path y obtienen el propietario de `auth.uid()`, nunca de un parámetro. La tabla privada tiene RLS sin políticas como denegación por defecto. También informa que la protección contra contraseñas filtradas del proyecto está desactivada (configuración previa).

Referencias: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [almacenamiento privado](https://supabase.com/docs/guides/storage/buckets/fundamentals), [asesor de funciones SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
