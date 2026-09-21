# Guía de Integración con APIs Publicitarias: Meta Ads y Google Ads

Este documento detalla los pasos y requisitos técnicos para conectar **Tico** a las cuentas publicitarias de **Meta** y **Google**.

---

## 1. Meta Ads (Facebook & Instagram Graph API)

### Requisitos Previos
1. Cuenta de **Meta Business Manager** activa para TicTac Agency o el cliente.
2. Aplicación creada en [Meta for Developers](https://developers.facebook.com/) de tipo **Negocios (Business)**.
3. Cuenta Publicitaria (`act_XXXXXXXXXXX`) vinculada en el Business Manager.

### Permisos Requeridos
En el panel de permisos de Meta App Review:
- `ads_management`: Para crear y editar campañas, conjuntos de anuncios y anuncios.
- `ads_read`: Para consultar métricas y estados de las campañas.
- `business_management`: Para asociar cuentas publicitarias y páginas de Facebook/Instagram.

### Flujo de Despliegue en Meta
1. **Crear Campaña**: `POST /act_{ad_account_id}/campaigns`
   - `name`: Nombre estructurado (ej: `[TICO] Marca_Objetivo_Fecha`)
   - `objective`: `OUTCOME_TRAFFIC`, `OUTCOME_LEADS`, `OUTCOME_SALES`
   - `status`: `PAUSED` (por seguridad inicial, para revisión final)
2. **Crear Conjunto de Anuncios (Ad Set)**: `POST /act_{ad_account_id}/adsets`
   - `daily_budget`: Asignación calculada en centavos de moneda.
   - `targeting`: Segmentación demográfica, geográfica e intereses.
3. **Crear Anuncio**: `POST /act_{ad_account_id}/ads`
   - Asociación del Ad Creative generado con los copys aprobados.

---

## 2. Google Ads API

### Requisitos Previos
1. **Google Cloud Project** con la API de Google Ads habilitada.
2. Credenciales OAuth 2.0 (Client ID y Client Secret) de tipo Aplicación Web o de Escritorio.
3. **Developer Token** de Google Ads (aprobado con acceso de prueba o básico).
4. Cuenta de Administrador (MCC) o ID de Cliente (`Customer ID`).

### Flujo de Despliegue en Google Ads
1. **Generar Tokens**:
   - Obtener `refresh_token` a través del flujo de consentimiento OAuth2 con los alcances `https://www.googleapis.com/auth/adwords`.
2. **Crear Presupuesto de Campaña**:
   - `CampaignBudgetService.mutateCampaignBudgets`
3. **Crear Campaña de Búsqueda o Performance Max**:
   - `CampaignService.mutateCampaigns`
   - Configuración de estrategia de puja (ej. `MaximizeConversions` o `TargetCpa`).
4. **Crear Grupo de Anuncios & Criterios (Keywords)**:
   - `AdGroupService` y `AdGroupCriterionService` para palabras clave en concordancia exacta (`[keyword]`) y frase (`"keyword"`).
5. **Crear Anuncios de Búsqueda Adaptables (Responsive Search Ads - RSA)**:
   - Añadir titulares (Headlines) y descripciones aprobadas por el cliente.
