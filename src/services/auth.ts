import { createClient } from '@supabase/supabase-js';
import type { UserSession } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function requireSupabase() {
  if (!supabase) throw new Error('El acceso aún no está configurado. Contacta al equipo de TICO.');
  return supabase;
}

export async function authHeaders(): Promise<Record<string, string>> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || !data.session) throw new Error('Inicia sesión para continuar.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` };
}

export async function loadUserSession(): Promise<UserSession> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: await authHeaders(), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(response.status === 401
    ? 'Tu sesión no es válida. Inicia sesión de nuevo.'
    : 'No pudimos cargar tu perfil. Intenta iniciar sesión de nuevo.');
  return (await response.json()).user;
}
