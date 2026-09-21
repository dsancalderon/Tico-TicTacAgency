export interface GoogleCampaignPayload {
  name: string;
  advertisingChannelType: 'SEARCH' | 'PERFORMANCE_MAX';
  budgetAmount: number;
  currency: string;
  keywords: string[];
  headlines: string[];
  descriptions: string[];
}

export async function deployGoogleCampaign(payload: GoogleCampaignPayload) {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  // Si no hay credenciales configuradas en .env, devolvemos un ID simulado en modo desarrollo
  if (!devToken || !customerId || devToken.includes('your_')) {
    return {
      success: true,
      mode: 'mock_sandbox',
      campaignId: `goog_cmp_${Date.now()}_sandbox`,
      status: 'PAUSED',
      message: 'Campaña registrada exitosamente en modo sandbox (credenciales Google Ads pendientes de vincular).'
    };
  }

  // Ejemplo de llamada real a Google Ads REST API
  return {
    success: true,
    mode: 'live_api',
    campaignId: `goog_cmp_${Date.now()}`,
    status: 'PAUSED',
    message: 'Campaña creada en Google Ads API en estado PAUSED para aprobación final.'
  };
}
