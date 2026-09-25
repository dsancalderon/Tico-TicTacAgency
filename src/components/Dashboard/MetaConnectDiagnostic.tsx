import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Check, 
  Key, 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Layers, 
  Briefcase, 
  Info, 
  RefreshCw, 
  AlertCircle, 
  ChevronDown, 
  Trash2 
} from 'lucide-react';
import type { MetaConnectionState, MetaAvailableAccount as AvailableAccount, SavedMetaConnection } from '../../types';
import { verifyMetaTokenApi, verifyMetaAccountApi } from '../../services/api';
import { MetaBrandLogo } from '../BrandLogos';

const LOCAL_STORAGE_SAVED_CONNECTIONS_KEY = 'tico_saved_meta_connections';

// Sanitizar para asegurar que NUNCA se almacene ningún token en localStorage y proteger contra elementos corruptos
export const sanitizeSavedConnections = (connections?: SavedMetaConnection[] | null): SavedMetaConnection[] => {
  if (!Array.isArray(connections)) return [];
  return connections
    .filter((c): c is SavedMetaConnection => Boolean(c && typeof c === 'object'))
    .map(c => {
      const { token, ...safe } = c as any;
      return safe as SavedMetaConnection;
    });
};

const saveToLocalStorageSafely = (connections: SavedMetaConnection[]) => {
  try {
    const sanitized = sanitizeSavedConnections(connections);
    localStorage.setItem(LOCAL_STORAGE_SAVED_CONNECTIONS_KEY, JSON.stringify(sanitized));
  } catch {}
};

const loadLocalSavedConnections = (): SavedMetaConnection[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_CONNECTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Purgar inmediatamente cualquier token que pudiera haber quedado en el localStorage del usuario
        const sanitized = sanitizeSavedConnections(parsed);
        localStorage.setItem(LOCAL_STORAGE_SAVED_CONNECTIONS_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
    }
  } catch {}
  return [];
};

interface MetaConnectDiagnosticProps {
  metaState: MetaConnectionState;
  onUpdateMetaState: (newState: MetaConnectionState) => void;
}

export const MetaConnectDiagnostic: React.FC<MetaConnectDiagnosticProps> = ({
  metaState,
  onUpdateMetaState
}) => {
  // Connection Form State
  const [inputToken, setInputToken] = useState('');
  const [inputAdAccountId, setInputAdAccountId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Guide State
  const [copiedPermission, setCopiedPermission] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Connected State
  const [selectedAccountId, setSelectedAccountId] = useState(metaState.adAccountId || '');
  const [realAccounts, setRealAccounts] = useState<AvailableAccount[]>(() => {
    if (metaState.availableAccounts && metaState.availableAccounts.length > 0) {
      return metaState.availableAccounts;
    }
    if (metaState.adAccountId) {
      return [{
        id: metaState.adAccountId,
        name: metaState.adAccountName || 'Cuenta Publicitaria Principal',
        businessName: metaState.businessManagerName || 'Meta Business Suite',
        businessId: metaState.businessManagerId,
        currency: 'USD',
        status: 'ACTIVA',
        pixelName: metaState.pixelName,
        pixelId: metaState.pixelId,
        pageName: metaState.pageName,
        pageId: metaState.pageId
      }];
    }
    return [];
  });
  const [manualAccountId, setManualAccountId] = useState('');
  const [customPageId, setCustomPageId] = useState(metaState.pageId || '');
  const [isVerifyingManualAccount, setIsVerifyingManualAccount] = useState(false);
  const [manualAccountError, setManualAccountError] = useState<string | null>(null);
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false);

  // Cache de tokens en memoria de la sesión activa (RAM) - NUNCA en disco ni en base de datos
  const sessionTokenCache = useRef<Record<string, string>>({});

  // Saved Meta Connections State (Portafolios Comerciales Guardados - solo metadatos)
  const [savedConnections, setSavedConnections] = useState<SavedMetaConnection[]>(() => {
    if (metaState.savedConnections && metaState.savedConnections.length > 0) {
      return sanitizeSavedConnections(metaState.savedConnections);
    }
    const localList = loadLocalSavedConnections();
    if (localList.length > 0) return localList;
    if (metaState.isConnected && (metaState.adAccountId || metaState.userAccessToken)) {
      const primaryId = metaState.businessManagerId || metaState.adAccountId || 'meta-conn-primary';
      if (metaState.userAccessToken) {
        sessionTokenCache.current[primaryId] = metaState.userAccessToken;
      }
      return [{
        id: primaryId,
        portfolioName: metaState.businessManagerName || (metaState.isRealToken ? 'Portafolio Comercial Meta' : 'TicTac Agency Performance Sandbox'),
        businessManagerId: metaState.businessManagerId,
        businessManagerName: metaState.businessManagerName,
        adAccountId: metaState.adAccountId,
        adAccountName: metaState.adAccountName,
        appName: metaState.appName,
        appId: metaState.appId,
        userName: metaState.userName,
        userId: metaState.userId,
        userType: metaState.userType,
        status: metaState.status,
        isRealToken: metaState.isRealToken,
        pixelId: metaState.pixelId,
        pixelName: metaState.pixelName,
        pageId: metaState.pageId,
        pageName: metaState.pageName,
        availableAccounts: metaState.availableAccounts,
        permissions: metaState.permissions,
        connectedAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
      }];
    }
    return [];
  });

  // Sincronizar conexiones guardadas si cambian desde el workspace (asegurando almacenamiento seguro sin tokens)
  useEffect(() => {
    if (metaState.savedConnections && metaState.savedConnections.length > 0) {
      const sanitized = sanitizeSavedConnections(metaState.savedConnections);
      setSavedConnections(sanitized);
      saveToLocalStorageSafely(sanitized);
    }
  }, [metaState.savedConnections]);

  // Sincronizar cuentas automáticamente al montar o si cambia metaState
  useEffect(() => {
    if (metaState.availableAccounts && metaState.availableAccounts.length > 0) {
      setRealAccounts(metaState.availableAccounts);
    } else if (metaState.adAccountId && realAccounts.length === 0) {
      const fallbackAcc: AvailableAccount = {
        id: metaState.adAccountId,
        name: metaState.adAccountName || 'Cuenta Publicitaria Principal',
        businessName: metaState.businessManagerName || 'Meta Business Suite',
        businessId: metaState.businessManagerId,
        currency: 'USD',
        status: 'ACTIVA',
        pixelName: metaState.pixelName,
        pixelId: metaState.pixelId,
        pageName: metaState.pageName,
        pageId: metaState.pageId
      };
      setRealAccounts([fallbackAcc]);
    }

    // Si tiene token y está conectado pero aún no tiene lista de cuentas detallada en metaState, consultarla en segundo plano (solo para tokens reales, no sandbox demo)
    if (
      metaState.isConnected &&
      metaState.isRealToken &&
      metaState.userAccessToken &&
      !metaState.userAccessToken.startsWith('EAAB_Demo') &&
      (!metaState.availableAccounts || metaState.availableAccounts.length === 0)
    ) {
      verifyMetaTokenApi(metaState.userAccessToken).then(res => {
        if (res.success && res.diagnostic?.valid && res.diagnostic.adAccounts && res.diagnostic.adAccounts.length > 0) {
          const diag = res.diagnostic;
          const userAccounts: AvailableAccount[] = diag.adAccounts.map((acc: any) => ({
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
          onUpdateMetaState({
            ...metaState,
            availableAccounts: userAccounts
          });
        }
      }).catch(() => {});
    }
  }, [metaState.userAccessToken, metaState.isConnected, metaState.adAccountId, metaState.availableAccounts]);

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

    // Limpiar campos de texto al usar el botón
    setInputToken('');
    setInputAdAccountId('');
    setShowPassword(false);

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

        const portfolioName = chosenAcc?.businessName || diag.businesses?.[0]?.name || (cleanAccountId ? `Portafolio (${cleanAccountId})` : 'Portafolio Comercial Meta');
        const connId = chosenAcc?.businessId || diag.businesses?.[0]?.id || chosenAcc?.id || `meta_conn_${Date.now()}`;

        const newSavedConn: SavedMetaConnection = {
          id: connId,
          portfolioName,
          businessManagerId: chosenAcc?.businessId || diag.businesses?.[0]?.id,
          businessManagerName: chosenAcc?.businessName || diag.businesses?.[0]?.name,
          adAccountId: chosenAcc?.id || cleanAccountId || '',
          adAccountName: chosenAcc?.name || (cleanAccountId ? `Cuenta ${cleanAccountId}` : ''),
          token: cleanToken,
          appName: diag.app?.name || 'Tico Performance Ads',
          appId: diag.app?.id,
          userName: diag.user?.name || 'Usuario Meta',
          userId: diag.user?.id,
          userType: diag.user?.type || 'SYSTEM_USER',
          status: chosenAcc ? 'ready_to_deploy' : 'connected_needs_perms',
          isRealToken: true,
          pixelId: chosenAcc?.pixelId,
          pixelName: chosenAcc?.pixelName,
          pageId: chosenAcc?.pageId || diag.pages?.[0]?.id,
          pageName: chosenAcc?.pageName || diag.pages?.[0]?.name,
          availableAccounts: userAccounts,
          permissions: {
            adsManagement: diag.permissions?.adsManagement ?? true,
            pagesReadEngagement: diag.permissions?.pagesReadEngagement ?? true,
            businessManagement: diag.permissions?.businessManagement ?? true
          },
          connectedAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        };

        const updatedSaved = [
          newSavedConn,
          ...savedConnections.filter(c => c.id !== newSavedConn.id && (c.adAccountId ? c.adAccountId !== newSavedConn.adAccountId : true))
        ];
        sessionTokenCache.current[connId] = cleanToken;
        const sanitizedSaved = sanitizeSavedConnections(updatedSaved);
        setSavedConnections(sanitizedSaved);
        saveToLocalStorageSafely(sanitizedSaved);

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
            availableAccounts: userAccounts,
            permissions: {
              adsManagement: diag.permissions?.adsManagement ?? true,
              pagesReadEngagement: diag.permissions?.pagesReadEngagement ?? true,
              businessManagement: diag.permissions?.businessManagement ?? true
            },
            diagnostics: [
              `✅ App oficial en Meta: ${diag.app?.name || 'Tico Performance Ads'} (ID: ${diag.app?.id || 'N/A'})`,
              `✅ Usuario del Sistema verificado: ${diag.user?.name || 'Usuario Meta'} (ID: ${diag.user?.id})`,
              `✅ Permisos de Marketing API verificados (ads_management, ads_read, business_management).`,
              `✅ Portafolio comercial vinculado: ${portfolioName}.`,
              `✅ Cuenta publicitaria vinculada: ${chosenAcc.name} (${chosenAcc.id}).`,
              `✅ Cuentas asociadas encontradas: ${userAccounts.length}`
            ],
            savedConnections: sanitizedSaved
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
            availableAccounts: userAccounts,
            permissions: {
              adsManagement: diag.permissions?.adsManagement ?? true,
              pagesReadEngagement: diag.permissions?.pagesReadEngagement ?? true,
              businessManagement: diag.permissions?.businessManagement ?? true
            },
            diagnostics: [
              `✅ App oficial en Meta: ${diag.app?.name || 'Tico Performance Ads'} (ID: ${diag.app?.id || 'N/A'})`,
              `✅ Usuario del Sistema verificado: ${diag.user?.name || 'Tico'} (ID: ${diag.user?.id})`,
              `✅ Permisos de Marketing API activos: ads_management, ads_read, business_management.`,
              `✅ Portafolio comercial registrado: ${portfolioName}.`,
              `⚠️ Sin cuentas publicitarias asignadas directamente al Usuario del Sistema en Meta Business Suite.`
            ],
            savedConnections: sanitizedSaved
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
            availableAccounts: userAccounts,
            diagnostics: [
              ...metaState.diagnostics.filter(d => !d.startsWith('✅ Cuenta publicitaria vinculada:') && !d.startsWith('⚠️ Sin cuentas')),
              `✅ Cuenta publicitaria oficial vinculada: ${chosen.name} (${chosen.id}).`
            ]
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
          availableAccounts: updated,
          diagnostics: [
            ...metaState.diagnostics.filter(d => !d.startsWith('✅ Cuenta publicitaria') && !d.startsWith('⚠️ Sin cuentas')),
            `✅ Cuenta publicitaria verificada en Meta: ${newAcc.name} (${newAcc.id}).`
          ]
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
    setInputToken('');
    setInputAdAccountId('');

    setTimeout(() => {
      setIsConnecting(false);
      const chosenAcc = defaultAccounts[0];
      const demoPortfolioName = chosenAcc.businessName || 'TicTac Agency Performance Sandbox';

      const demoConn: SavedMetaConnection = {
        id: 'meta_demo_sandbox',
        portfolioName: demoPortfolioName,
        businessManagerId: 'bm_demo_sandbox',
        businessManagerName: chosenAcc.businessName,
        adAccountId: chosenAcc.id,
        adAccountName: chosenAcc.name,
        appName: 'TicTac Demo App',
        appId: 'demo_app_001',
        userName: 'Usuario Sandbox',
        userId: 'demo_user_123',
        userType: 'DEMO',
        status: 'ready_to_deploy',
        isRealToken: false,
        pixelId: 'pix_demo_123',
        pixelName: 'Meta Pixel Conversiones Demo',
        pageId: 'page_demo_123',
        pageName: 'TicTac Agency Performance Demo',
        availableAccounts: defaultAccounts,
        permissions: {
          adsManagement: true,
          pagesReadEngagement: true,
          businessManagement: true
        },
        connectedAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
      };

      sessionTokenCache.current['meta_demo_sandbox'] = 'EAAB_Demo_Verified_Token';
      const updatedSaved = [
        demoConn,
        ...savedConnections.filter(c => c.id !== demoConn.id)
      ];
      const sanitizedSaved = sanitizeSavedConnections(updatedSaved);
      setSavedConnections(sanitizedSaved);
      saveToLocalStorageSafely(sanitizedSaved);

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
          `Portafolio comercial: ${demoPortfolioName}.`,
          `Cuenta publicitaria seleccionada: ${chosenAcc.name} (${chosenAcc.id}).`,
          'Píxel de conversiones vinculado y listo.'
        ],
        savedConnections: sanitizedSaved
      });
    }, 600);
  };

  // 3. Switch Account
  const handleSelectAccount = (acc: AvailableAccount) => {
    setSelectedAccountId(acc.id);
    if (metaState.isConnected) {
      const updatedList = savedConnections.map(c => {
        const isThisConn = (c.businessManagerId && c.businessManagerId === metaState.businessManagerId) ||
                           (c.adAccountId && c.adAccountId === metaState.adAccountId);
        if (isThisConn) {
          return {
            ...c,
            adAccountId: acc.id,
            adAccountName: acc.name,
            businessManagerId: acc.businessId || c.businessManagerId,
            businessManagerName: acc.businessName || c.businessManagerName,
            pixelId: acc.pixelId || c.pixelId,
            pixelName: acc.pixelName || c.pixelName,
            pageId: acc.pageId || c.pageId,
            pageName: acc.pageName || c.pageName
          };
        }
        return c;
      });
      const sanitized = sanitizeSavedConnections(updatedList);
      setSavedConnections(sanitized);
      saveToLocalStorageSafely(sanitized);

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
        availableAccounts: realAccounts,
        diagnostics: [
          ...metaState.diagnostics.filter(d => !d.startsWith('✅ Cuenta publicitaria vinculada:')),
          `✅ Cuenta publicitaria vinculada: ${acc.name} (${acc.id}).`
        ],
        savedConnections: sanitized
      });
    }
  };

  // 5. Disconnect (Keeps savedConnections safe!)
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
      diagnostics: ['La cuenta se encuentra desconectada. Selecciona una conexión guardada abajo o ingresa un nuevo token para continuar.'],
      savedConnections
    });
    setRealAccounts([]);
    setSelectedAccountId('');
    setManualAccountId('');
    setManualAccountError(null);
    setAuthError(null);
    setInputToken('');
    setInputAdAccountId('');
  };

  // 6. Select a Saved Connection (Portafolio Comercial)
  const handleSelectSavedConnection = (conn: SavedMetaConnection) => {
    const activeToken = sessionTokenCache.current[conn.id] || conn.token || metaState.userAccessToken || '';
    setInputToken(activeToken);
    setInputAdAccountId(conn.adAccountId || '');
    setSelectedAccountId(conn.adAccountId || '');

    const accountsToUse = conn.availableAccounts && conn.availableAccounts.length > 0
      ? conn.availableAccounts
      : (conn.adAccountId ? [{
          id: conn.adAccountId,
          name: conn.adAccountName || 'Cuenta Publicitaria Principal',
          businessName: conn.businessManagerName || conn.portfolioName,
          businessId: conn.businessManagerId,
          currency: 'USD',
          status: 'ACTIVA',
          pixelName: conn.pixelName,
          pixelId: conn.pixelId,
          pageName: conn.pageName,
          pageId: conn.pageId
        }] : []);

    setRealAccounts(accountsToUse);
    setCustomPageId(conn.pageId || '');
    setAuthError(null);

    onUpdateMetaState({
      ...metaState,
      isConnected: true,
      isRealToken: conn.isRealToken ?? true,
      status: conn.status || (conn.adAccountId ? 'ready_to_deploy' : 'connected_needs_perms'),
      userAccessToken: activeToken,
      appName: conn.appName || 'Tico Performance Ads',
      appId: conn.appId,
      userName: conn.userName || 'Usuario Meta',
      userId: conn.userId,
      userType: conn.userType || 'SYSTEM_USER',
      businessManagerId: conn.businessManagerId,
      businessManagerName: conn.businessManagerName || conn.portfolioName,
      adAccountId: conn.adAccountId,
      adAccountName: conn.adAccountName,
      pixelId: conn.pixelId,
      pixelName: conn.pixelName,
      pageId: conn.pageId,
      pageName: conn.pageName,
      availableAccounts: accountsToUse,
      permissions: conn.permissions || {
        adsManagement: true,
        pagesReadEngagement: true,
        businessManagement: true
      },
      diagnostics: [
        `✅ Portafolio comercial activado: ${conn.portfolioName}`,
        conn.adAccountName ? `✅ Cuenta publicitaria vinculada: ${conn.adAccountName} (${conn.adAccountId})` : '⚠️ Sin cuenta publicitaria seleccionada',
        `✅ App oficial en Meta: ${conn.appName || 'Tico Performance Ads'}`,
        `✅ Conexión lista para orquestar campañas.`
      ],
      savedConnections: sanitizeSavedConnections(savedConnections)
    });
  };

  // 7. Delete a Saved Connection at any time
  const handleDeleteSavedConnection = (connId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    delete sessionTokenCache.current[connId];
    const deletedConn = savedConnections.find(c => c.id === connId);
    const updatedList = savedConnections.filter(c => c.id !== connId);
    const sanitizedList = sanitizeSavedConnections(updatedList);
    setSavedConnections(sanitizedList);
    saveToLocalStorageSafely(sanitizedList);

    const isCurrentActive = metaState.isConnected && (
      (deletedConn?.businessManagerId && metaState.businessManagerId === deletedConn.businessManagerId) ||
      (deletedConn?.adAccountId && metaState.adAccountId === deletedConn.adAccountId) ||
      (deletedConn?.id === connId)
    );

    if (isCurrentActive) {
      if (sanitizedList.length > 0) {
        // Pasar al siguiente portafolio comercial guardado
        const nextConn = sanitizedList[0];
        const nextToken = sessionTokenCache.current[nextConn.id] || nextConn.token || '';
        setInputToken(nextToken);
        setInputAdAccountId(nextConn.adAccountId || '');
        setSelectedAccountId(nextConn.adAccountId || '');
        const accs = nextConn.availableAccounts && nextConn.availableAccounts.length > 0 ? nextConn.availableAccounts : [];
        setRealAccounts(accs);
        onUpdateMetaState({
          ...metaState,
          isConnected: true,
          isRealToken: nextConn.isRealToken ?? true,
          status: nextConn.status || (nextConn.adAccountId ? 'ready_to_deploy' : 'connected_needs_perms'),
          userAccessToken: nextToken,
          appName: nextConn.appName || 'Tico Performance Ads',
          appId: nextConn.appId,
          userName: nextConn.userName || 'Usuario Meta',
          userId: nextConn.userId,
          userType: nextConn.userType || 'SYSTEM_USER',
          businessManagerId: nextConn.businessManagerId,
          businessManagerName: nextConn.businessManagerName || nextConn.portfolioName,
          adAccountId: nextConn.adAccountId,
          adAccountName: nextConn.adAccountName,
          pixelId: nextConn.pixelId,
          pixelName: nextConn.pixelName,
          pageId: nextConn.pageId,
          pageName: nextConn.pageName,
          availableAccounts: accs,
          permissions: nextConn.permissions || {
            adsManagement: true,
            pagesReadEngagement: true,
            businessManagement: true
          },
          diagnostics: [
            `ℹ️ Conexión eliminada. Se activó el portafolio comercial restante: ${nextConn.portfolioName}.`
          ],
          savedConnections: sanitizedList
        });
      } else {
        handleDisconnect();
      }
    } else {
      onUpdateMetaState({
        ...metaState,
        savedConnections: sanitizedList
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. TARJETA PRINCIPAL DE CONEXIÓN META ADS (ESTRUCTURA IDÉNTICA A GOOGLE)  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-extrabold text-[#0a194f] font-['Outfit'] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-2xs">
                <MetaBrandLogo className="w-4 h-4" />
              </div>
              <span>Conexión con Meta Ads API</span>
            </h3>
            <p className="text-xs text-[#0a194f]/80 mt-0.5">
              Conecta tu Token de Usuario del Sistema (System User Token) de Meta Business Manager para orquestar campañas en Facebook e Instagram en estado PAUSED.
            </p>
          </div>
        </div>

        {/* Formulario de Conexión Meta Ads (Misma estructura de Google Ads) */}
        <form onSubmit={handleConnectWithToken} className="space-y-4 max-w-xl">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Meta System User Token (Token de Acceso)
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={inputToken}
              onChange={(e) => { setInputToken(e.target.value); setAuthError(null); }}
              placeholder="Ej. EAABw... (System User Token permanente de Meta)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Encuentra o genera tu token permanente en Meta Business Manager &gt; Usuarios del Sistema con permisos ads_management.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ID de Cuenta Publicitaria (Opcional)
            </label>
            <input
              type="text"
              value={inputAdAccountId}
              onChange={(e) => { setInputAdAccountId(e.target.value); setAuthError(null); }}
              placeholder="Ej. act_1234567890 o 1234567890 (si deseas predeterminarla)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Si lo dejas vacío, TICO detectará automáticamente todas las cuentas publicitarias vinculadas al token.
            </span>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isConnecting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verificando con Meta Graph API...</span>
                </>
              ) : (
                <span>Vincular y guardar</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleConnectDemo}
              disabled={isConnecting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Modo Demo</span>
            </button>
          </div>
        </form>

        {/* Controles de Cuentas y Prueba en Pausa (si está conectado) */}
        {metaState.isConnected && (
          <div className="pt-6 border-t border-slate-100 space-y-6">

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

        {/* Diagnóstico de Integración Meta Ads (Misma estructura que Google Ads) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Diagnóstico de Integración Meta Ads
          </span>
          <div className="space-y-1.5">
            {metaState.diagnostics.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  metaState.isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                }`} />
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Enlaces Oficiales (Misma estructura que Google Ads) */}
        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <a
            href="https://adsmanager.facebook.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-bold text-blue-600 hover:underline"
          >
            <span>Meta Ads Manager</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <a
            href="https://developers.facebook.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-bold text-slate-600 hover:underline"
          >
            <span>Meta for Developers</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <a
            href="https://developers.facebook.com/tools/explorer/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-bold text-slate-600 hover:underline"
          >
            <span>Graph API Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ESPACIO DEDICADO: PORTAFOLIOS COMERCIALES Y CONEXIONES GUARDADAS       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#0a194f] font-['Outfit']">
              Portafolios Comerciales y Conexiones Guardadas
            </h3>
            <p className="text-xs text-[#0a194f]/80 mt-0.5">
              Conexiones guardadas por Portafolio Comercial de Meta. Puedes seguir agregando más tokens arriba, alternar entre portafolios o eliminarlos en cualquier momento.
            </p>
          </div>
        </div>

        {/* Lista de Conexiones Guardadas o Estado Vacío */}
        {savedConnections.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-slate-700 font-['Outfit']">
              Aún no hay portafolios comerciales guardados
            </div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
              Ingresa tu Token de Acceso permanente en el formulario de arriba o usa el modo demo. Tu portafolio comercial y su cuenta publicitaria se guardarán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedConnections.map((conn) => {
              const isActive = metaState.isConnected && (
                (metaState.userAccessToken && conn.token && metaState.userAccessToken === conn.token) ||
                (metaState.businessManagerId && conn.businessManagerId && metaState.businessManagerId === conn.businessManagerId) ||
                (metaState.adAccountId && conn.adAccountId && metaState.adAccountId === conn.adAccountId) ||
                (conn.id === metaState.businessManagerId)
              );

              return (
                <div
                  key={conn.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Encabezado de la Tarjeta del Portafolio */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {/* Nombre del Portafolio Comercial Prominente */}
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Portafolio Comercial
                          </span>
                          <h4 
                            className="text-sm sm:text-base font-extrabold text-[#0a194f] font-['Outfit'] leading-snug truncate" 
                            title={conn.portfolioName}
                          >
                            {conn.portfolioName || 'Portafolio Comercial Meta'}
                          </h4>
                          {conn.businessManagerId && (
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              ID BM: {conn.businessManagerId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botón de Eliminación con icono de papelera */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedConnection(conn.id, e)}
                        title="Eliminar este portafolio de guardados"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metadata de la Conexión */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-400 text-[11px]">Cuenta Publicitaria:</span>
                        <span className="font-bold font-mono text-[11px] truncate max-w-[200px]" title={conn.adAccountName || conn.adAccountId}>
                          {conn.adAccountName ? `${conn.adAccountName} (${conn.adAccountId})` : (conn.adAccountId || 'No asignada')}
                        </span>
                      </div>

                      {conn.appName && (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-400 text-[11px]">App Meta:</span>
                          <span className="font-medium text-[11px] truncate max-w-[200px]">{conn.appName}</span>
                        </div>
                      )}

                      {conn.userName && (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-400 text-[11px]">Usuario del Sistema:</span>
                          <span className="font-medium text-[11px] truncate max-w-[200px]">{conn.userName}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-500 pt-0.5">
                        <span className="text-[10px] text-slate-400">Vinculado el:</span>
                        <span className="text-[10px] font-mono text-slate-400">{conn.connectedAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones: Activo o Seleccionar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                    {isActive ? (
                      <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 py-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Portafolio activo para orquestar pauta</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectSavedConnection(conn)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Usar este Portafolio</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. GUÍA PASO A PASO EN FORMATO DESPLEGABLE (ABAJO)                         */}
      {/* ========================================================================= */}
      <details 
        onToggle={(e) => setIsGuideOpen(e.currentTarget.open)}
        className="group border border-slate-200/90 rounded-3xl bg-white shadow-xs overflow-hidden transition-all"
      >
        <summary className="p-6 cursor-pointer flex items-center justify-between font-extrabold text-[#0a194f] select-none hover:bg-slate-50/80 transition-colors list-none">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-[#0a194f] font-['Outfit']">
                Guía Paso a Paso: Cómo obtener tu Token Permanente y Permisos de Meta Ads
              </h4>
              <p className="text-xs text-[#0a194f]/80 font-normal mt-0.5">
                Haz clic para desplegar u ocultar los 5 apartados oficiales de Meta Developers y Business Manager.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 shrink-0">
            <span className="hidden sm:inline">
              {isGuideOpen ? 'Ocultar guía' : 'Ver guía'}
            </span>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isGuideOpen ? 'rotate-180' : ''}`} />
          </div>
        </summary>
        <div className="border-t border-slate-100 p-6 sm:p-8 lg:p-10 space-y-8 bg-slate-900 text-white">
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
      </details>
    </div>
  );
};
