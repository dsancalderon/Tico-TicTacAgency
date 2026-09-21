import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from 'express';

// A new client for each request prevents one user's token leaking into another request.
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) { res.status(401).json({ error: 'Autenticación requerida' }); return; }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) { res.status(503).json({ error: 'Autenticación no configurada' }); return; }
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || !data.user.email_confirmed_at || data.user.is_anonymous) {
      res.status(401).json({ error: 'Sesión inválida o correo pendiente de confirmar' }); return;
    }
    res.locals.authUser = data.user;
    res.locals.supabase = client;
    next();
  } catch {
    res.status(503).json({ error: 'No se pudo verificar la sesión' });
  }
};

export const getProfile: RequestHandler = async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = res.locals.authUser;
    const client = res.locals.supabase;
    // Only display fields come from editable metadata. Permissions and credits never do.
    const { error: insertError } = await client.from('profiles').upsert({
      id: user.id,
      display_name: String(user.user_metadata?.display_name || 'Usuario TICO').slice(0, 120),
      workspace_name: String(user.user_metadata?.workspace_name || 'Mi espacio').slice(0, 120),
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { data: profile, error } = await client.from('profiles')
      .select('id,display_name,workspace_name').eq('id', user.id).single();
    if (error) throw error;
    res.json({ user: { id: user.id, email: user.email, name: profile.display_name,
      workspaceName: profile.workspace_name, role: 'brand_manager', credits: 0, isAuthenticated: true } });
  } catch {
    res.status(503).json({ error: 'Perfil no disponible. Verifica la migración de la base de datos.' });
  }
};
