import type { GoogleConnectionState, MetaConnectionState } from '../../types';
import { TicoMascot } from '../TicoMascot';
import { GoogleAdsBrandLogo, MetaBrandLogo } from '../BrandLogos';
import './tico-connection-network.css';

interface Props {
  metaState: MetaConnectionState;
  googleState?: GoogleConnectionState;
  onOpenConnections: () => void;
}

const incomingPaths = [
  'M 0 45 C 95 45 110 120 200 120',
  'M 0 120 C 90 120 95 45 150 45 S 160 120 200 120',
  'M 0 205 C 100 205 120 180 145 180 S 170 120 200 120',
];

/** Derived directly from account state: no timers or duplicate connection state. */
export function TicoConnectionNetwork({ metaState, googleState, onOpenConnections }: Props) {
  const providers = [
    { id: 'meta', name: 'Meta Ads', connected: metaState.isConnected && metaState.status !== 'disconnected',
      label: metaState.isConnected && metaState.status !== 'disconnected'
        ? metaState.status === 'connected_needs_perms' ? 'Requiere permisos' : 'Conectado' : 'Desconectado',
      Logo: MetaBrandLogo, path: 'M 250 120 C 315 120 305 64 375 64', y: 64 },
    { id: 'google', name: 'Google Ads', connected: Boolean(googleState?.isConnected && googleState.status === 'connected'),
      label: googleState?.isConnected && googleState.status === 'connected' ? 'Conectado'
        : googleState?.status === 'needs_auth' ? 'Por autorizar' : 'Desconectado',
      Logo: GoogleAdsBrandLogo, path: 'M 250 120 C 315 120 305 176 375 176', y: 176 },
  ];

  return (
    <div className="tico-network" aria-label="Conexiones de Tico">
      <svg className="tico-network-wires" viewBox="0 0 600 240" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <g className="tico-network-inputs">
          {incomingPaths.map((path, route) => (
            <g key={path}>
              <path d={path} />
              {[0, 1].map(pulse => (
                <circle key={pulse} r="3.5" className="tico-network-input-signal">
                  <animateMotion path={path} dur="3.6s" begin={`${-route * .6 - pulse * 1.8}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </g>
          ))}
          <circle className="tico-network-input-node" cx="65" cy="101" r="4" />
          <circle className="tico-network-input-node" cx="145" cy="45" r="5" />
          <circle className="tico-network-input-node" cx="145" cy="180" r="5" />
        </g>
        {providers.map(provider => (
          <g key={provider.id} className={`tico-network-route ${provider.connected ? 'is-connected' : ''}`} data-provider={provider.id} data-connected={provider.connected}>
            <path d={provider.path} className="tico-network-line" />
            <circle cx="375" cy={provider.y} r="5" fill="currentColor" />
            {provider.connected && [0, 1, 2].map(index => (
              <circle key={index} r={index === 0 ? 3.5 : 2.5} className="tico-network-signal" fill="currentColor">
                <animateMotion path={provider.path} dur="2.8s" begin={`${-index * 0.93}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="tico-network-core" aria-hidden="true">
        <div className="tico-network-orbit" />
        <TicoMascot className="tico-network-mascot" />
        <span>TICO</span>
      </div>
      <div className="tico-network-providers">
        {providers.map(({ id, name, connected, label, Logo }) => (
          <button key={id} type="button" onClick={onOpenConnections}
            className={`tico-network-provider ${connected ? 'is-connected' : ''}`}
            aria-label={`${name}: ${label}. Gestionar conexión`}>
            <Logo className="tico-network-brand" />
            <span className="tico-network-provider-copy"><strong>{name}</strong><span>{label}</span></span>
            <span className="tico-network-status-dot" aria-hidden="true" />
          </button>
        ))}
      </div>
      <span className="sr-only" role="status">{providers.map(p => `${p.name}: ${p.label}`).join('. ')}</span>
    </div>
  );
}
