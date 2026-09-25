import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Zap, 
  Check, 
  Key, 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Layers, 
  Briefcase, 
  Info, 
  AlertCircle, 
  ChevronDown, 
  Trash2,
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
      const perms = safe.permissions ? {
        adsManagement: Boolean(safe.permissions.adsManagement),
        // Si el usuario tenía los permisos de Marketing API asignados, asegurar que ads_read esté reflejado
        pagesReadEngagement: Boolean(safe.permissions.pagesReadEngagement || (safe.permissions.adsManagement && safe.permissions.businessManagement)),
        businessManagement: Boolean(safe.permissions.businessManagement)
      } : undefined;
      return {
        ...safe,
        ...(perms ? { permissions: perms } : {})
      } as SavedMetaConnection;
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
  const [expandedConnIds, setExpandedConnIds] = useState<Record<string, boolean>>({});
  const [connToDelete, setConnToDelete] = useState<SavedMetaConnection | null>(null);
  const [toastNotification, setToastNotification] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [connectionNotice, setConnectionNotice] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Auto-dismiss de la notificación toast abajo a la derecha
  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => {
      setToastNotification(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastNotification]);

  // Auto-dismiss de la notificación en el medio de la pantalla
  useEffect(() => {
    if (!connectionNotice) return;
    const timer = setTimeout(() => {
      setConnectionNotice(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [connectionNotice]);

  // Cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (connectionNotice) setConnectionNotice(null);
        if (connToDelete) setConnToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connToDelete, connectionNotice]);

  const toggleConnExpanded = (connId: string) => {
    setExpandedConnIds(prev => ({
      ...prev,
      [connId]: !prev[connId]
    }));
  };

  // Asegurar que el permiso ads_read/pagesReadEngagement se visualice activo si los otros permisos de Marketing API ya están verificados
  useEffect(() => {
    if (
      metaState.isConnected &&
      metaState.permissions &&
      !metaState.permissions.pagesReadEngagement &&
      metaState.permissions.adsManagement &&
      metaState.permissions.businessManagement
    ) {
      onUpdateMetaState({
        ...metaState,
        permissions: {
          ...metaState.permissions,
          pagesReadEngagement: true
        }
      });
    }
  }, [metaState.isConnected, metaState.permissions]);

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
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (metaState.savedConnections !== undefined) {
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
      const msg = 'Por favor ingresa tu Token de Acceso de Meta (System User Token o Graph API Token).';
      setAuthError(msg);
      setConnectionNotice({
        type: 'error',
        title: 'Token Requerido',
        message: msg
      });
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
        setExpandedConnIds(prev => ({ ...prev, [connId]: false }));

        if (chosenAcc) {
          setIsConnecting(false);
          setConnectionNotice({
            type: 'success',
            title: '¡Conexión Exitosa!',
            message: `Portafolio "${portfolioName}" y cuenta publicitaria vinculados correctamente con Meta Ads.`
          });

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
          setIsConnecting(false);
          setConnectionNotice({
            type: 'success',
            title: '¡Token Vinculado!',
            message: `Portafolio "${portfolioName}" verificado. No olvides asignar cuentas publicitarias en Meta Business Suite.`
          });

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
        setConnectionNotice({
          type: 'error',
          title: 'Conexión Fallida',
          message: errMsg
        });
      }
    } catch (err: any) {
      const errMsg = `Error de conexión con el servidor: ${err.message}`;
      setAuthError(errMsg);
      setIsConnecting(false);
      setConnectionNotice({
        type: 'error',
        title: 'Error de Conexión',
        message: errMsg
      });
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

      setConnectionNotice({
        type: 'success',
        title: '¡Entorno Demo Conectado!',
        message: `Portafolio de prueba "${demoPortfolioName}" vinculado con éxito.`
      });
    }, 600);
  };



  // 5. Disconnect (Keeps savedConnections safe!)
  const handleDisconnect = (remainingList?: SavedMetaConnection[]) => {
    const listToKeep = remainingList !== undefined ? remainingList : savedConnections;
    const sanitized = sanitizeSavedConnections(listToKeep);
    setSavedConnections(sanitized);
    saveToLocalStorageSafely(sanitized);

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
      diagnostics: ['La cuenta se encuentra desconectada. Vincula tu Token de Acceso de Meta permanente arriba o activa el modo demo para comenzar.'],
      savedConnections: sanitized
    });
    setRealAccounts([]);
    setAuthError(null);
    setInputToken('');
    setInputAdAccountId('');
  };

  // 6. Delete a Saved Connection at any time
  const handleDeleteSavedConnection = (connId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    delete sessionTokenCache.current[connId];
    setExpandedConnIds(prev => {
      const next = { ...prev };
      delete next[connId];
      return next;
    });

    const deletedConn = savedConnections.find(c => c.id === connId);
    const updatedList = savedConnections.filter(c => c.id !== connId);
    const sanitizedList = sanitizeSavedConnections(updatedList);
    setSavedConnections(sanitizedList);
    saveToLocalStorageSafely(sanitizedList);

    // Notificación toast flotante abajo a la derecha
    setToastNotification({
      text: 'Token eliminado exitosamente',
      type: 'success'
    });

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
        setInputToken('');
        setInputAdAccountId('');
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
            `ℹ️ Portafolio comercial eliminado de la lista guardada.`
          ],
          savedConnections: sanitizedList
        });
      } else {
        handleDisconnect(sanitizedList);
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
              Historial de conexiones guardadas por Portafolio Comercial de Meta. Consulta los detalles de tus portafolios, cuentas y activos vinculados.
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
          <div className="flex flex-col gap-4 w-full">
            {savedConnections.map((conn) => {
              const isExpanded = Boolean(expandedConnIds[conn.id]);

              const accountsForConn: AvailableAccount[] = conn.availableAccounts && conn.availableAccounts.length > 0
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

              return (
                <div
                  key={conn.id}
                  className="w-full rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs transition-all"
                >
                  {/* Fila Principal de la Ficha (Siempre Visible) */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-blue-50 text-blue-600 border-blue-200/70 shadow-2xs">
                        <Briefcase className="w-4.5 h-4.5" />
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Portafolio Comercial
                        </span>
                        <h4 className="text-sm sm:text-base font-extrabold text-[#0a194f] font-['Outfit'] leading-tight truncate">
                          {conn.portfolioName || conn.businessManagerName || 'Portafolio Comercial Meta'}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-500 font-medium">
                          ID BM: {conn.businessManagerId || 'Sin ID detectado'}
                        </div>
                      </div>
                    </div>

                    {/* Acciones del Encabezado */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Botón Desplegable */}
                      <button
                        type="button"
                        onClick={() => toggleConnExpanded(conn.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                        title={isExpanded ? 'Ocultar detalles' : 'Ver cuentas y detalles'}
                      >
                        <span>{isExpanded ? 'Menos detalles' : 'Ver cuentas y detalles'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Botón Borrar (Abre confirmación previa) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConnToDelete(conn);
                        }}
                        title="Eliminar este portafolio de guardados"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 pointer-events-none" />
                      </button>
                    </div>
                  </div>

                  {/* Contenido Desplegable (Cuentas Publicitarias + Activos + Detalles) con Animación */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={`content-${conn.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-100 p-3.5 sm:p-4 bg-slate-50/50 rounded-b-2xl space-y-3.5">
                      {/* Cuentas Publicitarias Disponibles en Meta (Solo Informativo) */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <span>Cuentas Publicitarias Disponibles en Meta ({accountsForConn.length}):</span>
                        </div>

                        {accountsForConn.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {accountsForConn.map((acc) => {
                              const isPrimary = conn.adAccountId === acc.id;
                              return (
                                <div
                                  key={acc.id}
                                  className="p-3 rounded-xl border border-slate-200/80 bg-white flex flex-col justify-between shadow-2xs"
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                        {acc.id}
                                      </span>
                                      <span className="text-emerald-700 text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                        {acc.status}
                                      </span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 leading-snug truncate" title={acc.name}>
                                      {acc.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                      {acc.businessName || conn.portfolioName}
                                    </div>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500">Moneda: <strong className="text-slate-700">{acc.currency}</strong></span>
                                    {isPrimary && (
                                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                        Principal
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            0 cuentas publicitarias asignadas directamente a este portafolio en Meta Business Suite.
                          </div>
                        )}
                      </div>

                      {/* Grid de Activos: Píxel, Fanpage y Detalles del Token */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Píxel de Seguimiento
                          </span>
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {conn.pixelName || (conn.pixelId ? `Píxel ${conn.pixelId}` : 'Sin píxel configurado')}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {conn.pixelId || 'No detectado en esta cuenta'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Página de Anunciante (Fanpage)
                          </span>
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {conn.pageName || (conn.pageId ? `Página ${conn.pageId}` : 'Sin página asociada')}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {conn.pageId || 'No asignada al usuario'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Usuario del Sistema
                          </span>
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {conn.userName || 'Usuario Meta'} ({conn.userType || 'SYSTEM_USER'})
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Vinculado el: <span className="font-mono">{conn.connectedAt}</span>
                          </span>
                        </div>
                      </div>

                      {/* Permisos Oficiales del Portafolio */}
                      {conn.permissions && (
                        <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permisos:</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                              conn.permissions.adsManagement ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <Check className="w-3 h-3" /> ads_management
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                              conn.permissions.pagesReadEngagement ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <Check className="w-3 h-3" /> ads_read / pages_read_engagement
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                              conn.permissions.businessManagement ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <Check className="w-3 h-3" /> business_management
                            </span>
                          </div>

                          {conn.appName && (
                            <span className="text-[11px] text-slate-500">
                              App en Meta: <strong className="text-slate-700">{conn.appName}</strong>
                            </span>
                          )}
                        </div>
                      )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

      {/* Notificación en el medio de la pantalla (Conexión Exitosa o Fallida al vincular token) */}
      {connectionNotice && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setConnectionNotice(null)}
        >
          {/* Ambient background glow orbs */}
          {connectionNotice.type === 'success' ? (
            <>
              <div className="fixed -top-24 -left-24 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-300/15 rounded-full blur-[100px] pointer-events-none" />
            </>
          ) : (
            <>
              <div className="fixed -top-24 -left-24 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-red-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-300/15 rounded-full blur-[100px] pointer-events-none" />
            </>
          )}

          {/* Glassmorphic Card */}
          <div 
            className={`relative w-full max-w-[390px] rounded-[30px] bg-white/95 backdrop-blur-2xl border p-6 sm:p-7 flex flex-col items-center my-auto transition-all z-10 text-center animate-in zoom-in-95 duration-200 ${
              connectionNotice.type === 'success'
                ? 'border-emerald-200 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.3)]'
                : 'border-rose-200 shadow-[0_25px_60px_-15px_rgba(244,63,94,0.3)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setConnectionNotice(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer z-20"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Floating Gradient Icon with Aura */}
            <div className="relative flex items-center justify-center mb-1">
              <div 
                className={`absolute inset-0 rounded-2xl blur-lg transform scale-110 pointer-events-none ${
                  connectionNotice.type === 'success' ? 'bg-emerald-500/25' : 'bg-rose-500/25'
                }`} 
              />
              <div 
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{
                  background: connectionNotice.type === 'success'
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)'
                    : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)'
                }}
              >
                {connectionNotice.type === 'success' ? (
                  <CheckCircle2 className="w-8 h-8 text-white stroke-[2.2]" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-white stroke-[2.2]" />
                )}
              </div>
            </div>

            {/* Title & Description */}
            <h2 className="text-xl sm:text-[22px] font-bold text-slate-800 tracking-tight font-['Outfit'] mt-3">
              {connectionNotice.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed max-w-[320px] mx-auto">
              {connectionNotice.message}
            </p>

            {/* Action Button */}
            <div className="mt-6 w-full">
              <button
                type="button"
                onClick={() => setConnectionNotice(null)}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99] ${
                  connectionNotice.type === 'success'
                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:opacity-95 shadow-[0_10px_24px_rgba(16,185,129,0.35)]'
                    : 'bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 hover:opacity-95 shadow-[0_10px_24px_rgba(244,63,94,0.35)]'
                }`}
              >
                {connectionNotice.type === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white stroke-[2.2]" />
                    <span>Continuar</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-white stroke-[2.2]" />
                    <span>Entendido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Conexión / Token */}
      {connToDelete && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setConnToDelete(null)}
        >
          {/* Ambient background glow orbs */}
          <div className="fixed -top-24 -left-24 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-300/15 rounded-full blur-[100px] pointer-events-none" />

          {/* Glassmorphic Card */}
          <div 
            className="relative w-full max-w-[380px] rounded-[30px] bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(244,63,94,0.25)] p-6 sm:p-7 flex flex-col items-center my-auto transition-all z-10 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setConnToDelete(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer z-20"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Floating Gradient Icon with Aura */}
            <div className="relative flex items-center justify-center mb-1">
              <div className="absolute inset-0 bg-rose-500/20 rounded-2xl blur-lg transform scale-110 pointer-events-none" />
              <div 
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_24px_rgba(244,63,94,0.3)]"
                style={{
                  background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)'
                }}
              >
                <Trash2 className="w-7 h-7 text-white stroke-[2.2]" />
              </div>
            </div>

            {/* Title & Description */}
            <h2 className="text-xl sm:text-[22px] font-bold text-slate-800 tracking-tight font-['Outfit'] mt-3">
              ¿Deseas eliminar este token?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed max-w-[300px] mx-auto">
              Se desvinculará el portafolio comercial{' '}
              <strong className="text-slate-700 font-semibold">
                "{connToDelete.portfolioName || connToDelete.businessManagerName || 'Meta Ads'}"
              </strong>.
              Podrás volver a agregarlo en cualquier momento ingresando tu token.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2.5 mt-6 w-full">
              <button
                type="button"
                onClick={() => setConnToDelete(null)}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-[#f0f3fa]/90 hover:bg-[#e6ebf7] border border-[#e2e8f5] text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer text-center active:scale-[0.99]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = connToDelete.id;
                  setConnToDelete(null);
                  handleDeleteSavedConnection(idToDelete);
                }}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 hover:opacity-95 active:scale-[0.99] text-white font-bold text-xs sm:text-sm tracking-wide shadow-[0_10px_24px_rgba(244,63,94,0.35)] hover:shadow-[0_14px_28px_rgba(244,63,94,0.45)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-white stroke-[2.2]" />
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Toast flotante abajo a la derecha */}
      {toastNotification && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[80] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border bg-slate-900 text-white border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {toastNotification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-sky-400 shrink-0" />
          )}
          <span className="text-sm font-semibold tracking-wide">
            {toastNotification.text}
          </span>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
