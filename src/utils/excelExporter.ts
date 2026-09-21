import * as XLSX from 'xlsx';
import type { GeneratedCampaignStrategy } from '../types';

export function exportStrategyToExcel(strategy: GeneratedCampaignStrategy): void {
  const wb = XLSX.utils.book_new();

  // 1. Hoja de Resumen Ejecutivo
  const summaryData = [
    ['TICO — TicTac Agency Performance', ''],
    ['Plan de Campaña Publicitaria', ''],
    ['', ''],
    ['Marca:', strategy.brandName],
    ['ID del Brief:', strategy.briefingId],
    ['Fecha de Elaboración:', new Date(strategy.createdAt).toLocaleString()],
    ['Presupuesto Total:', `${strategy.totalBudget.toLocaleString()} ${strategy.currency}`],
    ['Estado:', strategy.status.toUpperCase()],
    ['Costo en Créditos:', `${strategy.creditCost} créditos`],
    ['', ''],
    ['Resumen Estratégico:', strategy.strategySummary],
    ['', ''],
    ['Nota Oficial:', 'Este plan se despliega en estado PAUSED para verificación y activación humana en las plataformas publicitarias.']
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // 2. Hoja Meta Ads
  if (strategy.metaAds) {
    const meta = strategy.metaAds;
    const metaData: (string | number)[][] = [
      ['CONFIGURACIÓN DE CAMPAÑA META ADS', ''],
      ['Nombre de Campaña:', meta.campaignName],
      ['Objetivo Oficial:', meta.objective],
      ['Presupuesto Asignado:', `${meta.budgetAmount?.toLocaleString() || ''} ${strategy.currency} (${meta.budgetSharePercentage}%)`],
      ['Presupuesto Diario Sugerido:', `${meta.dailyBudget?.toLocaleString() || ''} ${strategy.currency}`],
      ['Ubicaciones:', meta.placements.join(', ')],
      ['Llamada a la Acción (CTA):', meta.callToAction],
      ['', ''],
      ['SEGMENTACIÓN E INTERESES SUGERIDOS', ''],
      ...meta.interestsAndBehaviors.map((item, idx) => [`Interés #${idx + 1}`, item]),
      ['', ''],
      ['TITULARES PROPUESTOS (HEADLINES)', ''],
      ...meta.headlines.map((hl, idx) => [`Titular #${idx + 1}`, hl]),
      ['', ''],
      ['TEXTOS PRINCIPALES (COPIES)', ''],
      ...meta.primaryTexts.map((txt, idx) => [`Copy #${idx + 1}`, txt]),
      ['', ''],
      ['CREATIVOS ASIGNADOS', ''],
      ...(meta.creatives && meta.creatives.length > 0
        ? meta.creatives.map((c, idx) => [`Creativo #${idx + 1}`, `${c.name} (${c.aspectRatio}) - ${c.assignedAdTitle || 'General'}`])
        : [['Sin creativos asignados aún', 'Debe vincularse material gráfico antes de publicar']])
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Meta Ads');
  }

  // 3. Hoja Google Ads (si aplica)
  if (strategy.googleAds) {
    const goog = strategy.googleAds;
    const googData: (string | number)[][] = [
      ['CONFIGURACIÓN DE CAMPAÑA GOOGLE ADS', ''],
      ['Red / Tipo:', goog.campaignType],
      ['Presupuesto Asignado:', `${goog.budgetAmount?.toLocaleString() || ''} ${strategy.currency} (${goog.budgetSharePercentage}%)`],
      ['Ubicaciones Geográficas:', goog.targetLocations.join(', ')],
      ['', ''],
      ['PALABRAS CLAVE (KEYWORDS)', ''],
      ...goog.keywords.map((kw, idx) => [`Keyword #${idx + 1}`, kw]),
      ['', ''],
      ['TITULARES ADAPTABLES (HEADLINES)', ''],
      ...goog.headlines.map((hl, idx) => [`Titular #${idx + 1}`, hl]),
      ['', ''],
      ['DESCRIPCIONES', ''],
      ...goog.descriptions.map((d, idx) => [`Descripción #${idx + 1}`, d])
    ];
    const wsGoogle = XLSX.utils.aoa_to_sheet(googData);
    XLSX.utils.book_append_sheet(wb, wsGoogle, 'Google Ads');
  }

  // Generar y descargar archivo
  const fileName = `Plan_Pauta_${strategy.brandName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
