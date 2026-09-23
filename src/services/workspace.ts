import { requireSupabase } from './auth';
import type { ClientBriefing, GeneratedCampaignStrategy, CreativeAsset, MetaConnectionState, GoogleConnectionState, CreditTransaction } from '../types';

export interface WorkspaceDraft {
  briefing: ClientBriefing | null;
  strategy: GeneratedCampaignStrategy | null;
  step: 'briefing' | 'strategy' | 'deployed';
}

async function assertOwner(userId: string) {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || data.session?.user.id !== userId) throw new Error('La sesión cambió. Vuelve a abrir tu espacio.');
}

export async function restoreStrategy(strategy: GeneratedCampaignStrategy | null) {
  if (!strategy) return null;
  const creatives = await Promise.all((strategy.creatives || []).map(async asset => {
    if (!asset.storagePath) return asset;
    const { data, error } = await requireSupabase().storage.from('user-creatives').createSignedUrl(asset.storagePath, 3600);
    if (error) throw new Error('No se pudo recuperar un archivo privado. Intenta cargar tu espacio de nuevo.');
    return { ...asset, url: data.signedUrl };
  }));
  return { ...strategy, creatives, metaAds: strategy.metaAds ? { ...strategy.metaAds, creatives } : undefined };
}

export async function loadWorkspace(userId: string) {
  await assertOwner(userId);
  const db = requireSupabase();
  const results = await Promise.all([
    db.from('user_workspace').select('*').eq('user_id', userId).maybeSingle(),
    db.from('ad_connections').select('platform,settings').eq('user_id', userId),
    db.from('campaign_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    db.from('credit_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    db.rpc('my_credit_balance'),
    db.rpc('load_ad_token', { p_platform: 'meta' }),
  ]);
  for (const result of results) if (result.error) throw new Error('No se pudieron cargar tus datos guardados. Inténtalo de nuevo.');
  const [draft, connections, history, transactions, balance, token] = results;
  const meta = connections.data?.find(c => c.platform === 'meta')?.settings as MetaConnectionState | undefined;
  const google = connections.data?.find(c => c.platform === 'google')?.settings as GoogleConnectionState | undefined;
  return {
    draft: { briefing: draft.data?.briefing || null, strategy: await restoreStrategy(draft.data?.strategy || null), step: draft.data?.step || 'briefing' } as WorkspaceDraft,
    meta: meta ? { ...meta, userAccessToken: token.data || '' } : undefined,
    google,
    campaigns: (history.data || []).map(row => ({ ...row.strategy, id: row.id })) as GeneratedCampaignStrategy[],
    transactions: (transactions.data || []).map(row => ({ id: row.id, date: row.created_at, amount: row.amount, type: row.type, description: row.description, campaignId: row.campaign_id })) as CreditTransaction[],
    credits: Number(balance.data || 0),
  };
}

function durableStrategy(strategy: GeneratedCampaignStrategy | null) {
  if (!strategy) return null;
  const creatives = (strategy.creatives || []).map(asset => ({ ...asset, url: asset.storagePath ? '' : asset.url }));
  if (creatives.some(asset => asset.url.startsWith('blob:'))) throw new Error('Espera a que finalice la subida de archivos antes de guardar.');
  return { ...strategy, creatives, metaAds: strategy.metaAds ? { ...strategy.metaAds, creatives } : undefined };
}

// Serialize writes to avoid an older autosave overwriting a newer edit.
let saveQueue: Promise<unknown> = Promise.resolve();
export function saveWorkspace(userId: string, draft: WorkspaceDraft) {
  const operation = saveQueue.catch(() => {}).then(async () => {
    await assertOwner(userId);
    const { error } = await requireSupabase().from('user_workspace').upsert({ user_id: userId, ...draft, strategy: durableStrategy(draft.strategy) });
    if (error) throw new Error('No se pudieron guardar los cambios. Reintenta antes de salir.');
    if (draft.strategy?.id) {
      const { error: historyError } = await requireSupabase().from('campaign_history')
        .update({ strategy: durableStrategy(draft.strategy) }).eq('id', draft.strategy.id).eq('user_id', userId);
      if (historyError) throw new Error('El borrador se guardó, pero no se pudo actualizar el historial. Reintenta guardar.');
    }
  });
  saveQueue = operation;
  return operation;
}

export async function saveConnection(userId: string, platform: 'meta' | 'google', state: MetaConnectionState | GoogleConnectionState) {
  await assertOwner(userId);
  const { userAccessToken, ...settings } = state as MetaConnectionState;
  const { error } = await requireSupabase().rpc('save_ad_connection', {
    p_platform: platform, p_settings: settings,
    p_token: platform === 'meta' ? (userAccessToken ?? null) : null,
  });
  if (error) throw new Error('No se pudo guardar la conexión. Vuelve a intentarlo.');
}

export async function saveCampaign(userId: string, strategy: GeneratedCampaignStrategy, deployment: unknown = null) {
  await assertOwner(userId);
  const id = strategy.id || crypto.randomUUID();
  const { error } = await requireSupabase().from('campaign_history').upsert({ id, user_id: userId, strategy: durableStrategy({ ...strategy, id }), deployment });
  if (error) throw new Error('La operación terminó, pero no pudimos guardar el historial. No repitas el despliegue; revisa la plataforma.');
  return id;
}

export async function deleteCampaign(userId: string, campaignId: string) {
  await assertOwner(userId);
  const { error } = await requireSupabase().from('campaign_history').delete().eq('id', campaignId).eq('user_id', userId);
  if (error) throw new Error('No se pudo eliminar la campaña de la base de datos.');
}

export async function uploadCreative(file: File, aspectRatio: CreativeAsset['aspectRatio']): Promise<CreativeAsset> {
  const db = requireSupabase();
  const { data: session } = await db.auth.getSession();
  if (!session.session) throw new Error('Inicia sesión para subir archivos.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type) || file.size > 20 * 1024 * 1024) {
    throw new Error('Usa JPG, PNG, WebP, MP4 o WebM de hasta 20 MB.');
  }
  const id = crypto.randomUUID();
  const path = `${session.session.user.id}/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await db.storage.from('user-creatives').upload(path, file, { contentType: file.type });
  if (error) throw new Error('No se pudo subir el archivo. Inténtalo de nuevo.');
  const { data, error: signError } = await db.storage.from('user-creatives').createSignedUrl(path, 3600);
  if (signError) throw new Error('El archivo se guardó, pero su vista previa no está disponible.');
  return { id, name: file.name, type: file.type.startsWith('video/') ? 'video' : 'image', url: data.signedUrl, storagePath: path, aspectRatio };
}
