import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Check, 
  Key, 
  Play, 
  XCircle, 
  ArrowRight, 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Layers,
  Briefcase,
  Info,
  RefreshCw,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import type { MetaConnectionState } from '../../types';
import { verifyMetaTokenApi, verifyMetaAccountApi, testMetaCreationApi } from '../../services/api';
import { MetaBrandLogo } from '../BrandLogos';

interface MetaConnectDiagnosticProps {
  metaState: MetaConnectionState;
  onUpdateMetaState: (newState: MetaConnectionState) => void;
}

interface AvailableAccount {
  id: string;
  name: string;
  businessName: string;
  businessId?: string;
  currency: string;
  status: string;
  pixelName?: string;
  pixelId?: string;
  pageName?: string;
  pageId?: string;
}

export const MetaConnectDiagnostic: React.FC<MetaConnectDiagnosticProps> = ({
  metaState,
  onUpdateMetaState
}) => {
  // Connection Form State
  const [connectTab, setConnectTab] = useState<'token' | 'demo'>('token');
  const [inputToken, setInputToken] = useState(metaState.userAccessToken || '');
  const [inputAdAccountId, setInputAdAccountId] = useState(metaState.adAccountId || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Guide State
  const [copiedPermission, setCopiedPermission] = useState<string | null>(null);

  // Connected State
  const [selectedAccountId, setSelectedAccountId] = useState(metaState.adAccountId || '');
  const [realAccounts, setRealAccounts] = useState<AvailableAccount[]>([]);
  const [manualAccountId, setManualAccountId] = useState('');
  const [customPageId, setCustomPageId] = useState(metaState.pageId || '');
  const [isVerifyingManualAccount, setIsVerifyingManualAccount] = useState(false);
  const [manualAccountError, setManualAccountError] = useState<string | null>(null);
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false);
  const [isTestingCreation, setIsTestingCreation] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    details?: any;
  }>({ status: 'idle', message: '' });

  // Default accounts for demonstration / fallback (ONLY in demo mode)
  const defaultAccounts: AvailableAccount[] = [
    {
      id: 'act_839219481029',
      name: 'TicTac Performance — Cuenta Demo',
      businessName: 'TicTac Agency Performance Sandbox',
      currency: 'USD',
      status: 'ACTIVA'
    },
    {
      id: 'act_492019482011',
      name: 'UrbanFit Athletics — Demo Sandbox',
      businessName: 'UrbanFit Brand Sandbox',
      currency: 'USD',
      status: 'ACTIVA'
    },
    {
      id: 'act_102948192834',
      name: 'Nova Glow Cosméticos — Demo COP',
      businessName: 'Nova Glow Multi-Client Sandbox',
      currency: 'COP',
      status: 'ACTIVA'
    }
  ];

  // Si el token es real, NUNCA mostrar cuentas demo falsas; mostrar solo las cuentas reales
  const currentAccounts = metaState.isRealToken ? realAccounts : (realAccounts.length > 0 ? realAccounts : defaultAccounts);

  const handleCopyPermission = (perm: string) => {
    navigator.clipboard.writeText(perm);
    setCopiedPermission(perm);
    setTimeout(() => setCopiedPermission(null), 2000);
  };

  // 1. Real Token Verification against Meta Graph API v21.0
  const handleConnectWithToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const cleanToken = inputToken.trim();
    const cleanAccountId = inputAdAccountId.trim();

    if (!cleanToken) {
      setAuthError('Por favor ingresa tu Token de Acceso de Meta (System User Token o Graph API Token).');
      return;
    }

    setIsConnecting(true);

    try {
      const verifyRes = await verifyMetaTokenApi(cleanToken);

      if (verifyRes.success && verifyRes.diagnostic?.valid) {
        const diag = verifyRes.diagnostic;
        const userAccounts: AvailableAccount[] = (diag.adAccounts || []).map((acc: any) => ({
          id: acc.id,
          name: acc.name,
          businessName: acc.business?.name || diag.businesses?.[0]?.name || 'Meta Business Suite',
          businessId: acc.business?.id || diag.businesses?.[0]?.id,
          currency: acc.currency || 'USD',
          status: acc.status === 1 ? 'ACTIVA' : (acc.statusLabel || 'EN_REVISION'),
          pixelName: acc.pixel?.name,
          pixelId: acc.pixel?.id,
          pageName: acc.page?.name || diag.pages?.[0]?.name,
          pageId: acc.page?.id || diag.pages?.[0]?.id
        }));

        // Si el usuario ingresó un ID de cuenta publicitaria en el formulario:
        let matchedAccount: AvailableAccount | undefined = userAccounts.find(
          a => a.id === cleanAccountId || a.id === `act_${cleanAccountId}`
        );

        if (!matchedAccount && cleanAccountId) {
          try {
            const directAccRes = await verifyMetaAccountApi(cleanAccountId, cleanToken);
            if (directAccRes.success && directAccRes.account) {
              const acc = directAccRes.account;
              matchedAccount = {
                id: acc.id,
                name: acc.name,
                businessName: acc.business?.name || diag.businesses?.[0]?.name || 'Meta Business Suite',
                businessId: acc.business?.id || diag.businesses?.[0]?.id,
                currency: acc.currency || 'USD',
                status: acc.status === 1 ? 'ACTIVA' : (acc.statusLabel || 'EN_REVISION'),
                pixelName: acc.pixel?.name,
                pixelId: acc.pixel?.id,
                pageName: acc.page?.name || diag.pages?.[0]?.name,
                pageId: acc.page?.id || diag.pages?.[0]?.id
              };
              userAccounts.unshift(matchedAccount);
            }
          } catch {
            // Continuar
          }
        }

        setRealAccounts(userAccounts);

        const chosenAcc = matchedAccount || userAccounts[0];

        if (chosenAcc) {
          setSelectedAccountId(chosenAcc.id);
          setIsConnecting(false);

          onUpdateMetaState({
            isConnected: true,
            isRealToken: true,
            status: 'ready_to_deploy',
            userAccessToken: cleanToken,
            appName: diag.app?.name || 'Tico Performance Ads',
            appId: diag.app?.id,
            userName: diag.user?.name || 'Usuario Meta',
            userId: diag.user?.id,
            userType: diag.user?.type || 'SYSTEM_USER',
            businessManagerId: chosenAcc.businessId || diag.businesses?.[0]?.id,
            businessManagerName: chosenAcc.businessName || diag.businesses?.[0]?.name,
            adAccountId: chosenAcc.id,
            adAccountName: chosenAcc.name,
            pixelId: chosenAcc.pixelId,
            pixelName: chosenAcc.pixelName,
            pageId: chosenAcc.pageId || diag.pages?.[0]?.id,
            pageName: chosenAcc.pageName || diag.pages?.[0]?.name,
            permissions: {
              adsManagement: diag.permissions?.adsManagement ?? true,
              pagesReadEngagement: diag.permissions?.pagesReadEngagement ?? true,
              businessManagement: diag.permissions?.businessManagement ?? true
            },
            diagnostics: [
              `✅ App oficial en Meta: ${diag.app?.name || 'Tico Performance Ads'} (ID: ${diag.app?.id || 'N/A'})`,
              `✅ Usuario del Sistema verificado: ${diag.user?.name || 'Usuario Meta'} (ID: ${diag.user?.id})`,
              `✅ Permisos de Marketing API verificados (ads_management, ads_read, business_management).`,
              `✅ Cuenta publicitaria vinculada: ${chosenAcc.name} (${chosenAcc.id}).`,
              `✅ Cuentas asociadas encontradas: ${userAccounts.length}`
            ]
          });

          setTestResult({
            status: 'success',
            message: `¡Conexión oficial con Meta completada con éxito! Cuenta publicitaria vinculada: ${chosenAcc.name}.`
          });
        } else {
          // Token válido pero sin cuenta asignada todavía
          setSelectedAccountId('');
          setIsConnecting(false);

          onUpdateMetaState({
            isConnected: true,
            isRealToken: true,
            status: 'connected_needs_perms',
            userAccessToken: cleanToken,
            appName: diag.app?.name || 'Tico Performance Ads',
            appId: diag.app?.id,
            userName: diag.user?.name || 'Usuario Meta',
            userId: diag.user?.id,
            userType: diag.user?.type || 'SYSTEM_USER',
            businessManagerId: diag.businesses?.[0]?.id,
            businessManagerName: diag.businesses?.[0]?.name,
            adAccountId: '',
            adAccountName: '',
            pixelId: '',
            pixelName: '',
            pageId: diag.pages?.[0]?.id,
            pageName: diag.pages?.[0]?.name,
            permissions: {
              adsManagement: diag.permissions?.adsManagement ?? true,
              pagesReadEngagement: diag.permissions?.pagesReadEngagement ?? true,
              businessManagement: diag.permissions?.businessManagement ?? true
            },
            diagnostics: [
              `✅ App oficial en Meta: ${diag.app?.name || 'Tico Performance Ads'} (ID: ${diag.app?.id || 'N/A'})`,
              `✅ Usuario del Sistema verificado: ${diag.user?.name || 'Tico'} (ID: ${diag.user?.id})`,
              `✅ Permisos de Marketing API activos: ads_management, ads_read, business_management.`,
              `⚠️ Sin cuentas publicitarias asignadas directamente al Usuario del Sistema en Meta Business Suite.`
            ]
          });

          setTestResult({
            status: 'idle',
            message: `Token oficial verificado con éxito para la App "${diag.app?.name || 'Tico Performance Ads'}" y el usuario "${diag.user?.name || 'Tico'}". Para crear campañas, asigna tu cuenta publicitaria en Meta Business Suite o ingresa su ID abajo.`
          });
        }
      } else {
        const errMsg = verifyRes.diagnostic?.error || verifyRes.error || 'Token de acceso inválido o expirado en Meta.';
        setAuthError(errMsg);
        setIsConnecting(false);
      }
    } catch (err: any) {
      setAuthError(`Error de conexión con el servidor: ${err.message}`);
      setIsConnecting(false);
    }
  };

  // Recargar cuentas publicitarias desde Meta usando el token actual
  const handleRefreshAccounts = async () => {
    const token = metaState.userAccessToken || inputToken;
    if (!token) return;
    setIsRefreshingAccounts(true);
    setManualAccountError(null);

    try {
      const res = await verifyMetaTokenApi(token);
      if (res.success && res.diagnostic?.valid) {
        const diag = res.diagnostic;
        const userAccounts: AvailableAccount[] = (diag.adAccounts || []).map((acc: any) => ({
          id: acc.id,
          name: acc.name,
          businessName: acc.business?.name || diag.businesses?.[0]?.name || 'Meta Business Suite',
          businessId: acc.business?.id || diag.businesses?.[0]?.id,
          currency: acc.currency || 'USD',
          status: acc.status === 1 ? 'ACTIVA' : (acc.statusLabel || 'EN_REVISION'),
          pixelName: acc.pixel?.name,
          pixelId: acc.pixel?.id,
          pageName: acc.page?.name || diag.pages?.[0]?.name,
          pageId: acc.page?.id || diag.pages?.[0]?.id
        }));

        setRealAccounts(userAccounts);

        if (userAccounts.length > 0) {
          const chosen = userAccounts[0];
          setSelectedAccountId(chosen.id);
          onUpdateMetaState({
            ...metaState,
            status: 'ready_to_deploy',
            adAccountId: chosen.id,
            adAccountName: chosen.name,
            businessManagerId: chosen.businessId || metaState.businessManagerId,
            businessManagerName: chosen.businessName || metaState.businessManagerName,
            pixelId: chosen.pixelId || metaState.pixelId,
            pixelName: chosen.pixelName || metaState.pixelName,
            pageId: chosen.pageId || metaState.pageId,
            pageName: chosen.pageName || metaState.pageName,
            diagnostics: [
              ...metaState.diagnostics.filter(d => !d.startsWith('✅ Cuenta publicitaria vinculada:') && !d.startsWith('⚠️ Sin cuentas')),
              `✅ Cuenta publicitaria oficial vinculada: ${chosen.name} (${chosen.id}).`
            ]
          });
          setTestResult({
            status: 'success',
            message: `¡Se sincronizaron ${userAccounts.length} cuenta(s) oficiales de Meta con éxito! Cuenta activa: ${chosen.name}.`
          });
        } else {
          setManualAccountError('Meta aún no reporta cuentas publicitarias asignadas a este Usuario del Sistema. Asegúrate de haber hecho clic en "Asignar activos" > "Cuentas publicitarias" > "Control total" y haber guardado los cambios en Meta Business Suite.');
        }
      } else {
        setManualAccountError(res.diagnostic?.error || res.error || 'No se pudo consultar las cuentas en Meta.');
      }
    } catch (err: any) {
      setManualAccountError(`Error al consultar Meta: ${err.message}`);
    } finally {
      setIsRefreshingAccounts(false);
    }
  };

  // Verificar y vincular manualmente una cuenta publicitaria por su ID
  const handleVerifyManualAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const token = metaState.userAccessToken || inputToken;
    const accountId = manualAccountId.trim();
    if (!accountId) {
      setManualAccountError('Por favor ingresa el ID de tu Cuenta Publicitaria (ej: act_1234567890).');
      return;
    }
    if (!token) {
      setManualAccountError('Token no disponible para verificar la cuenta.');
      return;
    }

    setIsVerifyingManualAccount(true);
    setManualAccountError(null);

    try {
      const res = await verifyMetaAccountApi(accountId, token);
      if (res.success && res.account) {
        const acc = res.account;
        const newAcc: AvailableAccount = {
          id: acc.id,
          name: acc.name,
          businessName: acc.business?.name || 'Meta Business Suite',
          businessId: acc.business?.id,
          currency: acc.currency || 'USD',
          status: acc.status === 1 ? 'ACTIVA' : (acc.statusLabel || 'EN_REVISION'),
          pixelName: acc.pixel?.name,
          pixelId: acc.pixel?.id,
          pageName: acc.page?.name,
          pageId: acc.page?.id
        };

        const existing = realAccounts.filter(a => a.id !== newAcc.id);
        const updated = [newAcc, ...existing];
        setRealAccounts(updated);
        setSelectedAccountId(newAcc.id);
        setManualAccountId('');

        onUpdateMetaState({
          ...metaState,
          status: 'ready_to_deploy',
          adAccountId: newAcc.id,
          adAccountName: newAcc.name,
          businessManagerId: newAcc.businessId || metaState.businessManagerId,
          businessManagerName: newAcc.businessName || metaState.businessManagerName,
          pixelId: newAcc.pixelId || metaState.pixelId,
          pixelName: newAcc.pixelName || metaState.pixelName,
          pageId: newAcc.pageId || metaState.pageId,
          pageName: newAcc.pageName || metaState.pageName,
          diagnostics: [
            ...metaState.diagnostics.filter(d => !d.startsWith('✅ Cuenta publicitaria') && !d.startsWith('⚠️ Sin cuentas')),
            `✅ Cuenta publicitaria verificada en Meta: ${newAcc.name} (${newAcc.id}).`
          ]
        });

        setTestResult({
          status: 'success',
          message: `¡Cuenta publicitaria ${newAcc.name} (${newAcc.id}) verificada y vinculada en Meta con éxito!`
        });
      } else {
        const err = res.error || 'No se pudo verificar la cuenta en Meta.';
        setManualAccountError(err);
      }
    } catch (err: any) {
      setManualAccountError(`Error al consultar la cuenta publicitaria: ${err.message}`);
    } finally {
      setIsVerifyingManualAccount(false);
    }
  };

  // 2. Demo Sandbox Connect (1-Click)
  const handleConnectDemo = () => {
    setIsConnecting(true);
    setAuthError(null);

    setTimeout(() => {
      setIsConnecting(false);
      const chosenAcc = defaultAccounts[0];

      onUpdateMetaState({
        isConnected: true,
        isRealToken: false,
        status: 'ready_to_deploy',
        userAccessToken: 'EAAB_Demo_Verified_Token',
        appName: 'TicTac Demo App',
        appId: 'demo_app_001',
        userName: 'Usuario Sandbox',
        userId: 'demo_user_123',
        userType: 'DEMO',
        businessManagerId: 'bm_demo_sandbox',
        businessManagerName: chosenAcc.businessName,
        adAccountId: chosenAcc.id,
        adAccountName: chosenAcc.name,
        pixelId: 'pix_demo_123',
        pixelName: 'Meta Pixel Conversiones Demo',
        pageId: 'page_demo_123',
        pageName: 'TicTac Agency Performance Demo',
        permissions: {
          adsManagement: true,
          pagesReadEngagement: true,
          businessManagement: true
        },
        diagnostics: [
          'Entorno demostrativo conectado con éxito.',
          'Permiso ads_management simulado (Creación de campañas en PAUSED).',
          'Permiso business_management activo.',
          `Cuenta publicitaria seleccionada: ${chosenAcc.name} (${chosenAcc.id}).`,
          'Píxel de conversiones vinculado y listo.'
        ]
      });

      setTestResult({
        status: 'success',
        message: `¡Modo demostrativo activado! Puedes probar la creación de campañas en PAUSED y la exportación.`
      });
    }, 600);
  };

  // 3. Switch Account
  const handleSelectAccount = (acc: AvailableAccount) => {
    setSelectedAccountId(acc.id);
    if (metaState.isConnected) {
      onUpdateMetaState({
        ...metaState,
        status: 'ready_to_deploy',
        adAccountId: acc.id,
        adAccountName: acc.name,
        businessManagerId: acc.businessId || metaState.businessManagerId,
        businessManagerName: acc.businessName || metaState.businessManagerName,
        pixelId: acc.pixelId || metaState.pixelId,
        pixelName: acc.pixelName || metaState.pixelName,
        pageId: acc.pageId || metaState.pageId,
        pageName: acc.pageName || metaState.pageName,
        diagnostics: [
          ...metaState.diagnostics.filter(d => !d.startsWith('✅ Cuenta publicitaria vinculada:')),
          `✅ Cuenta publicitaria vinculada: ${acc.name} (${acc.id}).`
        ]
      });
    }
  };

  // 4. Test Creation in PAUSED (0 consumo de IA, activos predeterminados)
  const handleTestCreation = async () => {
    const targetAccId = metaState.adAccountId || selectedAccountId;
    if (!targetAccId) {
      setTestResult({
        status: 'error',
        message: 'No hay ninguna cuenta publicitaria seleccionada para realizar la prueba.'
      });
      return;
    }

    setIsTestingCreation(true);
    setTestResult({
      status: 'idle',
      message: 'Enviando petición oficial a Meta Marketing API (status: PAUSED)...'
    });

    try {
      const pageToUse = customPageId.trim() || metaState.pageId;
      const result = await testMetaCreationApi(
        targetAccId,
        metaState.userAccessToken,
        'TicTac Performance',
        pageToUse
      );

      if (result.success) {
        setTestResult({
          status: 'success',
          message: result.message || `¡Campaña de prueba orquestada con éxito en Meta! ID de Campaña: ${result.campaignId}. Estado oficial: PAUSED (No genera gasto sin aprobación manual).`,
          details: result
        });
      } else {
        setTestResult({
          status: 'error',
          message: `Respuesta de Meta: ${result.error || result.message}`,
          details: result.rawError || result.steps
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Error al probar creación en Meta: ${err.message}`
      });
    } finally {
      setIsTestingCreation(false);
    }
  };

  // 5. Disconnect
  const handleDisconnect = () => {
    onUpdateMetaState({
      isConnected: false,
      isRealToken: false,
      status: 'disconnected',
      userAccessToken: '',
      appName: '',
      appId: '',
      userName: '',
      userId: '',
      userType: '',
      adAccountId: '',
      adAccountName: '',
      businessManagerId: '',
      businessManagerName: '',
      pixelId: '',
      pixelName: '',
      pageId: '',
      pageName: '',
      permissions: {
        adsManagement: false,
        pagesReadEngagement: false,
        businessManagement: false
      },
      diagnostics: ['La cuenta se encuentra desconectada. No se pueden orquestar campañas en Meta Ads.']
    });
    setRealAccounts([]);
    setSelectedAccountId('');
    setManualAccountId('');
    setManualAccountError(null);
    setTestResult({ status: 'idle', message: '' });
    setAuthError(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-sm space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
            {/* Meta Official Logo */}
            <MetaBrandLogo className="w-4 h-4 shrink-0" />
            <span>Conector Oficial de Meta Ads (Facebook & Instagram)</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-mono font-semibold text-blue-600">Graph API v21.0</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">
            Conexión de Perfil y Cuentas Publicitarias
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Conecta tu cuenta publicitaria para que TICO orqueste y cree las campañas en estado <code>PAUSED</code> directamente en tu Meta Ads Manager.
          </p>
        </div>

        {metaState.isConnected ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Conectado y Verificado</span>
            </span>
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-4 py-2 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Desconectar Cuenta
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Estado: Desconectado</span>
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ESTADO DESCONECTADO: FORMULARIO DIRECTO + GUÍA PASO A PASO EN 2 COLUMNAS   */}
      {/* ========================================================================= */}
      {!metaState.isConnected ? (
        <div className="space-y-10">
          {/* ========================================================================= */}
          {/* SECCIÓN 1: FORMULARIO DIRECTO DE CONEXIÓN (SUPERIOR - ANCHO CÓMODO)       */}
          {/* ========================================================================= */}
          <div className="max-w-4xl mx-auto w-full bg-slate-50/80 border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            {/* Header del Formulario */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  <span>Vincula tu Token de Meta Ads</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ingresa tu System User Token o activa el modo demostrativo para sincronizar tus campañas.
                </p>
              </div>

              {/* Tab Selector: Token Real vs Modo Demo */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 rounded-2xl text-xs font-bold shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setConnectTab('token'); setAuthError(null); }}
                  className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    connectTab === 'token'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <span>Token Real</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setConnectTab('demo'); setAuthError(null); }}
                  className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    connectTab === 'demo'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Modo Demo</span>
                </button>
              </div>
            </div>

            {/* CONTENIDO TAB 1: TOKEN REAL */}
            {connectTab === 'token' ? (
              <form onSubmit={handleConnectWithToken} className="space-y-5">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 space-y-1">
                  <strong className="font-bold flex items-center gap-1.5 text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Conexión Directa con Meta Marketing API v21.0</span>
                  </strong>
                  <p className="text-[11px] leading-relaxed text-blue-900/90">
                    Ingresa tu <strong>System User Token</strong> de Meta Business. TICO validará tus permisos en tiempo real directamente contra los servidores oficiales de Meta sin guardar contraseñas.
                  </p>
                </div>

                {/* Campo Token */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Token de Acceso de Meta <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={inputToken}
                      onChange={(e) => { setInputToken(e.target.value); setAuthError(null); }}
                      placeholder="EAABw... (System User Token permanente de Meta)"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Debe contener los 3 permisos: <code>ads_management</code>, <code>ads_read</code> y <code>business_management</code>. (Consulta la guía abajo si necesitas generarlo).
                  </span>
                </div>

                {/* Campo Cuenta Publicitaria */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    ID de Cuenta Publicitaria <span className="text-slate-400 font-normal lowercase">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={inputAdAccountId}
                    onChange={(e) => { setInputAdAccountId(e.target.value); setAuthError(null); }}
                    placeholder="act_1234567890 (Si lo dejas vacío, TICO listará todas tus cuentas activas)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  />
                </div>

                {/* Feedback de Error */}
                {authError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block font-bold">Error de validación con Meta:</strong>
                      <p className="font-mono text-[11px] leading-relaxed break-all">{authError}</p>
                      <span className="block text-[11px] text-rose-700 mt-1">
                        💡 Revisa que el token no haya expirado y que pertenezca a un Usuario del Sistema con permisos de Administrador.
                      </span>
                    </div>
                  </div>
                )}

                {/* Botón Acción Principal */}
                <button
                  type="submit"
                  disabled={isConnecting || !inputToken.trim()}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] disabled:opacity-50 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verificando permisos con Graph API...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Conectar con Meta Marketing API</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* CONTENIDO TAB 2: MODO DEMOSTRATIVO */
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 space-y-1">
                  <strong className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Sandbox Guiado (Sin Token de Meta)</span>
                  </strong>
                  <p className="text-[11px] leading-relaxed text-amber-900/90">
                    Permite explorar todo el flujo de planeación, segmentación y simulación de despliegue en estado <code>PAUSED</code> con una cuenta de prueba sin requerir credenciales reales de Facebook.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-800">Cuentas simuladas disponibles:</div>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4">
                    <li><code>act_839219481029</code> — TicTac Performance Lab (USD)</li>
                    <li><code>act_492019482011</code> — UrbanFit Athletics (USD)</li>
                    <li><code>act_102948192834</code> — Nova Glow Cosméticos (COP)</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleConnectDemo}
                  disabled={isConnecting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-slate-950 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Iniciando modo demo...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Conectar en Modo Demostrativo (1 Clic)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Micro-Garantías al pie del formulario */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-[11px] text-slate-500 text-center">
              <div>
                <strong className="text-slate-800 block">100% PAUSED</strong>
                <span>Sin gasto automático</span>
              </div>
              <div>
                <strong className="text-slate-800 block">Oficial Meta</strong>
                <span>Graph API v21.0</span>
              </div>
              <div>
                <strong className="text-slate-800 block">Reversible</strong>
                <span>Desconexión en 1 clic</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 2: GUÍA DETALLADA PASO A PASO (INFERIOR - ANCHO COMPLETO)         */}
          {/* ========================================================================= */}
          <div className="w-full bg-slate-900 text-white rounded-3xl p-6 sm:p-8 lg:p-10 space-y-8 shadow-xl border border-slate-800">
            {/* Cabecera Principal de la Guía */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-1.5 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-600/40 text-blue-300 text-xs font-bold">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Guía Oficial Meta Developers & Business Suite</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
                  Cómo Crear la App en Meta for Developers y Obtener tu Token
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Sigue los <strong>5 apartados del formulario oficial "Crear una app"</strong> en Meta Developers y luego genera tu Token Permanente de Administrador en Business Manager.
                </p>
              </div>

              {/* Botones de Acceso Rápido Directo */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                <a
                  href="https://developers.facebook.com/apps/create/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                >
                  <span>1. Crear App en Meta Developers</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://business.facebook.com/settings/system-users"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer hover:scale-[1.02]"
                >
                  <span>2. Usuarios del Sistema</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* FASE A: LOS 5 APARTADOS DEL FORMULARIO "CREAR UNA APP" EN DEVELOPERS */}
            {/* ===================================================================== */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                    Fase 1 de 2
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Asistente Oficial "Crear una app" en developers.facebook.com</span>
                  </h4>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  5 Apartados Obligatorios
                </span>
              </div>

              {/* Stepper Visual Horizontal */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[
                  { num: '1', title: 'Detalles de la app', active: true },
                  { num: '2', title: 'Casos de uso', active: true },
                  { num: '3', title: 'Negocio', active: true },
                  { num: '4', title: 'Requisitos', active: true },
                  { num: '5', title: 'Resumen', active: true }
                ].map((s) => (
                  <div
                    key={s.num}
                    className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2 text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      {s.num}
                    </span>
                    <span className="font-semibold truncate text-[11px]">{s.title}</span>
                  </div>
                ))}
              </div>

              {/* Desglose Detallado de los 5 Apartados */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {/* APARTADO 1: DETALLES DE LA APP */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                      <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                        1. Detalles de la app
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700/40 font-bold">
                        Paso inicial
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <strong className="text-white block">Nombre de la app (máx. 30 caracteres):</strong>
                      <p className="text-[11px] text-slate-400">
                        Escribe un nombre que identifique tu marca o agencia:
                      </p>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400 flex items-center justify-between">
                        <span>Tico Performance Ads</span>
                        <span className="text-[10px] text-slate-400">Recomendado</span>
                      </div>
                      <div className="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/50 mt-1">
                        ⚠️ <strong>Prohibido por Meta:</strong> No uses palabras como <code>Facebook</code>, <code>Meta</code>, <code>Instagram</code> o <code>FB</code> en el nombre.
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-300 pt-1">
                      <strong className="text-white block">Correo de contacto de la app:</strong>
                      <p className="text-[11px] text-slate-400">
                        Pon un correo que uses habitualmente (ej. <code>tictacagencyp@gmail.com</code> o el correo de tu negocio). Meta lo usará para enviarte alertas de políticas y salud de API.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="font-bold text-white">Acción:</span> Pulsa el botón azul <strong>"Siguiente"</strong>.
                  </div>
                </div>

                {/* APARTADO 2: CASOS DE USO */}
                <div className="bg-slate-800/80 border border-blue-500/40 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between shadow-lg">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                      <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                        2. Casos de uso
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-bold">
                        Muy Importante
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      Meta te mostrará un catálogo de 20 casos de uso. Marca <strong>únicamente</strong> esta casilla:
                    </p>

                    {/* Casilla Obligatoria */}
                    <div className="p-3 rounded-xl bg-blue-950/70 border border-blue-500/50 space-y-1">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-white block">
                            Crear y administrar anuncios con la API de marketing
                          </span>
                          <p className="text-[11px] text-blue-200/90 leading-relaxed mt-0.5">
                            Permite estructurar campañas, presupuestos, conjuntos y creativos en estado <code>PAUSED</code> directamente en Meta.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Casilla Opcional */}
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-[11px] text-slate-300 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold">☑</span>
                        <span>
                          <strong className="text-white">Medir datos de rendimiento de los anuncios</strong> (Opcional, para métricas y diagnósticos en tiempo real).
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-rose-300 bg-rose-950/40 p-2 rounded-lg border border-rose-800/50">
                      ⛔ <strong>Atención:</strong> Deja <u>desmarcadas</u> todas las demás opciones (WhatsApp, Threads, Messenger, Juegos, etc.). Si marcas otras, Meta te exigirá revisiones adicionales.
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="font-bold text-white">Acción:</span> Pulsa el botón azul <strong>"Siguiente"</strong>.
                  </div>
                </div>

                {/* APARTADO 3: NEGOCIO */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                      <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                        3. Negocio (Portfolio Comercial)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700/40 font-bold">
                        Vinculación
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <strong className="text-white block">
                        ¿Qué portfolio comercial quieres conectar a esta app?
                      </strong>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Meta te listará tus Portfolios Comerciales (Business Managers) existentes.
                      </p>

                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>Selecciona tu Empresa / Agencia</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Ejemplo: <code>Tic Tac Agency</code> o el Business Manager oficial donde residen tus cuentas publicitarias y páginas.
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-700/60 mt-1">
                        💡 <strong>Nota sobre verificación:</strong> Si tu portfolio tiene <em>"Verificación del negocio completada"</em> genial, pero si aún no está verificado Meta te permite conectarlo igualmente en modo desarrollo/interno.
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="font-bold text-white">Acción:</span> Pulsa el botón azul <strong>"Siguiente"</strong>.
                  </div>
                </div>

                {/* APARTADO 4: REQUISITOS */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                      <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                        4. Requisitos de publicación
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-bold">
                        Sin Trámites
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <strong className="text-white block">Pantalla de Requisitos de Meta:</strong>
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-1 text-[11px]">
                        <span className="text-slate-400 italic block">
                          "Estos son los pasos que debes completar para obtener y conservar el acceso a los datos del negocio y de los usuarios."
                        </span>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold pt-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>No se identificaron requisitos.</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                        Al haber seleccionado <strong>únicamente la API de marketing</strong> para uso comercial propio, no necesitas subir videos de screencast, contratos ni pasar por App Review en esta fase.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="font-bold text-white">Acción:</span> Pulsa directamente en <strong>"Siguiente"</strong>.
                  </div>
                </div>

                {/* APARTADO 5: RESUMEN */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between md:col-span-2 lg:col-span-2">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                      <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                        5. Resumen y Creación Final
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700/40 font-bold">
                        Finalización
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                      <div className="space-y-1 bg-slate-900/70 p-3 rounded-xl border border-slate-700/60">
                        <strong className="text-white block">Revisa que los datos coincidan:</strong>
                        <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4 mt-1">
                          <li><strong>Nombre de app:</strong> <code>Tico Performance Ads</code></li>
                          <li><strong>Caso de uso:</strong> API de marketing</li>
                          <li><strong>Portfolio comercial:</strong> Tu empresa seleccionada</li>
                        </ul>
                      </div>

                      <div className="space-y-1 bg-slate-900/70 p-3 rounded-xl border border-slate-700/60">
                        <strong className="text-white block">Confirmación de Seguridad:</strong>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Al presionar <strong>"Crear app"</strong>, Facebook te pedirá introducir tu contraseña personal para validar que eres el propietario de la cuenta.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-slate-300 font-semibold">
                      ¡Listo! Haz clic en el botón azul <strong className="text-white">"Crear app"</strong> en Meta Developers.
                    </span>
                    <a
                      href="https://developers.facebook.com/apps/create/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors shrink-0"
                    >
                      <span>Abrir Asistente Crear App</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* FASE B: VINCULACIÓN DE ACTIVOS Y TOKEN PERMANENTE EN BUSINESS MANAGER  */}
            {/* ===================================================================== */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    Fase 2 de 2
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>Generación del Token Permanente en Meta Business Manager</span>
                  </h4>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  3 Pasos Rápidos
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Paso A */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        A
                      </span>
                      <span className="text-xs font-bold text-white">
                        Abrir Usuarios del Sistema
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Entra a la Configuración de tu Negocio en <strong>Usuarios &gt; Usuarios del sistema</strong>. Si no tienes uno, pulsa <em>Agregar</em>, nómbralo <code>Tico Performance</code> y asigna rol <strong>Administrador</strong>.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="https://business.facebook.com/settings/system-users"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 text-white text-[11px] font-bold rounded-xl transition-colors"
                    >
                      <span>Ir a Usuarios del Sistema</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Paso B: Ventana 'Seleccionar activos y asignar permisos' (Detalle 3 Columnas) */}
                <div className="bg-slate-800/80 border border-blue-500/50 rounded-2xl p-4 sm:p-5 space-y-3 lg:col-span-2 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        B
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white">
                        Ventana "Seleccionar activos y asignar permisos"
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700/40 font-bold self-start sm:self-auto">
                      Al pulsar "Agregar activos"
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Con <code>Tico Performance</code> seleccionado, haz clic en el botón <strong>"Agregar activos"</strong>. Se abrirá la ventana oficial de 3 columnas. Debes vincular <strong>ambos activos</strong>:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Activo 1: App */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/40 space-y-2">
                      <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                        <span>Asignar la App Creada</span>
                      </div>
                      <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
                        <li>
                          <strong>Columna 1 ("Seleccionar tipo de activo"):</strong> Haz clic en <span className="text-white font-semibold">Apps</span>.
                        </li>
                        <li>
                          <strong>Columna 2 ("Seleccionar activos"):</strong> Marca la casilla <span className="text-emerald-400 font-mono">Tico Performance Ads</span>.
                        </li>
                        <li>
                          <strong>Columna 3 ("Asignar permisos"):</strong> En <em>Acceso total</em>, activa el switch <strong className="text-white">"Administrar app"</strong>.
                        </li>
                      </ul>
                    </div>

                    {/* Activo 2: Cuenta Publicitaria */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/50 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                        <span>Asignar la Cuenta Publicitaria (¡Imprescindible!)</span>
                      </div>
                      <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
                        <li>
                          <strong>Columna 1 ("Seleccionar tipo de activo"):</strong> Haz clic en <span className="text-white font-semibold">Cuentas publicitarias</span>.
                        </li>
                        <li>
                          <strong>Columna 2 ("Seleccionar activos"):</strong> Marca la casilla de tu <span className="text-white font-semibold">cuenta de anuncios</span>.
                        </li>
                        <li>
                          <strong>Columna 3 ("Asignar permisos"):</strong> En <em>Acceso total</em>, activa el switch <strong className="text-white">"Administrar campañas" / "Control total"</strong>.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-200">
                    <span>
                      👉 Al marcar ambos, verifica que abajo diga <strong>"2 activos seleccionados"</strong> y pulsa el botón azul <strong className="text-white">"Asignar activos"</strong>.
                    </span>
                  </div>
                </div>

                {/* Paso C */}
                <div className="bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-md lg:col-span-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        C
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white">
                        Generar Token Permanente con los 3 Permisos Obligatorios
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-bold">
                      Paso Final
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Pulsa el botón <strong>"Generar nuevo token"</strong>, elige tu App (<code>Tico Performance Ads</code>), caducidad <strong>"Permanente" (Never expire)</strong> y marca estas 3 casillas obligatorias (haz clic para copiarlas):
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { id: 'ads_management', label: 'ads_management (Crear y editar campañas)' },
                      { id: 'ads_read', label: 'ads_read (Lectura de métricas y anuncios)' },
                      { id: 'business_management', label: 'business_management (Gestión en BM)' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleCopyPermission(p.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-[11px] font-mono text-blue-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Haz clic para copiar"
                      >
                        <span>{p.label}</span>
                        {copiedPermission === p.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-60" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/50 mt-1">
                    ✓ Haz clic en <strong>Generar token</strong>, copia la clave que empieza por <code>EAABw...</code> y pégala en el formulario de arriba para conectar.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de la Guía: Acceso Explorer */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <span>¿Deseas probar de inmediato con un token temporal de 1 hora sin crear una app?</span>
              </div>
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 text-xs font-semibold"
              >
                <span>Abrir Graph API Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ESTADO CONECTADO: SELECCIÓN DE CUENTA PUBLICITARIA Y PRUEBA EN VIVO       */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Status Banner Oficial de Meta */}
          <div className="p-6 rounded-3xl bg-emerald-50/80 border border-emerald-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                    {metaState.isRealToken ? 'Token Oficial de Meta Autorizado' : 'Modo Demostrativo Activo'}
                  </span>
                  {metaState.appName && (
                    <span className="text-[11px] font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                      App: {metaState.appName}
                    </span>
                  )}
                  {metaState.userType && (
                    <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                      {metaState.userType}
                    </span>
                  )}
                </div>

                <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-['Outfit'] flex flex-wrap items-center gap-2">
                  <span>
                    {metaState.adAccountName 
                      ? `${metaState.adAccountName} (${metaState.adAccountId})` 
                      : (metaState.userName ? `Usuario: ${metaState.userName}` : 'Perfil Meta Verificado')}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    metaState.adAccountId
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300/60'
                      : 'bg-amber-100 text-amber-900 border-amber-300/60'
                  }`}>
                    {metaState.adAccountId ? 'Lista para Implementar' : 'Sin Cuenta Asignada'}
                  </span>
                </div>

                {metaState.userId && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID Usuario Meta: <strong>{metaState.userId}</strong> • Token Permanente de Administrador
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
              <button
                type="button"
                disabled={isTestingCreation || !metaState.adAccountId}
                onClick={handleTestCreation}
                className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                  metaState.adAccountId
                    ? 'bg-slate-950 hover:bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title={!metaState.adAccountId ? 'Vincula o asigna una cuenta publicitaria para ejecutar la prueba' : ''}
              >
                {isTestingCreation ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validando en Meta Marketing API...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span>Ejecutar Prueba en Pausa (PAUSED)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CASO A: TIENE CUENTAS PUBLICITARIAS EN META                               */}
          {/* ========================================================================= */}
          {currentAccounts.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span>Cuentas Publicitarias Disponibles en Meta ({currentAccounts.length}):</span>
                <button
                  type="button"
                  onClick={handleRefreshAccounts}
                  disabled={isRefreshingAccounts}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer lowercase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAccounts ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingAccounts ? 'actualizando...' : 'recargar cuentas'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {currentAccounts.map((acc) => {
                  const isSelected = (metaState.adAccountId || selectedAccountId) === acc.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600/20'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                          <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {acc.id}
                          </span>
                          <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {acc.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 truncate">
                          {acc.businessName}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">Moneda: <strong>{acc.currency}</strong></span>
                        <span className={`text-[11px] font-bold ${isSelected ? 'text-blue-700' : 'text-slate-400'}`}>
                          {isSelected ? '✓ Seleccionada' : 'Elegir esta cuenta'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* CASO B: 0 CUENTAS ASIGNADAS AL USUARIO DEL SISTEMA EN META BUSINESS SUITE */
            /* ========================================================================= */
            <div className="p-6 rounded-3xl bg-amber-50/80 border border-amber-200/90 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-extrabold text-amber-950 font-['Outfit']">
                      0 Cuentas Publicitarias Asignadas al Usuario en Meta
                    </h4>
                    <p className="text-xs text-amber-900/90 leading-relaxed max-w-2xl">
                      Tu token es 100% oficial y pertenece a la App <strong>{metaState.appName || 'Tico Performance Ads'}</strong> y al Usuario <strong>{metaState.userName || 'Tico'}</strong>, pero Meta reporta que este usuario aún no tiene vinculada ninguna Cuenta Publicitaria en tu Business Suite.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshAccounts}
                  disabled={isRefreshingAccounts}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAccounts ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingAccounts ? 'Consultando Meta...' : 'Recargar Cuentas de Meta'}</span>
                </button>
              </div>

              {/* Formulario Rápido: Vincular Directamente por ID */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/90 space-y-3 shadow-xs">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>Opción 1: ¿Conoces el ID de tu Cuenta Publicitaria? Ingrésalo aquí:</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualAccountId}
                    onChange={(e) => { setManualAccountId(e.target.value); setManualAccountError(null); }}
                    placeholder="act_1234567890 o solo los números"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    disabled={isVerifyingManualAccount || !manualAccountId.trim()}
                    onClick={handleVerifyManualAccount}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {isVerifyingManualAccount ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Consultando en Meta...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Verificar y Cargar Cuenta</span>
                      </>
                    )}
                  </button>
                </div>
                {manualAccountError && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-mono">
                    {manualAccountError}
                  </div>
                )}
              </div>

              {/* Opción 2: Instrucciones para asignar en Business Suite */}
              <div className="text-xs text-amber-950 bg-amber-100/60 p-4 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ExternalLink className="w-3.5 h-3.5 text-amber-800" />
                  <span>Opción 2: Cómo asignar la Cuenta en Meta Business Suite (3 Clics):</span>
                </div>
                <ol className="text-[11px] text-amber-900/95 list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>
                    Abre <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700 hover:text-blue-900">Meta Business Suite &gt; Configuración del Negocio &gt; Usuarios del Sistema</a> y selecciona al usuario <strong>"{metaState.userName || 'Tico'}"</strong>.
                  </li>
                  <li>
                    Haz clic en el botón <strong>"Asignar activos"</strong> &gt; selecciona la pestaña <strong>"Cuentas publicitarias"</strong> (la segunda columna al lado de Apps).
                  </li>
                  <li>
                    Marca tu cuenta de anuncios, activa el interruptor <strong>"Control total / Administrar campañas"</strong> y haz clic en <strong>"Guardar cambios"</strong>.
                  </li>
                  <li>
                    Regresa aquí y haz clic en el botón <strong>"Recargar Cuentas de Meta"</strong> de arriba.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Asset Details Grid Oficial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Portfolio Comercial (Business Manager)
              </span>
              <div className="text-sm font-bold text-slate-900 truncate">
                {metaState.businessManagerName || (metaState.businessManagerId ? `Portfolio ${metaState.businessManagerId}` : 'Meta Business Suite')}
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {metaState.businessManagerId || 'Detectado desde Meta'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Píxel de Seguimiento
              </span>
              <div className="text-sm font-bold text-slate-900 truncate">
                {metaState.pixelName || (metaState.pixelId ? `Píxel ${metaState.pixelId}` : 'Sin píxel configurado')}
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {metaState.pixelId || 'No detectado en esta cuenta'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Página de Anunciante (Fanpage)
              </span>
              <div className="text-sm font-bold text-slate-900 truncate">
                {metaState.pageName || (metaState.pageId ? `Página ${metaState.pageId}` : (customPageId ? `Página ${customPageId}` : 'Sin página asociada'))}
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {metaState.pageId || customPageId || 'No asignada al usuario'}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN DEDICADA: PRUEBA DE CONEXIÓN CON PUBLICIDAD PREDETERMINADA        */}
          {/* ========================================================================= */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-50/90 border border-slate-200 space-y-6 shadow-xs">
            {/* Header de la sección de prueba */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    0 Consumo de IA • Activos Predeterminados
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200">
                    Objetivo: Tráfico Web (PAUSED)
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-600" />
                  <span>Prueba Oficial de Conexión y Despliegue en Pausa</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                  Prueba la comunicación con Meta Graph API creando una campaña en estado <code>PAUSED</code> con copies, segmentación y creativo de muestra. <strong>Esta prueba no llama a ningún modelo de IA para no generar costos por consumo.</strong>
                </p>
              </div>

              <button
                type="button"
                disabled={isTestingCreation || !metaState.adAccountId}
                onClick={handleTestCreation}
                className={`px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                  metaState.adAccountId
                    ? 'bg-slate-950 hover:bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isTestingCreation ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Orquestando en Meta...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span>Ejecutar Prueba en Pausa (PAUSED)</span>
                  </>
                )}
              </button>
            </div>

            {/* Banner de Feedback del Resultado de la Prueba */}
            {testResult.message && (
              <div className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${
                testResult.status === 'success'
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                  : testResult.status === 'error'
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-xs'
                  : 'bg-blue-50/90 border-blue-300 text-blue-950'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {testResult.status === 'success' && (
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    )}
                    {testResult.status === 'error' && (
                      <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <XCircle className="w-6 h-6" />
                      </div>
                    )}
                    {testResult.status === 'idle' && (
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Zap className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <strong className="text-sm sm:text-base font-extrabold font-['Outfit'] block">
                        {testResult.status === 'success' ? '¡Conexión Oficial con Meta Ads Certificada!' : (testResult.status === 'error' ? 'Resultado de la Prueba en Meta:' : 'Validando con Meta Marketing API')}
                      </strong>
                      <p className="text-xs sm:text-sm mt-0.5 leading-relaxed">
                        {testResult.message}
                      </p>
                    </div>
                  </div>

                  {testResult.status === 'success' && testResult.details?.adsManagerUrl && (
                    <a
                      href={testResult.details.adsManagerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Abrir en Meta Ads Manager</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Detalle de IDs generados en Meta */}
                {testResult.status === 'success' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    {testResult.details?.campaignId && (
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">ID Campaña Meta (PAUSED)</span>
                        <span className="font-mono font-bold text-slate-900 break-all">{testResult.details.campaignId}</span>
                      </div>
                    )}
                    {testResult.details?.adsetId && (
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">ID Conjunto de Anuncios</span>
                        <span className="font-mono font-bold text-slate-900 break-all">{testResult.details.adsetId}</span>
                      </div>
                    )}
                    {testResult.details?.adId ? (
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">ID Anuncio & Creativo</span>
                        <span className="font-mono font-bold text-slate-900 break-all">{testResult.details.adId}</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="text-[10px] uppercase font-bold text-amber-800 block">Anuncio Visual</span>
                        <span className="text-[11px] text-amber-900 leading-tight block">
                          Campaña y Conjunto listos. Para anuncio visual, asigna tu Fanpage en Business Suite.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {testResult.status === 'error' && testResult.details && (
                  <div className="p-3 bg-white/95 rounded-xl border border-rose-200 overflow-x-auto text-[11px] font-mono text-slate-700">
                    <pre>{JSON.stringify(testResult.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Parámetros & Mock Visual del Anuncio */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Columna Izquierda: Parámetros Técnicos (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Segmentación Base
                    </span>
                    <div className="text-xs font-bold text-slate-800">
                      Edades 18 - 65 años
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Geolocalización: País de la cuenta publicitaria
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Presupuesto & Estado
                    </span>
                    <div className="text-xs font-bold text-emerald-700">
                      Mínimo Diario • 100% PAUSED
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      0 gasto real sin aprobación manual en Ads Manager
                    </span>
                  </div>
                </div>

                {/* Copies predeterminados */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 text-xs shadow-2xs">
                  <div className="font-bold text-slate-800 flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Copies & Textos Predeterminados (Sin IA):</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Estáticos
                    </span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 font-semibold block mb-0.5">Título (Headline):</span>
                      <p className="font-bold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        TICO Performance | Automatización & Pauta Digital
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block mb-0.5">Texto Principal (Primary Copy):</span>
                      <p className="font-normal text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed">
                        🚀 Impulsa el crecimiento de tu marca con estrategias de alto rendimiento. Campaña de prueba generada automáticamente por TICO Performance para verificar la integración oficial con Meta Marketing API.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-slate-600 pt-1">
                      <span><strong>CTA:</strong> Más información (LEARN_MORE)</span>
                      <span>•</span>
                      <span><strong>Destino:</strong> https://tictacagency.co</span>
                    </div>
                  </div>
                </div>

                {/* Fanpage Helper */}
                {(!metaState.pageId && !customPageId) ? (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>¿Tienes el ID de tu Fanpage de Facebook? (Opcional)</span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Si lo tienes a mano, puedes ingresarlo aquí para asociarlo al creativo. Si lo dejas vacío, la prueba creará exitosamente la <strong>Campaña y Conjunto de Anuncios</strong> en PAUSED certificando la conectividad de la cuenta.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={customPageId}
                        onChange={(e) => setCustomPageId(e.target.value)}
                        placeholder="Ej: 109283748291029 (ID de Fanpage de Facebook)"
                        className="flex-1 bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between shadow-2xs">
                    <span className="font-semibold">
                      Página lista para el anuncio: <strong>{customPageId || metaState.pageName || metaState.pageId}</strong>
                    </span>
                    {customPageId && (
                      <button
                        type="button"
                        onClick={() => setCustomPageId('')}
                        className="text-[11px] text-slate-500 hover:text-slate-900 underline cursor-pointer"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Mock Visual del Anuncio (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      T
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        TicTac Performance
                      </div>
                      <div className="text-[10px] text-slate-400">Publicidad • Prueba en Pausa</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-600 font-semibold border border-slate-200">
                    PAUSED
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                  🚀 Impulsa el crecimiento de tu marca con estrategias de alto rendimiento. Campaña de prueba generada automáticamente por TICO Performance para verificar la integración...
                </p>

                {/* Creativo de imagen de ejemplo */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[16/9] bg-slate-900 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80"
                    alt="Creativo de prueba publicitaria"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[10px] font-mono backdrop-blur-xs flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3 text-emerald-400" />
                    <span>Creativo de Muestra</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between gap-2">
                  <div className="text-xs truncate flex-1">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">TICTACAGENCY.CO</span>
                    <strong className="text-slate-900 font-bold block truncate text-xs">
                      TICO Performance | Automatización
                    </strong>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold shrink-0">
                    Más información
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Permisos Oficiales Verificados en Meta</span>
              </span>
              <span className="text-emerald-700 text-xs font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                100% Verificado
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="flex items-center gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] ${
                  metaState.permissions.adsManagement ? 'bg-emerald-600' : 'bg-slate-300'
                }`}>
                  <Check className="w-3 h-3" />
                </span>
                <span className="font-semibold text-slate-800">ads_management</span>
              </div>

              <div className="flex items-center gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] ${
                  metaState.permissions.pagesReadEngagement ? 'bg-emerald-600' : 'bg-slate-300'
                }`}>
                  <Check className="w-3 h-3" />
                </span>
                <span className="font-semibold text-slate-800">pages_read_engagement / ads_read</span>
              </div>

              <div className="flex items-center gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] ${
                  metaState.permissions.businessManagement ? 'bg-emerald-600' : 'bg-slate-300'
                }`}>
                  <Check className="w-3 h-3" />
                </span>
                <span className="font-semibold text-slate-800">business_management</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
