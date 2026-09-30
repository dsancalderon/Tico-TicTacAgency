import type { ReactNode } from 'react';
import { TicoLogo } from './TicoLogo';
import { legalHref } from '../legalPaths';

export interface LegalSectionContent {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalLayoutProps {
  title: string;
  introduction: ReactNode;
  sections: LegalSectionContent[];
}

export const LEGAL_UPDATED_AT = '2026-09-29';

export function LegalLayout({ title, introduction, sections }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-indigo-700 focus:shadow-lg">
        Saltar al contenido
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <a href={legalHref('/')} aria-label="Tico, volver al inicio" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
            <TicoLogo size="sm" showPoweredBy />
          </a>
          <a href={legalHref('/')} className="rounded-lg text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
            Volver al inicio
          </a>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">Información legal</p>
          <h1 className="font-['Outfit'] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm text-slate-600">
            Última actualización: <time dateTime={LEGAL_UPDATED_AT}>29 de septiembre de 2026</time>
          </p>
          <div className="mt-6 text-base leading-8 text-slate-700">{introduction}</div>
        </div>

        <nav aria-label="Contenido de esta página" className="mb-12 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-4 font-['Outfit'] text-lg font-bold">En esta página</h2>
          <ol className="grid list-none gap-x-10 gap-y-2 text-sm sm:grid-cols-2">
            {sections.map(section => (
              <li key={section.id} className="pl-1">
                <a href={`#${section.id}`} className="rounded text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {sections.map(section => (
            <section id={section.id} key={section.id} tabIndex={-1} className="scroll-mt-8 border-b border-slate-200 pb-9 last:border-b-0">
              <h2 className="font-['Outfit'] text-xl font-bold leading-snug sm:text-2xl">{section.title}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-700 [&_a]:font-medium [&_a]:text-indigo-700 [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8 text-sm text-slate-600 sm:px-8">
          <nav aria-label="Páginas legales" className="flex flex-wrap gap-x-6 gap-y-2">
            <a href={legalHref('/terms')} className="hover:text-indigo-700 hover:underline">Términos y Condiciones</a>
            <a href={legalHref('/privacy')} className="hover:text-indigo-700 hover:underline">Política de Privacidad</a>
            <a href={legalHref('/data-deletion')} className="hover:text-indigo-700 hover:underline">Eliminación de datos</a>
          </nav>
          <p>© 2026 TIC TAC AGENCY PERFORMANCE SAS · Powered by TicTac Agency</p>
        </div>
      </footer>
    </div>
  );
}
