import { ArrowRight } from 'lucide-react';

export interface CtaProps {
  text: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline';
}

export function Cta({ text, href, onClick, variant = 'default' }: CtaProps) {
  const className = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${variant === 'outline' ? 'border border-slate-300 bg-white text-[#0a194f] hover:bg-slate-50' : 'bg-[#0a194f] text-white hover:bg-blue-700'}`;
  const content = <>{text}{variant === 'default' && <ArrowRight aria-hidden="true" className="h-4 w-4" />}</>;
  return href
    ? <a href={href} onClick={onClick} className={className}>{content}</a>
    : <button type="button" onClick={onClick} className={`${className} cursor-pointer`}>{content}</button>;
}
