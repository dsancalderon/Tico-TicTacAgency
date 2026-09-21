import React, { useState } from 'react';
import { TicoLogo } from './TicoLogo';
import { X, Send, CheckCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'tico' | 'user';
  text: string;
  time: string;
  options?: string[];
  productCard?: {
    name: string;
    price: string;
    status: string;
    sku: string;
  };
}

export const TicoChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'tico',
      text: '¡Hola! Soy Tico, el agente de IA de TicTac Agency. 👋 ¿En qué puedo ayudarte hoy?',
      time: 'Ahora',
      options: ['Quiero automatizar mi WhatsApp', 'Quiero crear pauta en Meta Ads', 'Hablar con un asesor humano']
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: 'Ahora'
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let reply: ChatMessage;

      if (text.toLowerCase().includes('whatsapp')) {
        reply = {
          id: (Date.now() + 1).toString(),
          sender: 'tico',
          text: '¡Excelente! Con Tico puedes automatizar respuestas en menos de 2 segundos, gestionar catálogos, pedidos y calificar clientes 24/7 sin perder ventas.',
          time: 'Ahora',
          options: ['Ver demo de conversación', 'Crear pauta para WhatsApp']
        };
      } else if (text.toLowerCase().includes('pauta') || text.toLowerCase().includes('meta')) {
        reply = {
          id: (Date.now() + 1).toString(),
          sender: 'tico',
          text: 'Con nuestro generador puedes ingresar tu presupuesto y objetivo para que formule copys, segmentación y publique directo en Meta Ads y Google Ads.',
          time: 'Ahora',
          options: ['Ir al formulario de Briefing', 'Ver presupuesto sugerido']
        };
      } else if (text.toLowerCase().includes('asesor') || text.toLowerCase().includes('humano')) {
        reply = {
          id: (Date.now() + 1).toString(),
          sender: 'tico',
          text: 'Te conecto con nuestro equipo comercial de TicTac Agency Performance en WhatsApp para agendar una consultoría personalizada.',
          time: 'Ahora',
          options: ['Abrir chat de WhatsApp Oficial']
        };
      } else {
        reply = {
          id: (Date.now() + 1).toString(),
          sender: 'tico',
          text: `Entendido: "${text}". Tico aprende del catálogo y directrices de tu marca para ofrecer una experiencia conversacional impecable y convertir más prospectos.`,
          time: 'Ahora',
          options: ['Probar briefing ahora', 'Contactar ventas']
        };
      }

      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button (like YCloud's black chat bubble with notification badge) */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpen}
          className="relative w-14 h-14 rounded-full bg-slate-950 hover:bg-slate-800 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 group cursor-pointer"
          aria-label="Abrir chat con Tico"
        >
          <div className="relative">
            <TicoLogo size="sm" variant="icon-only" />
          </div>

          {/* Unread notification badge */}
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
              1
            </span>
          )}
        </button>
      )}

      {/* Interactive Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[390px] h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 p-1 flex items-center justify-center border border-white/20">
                <TicoLogo size="sm" variant="icon-only" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm font-['Outfit']">
                  <span>Tico AI Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-300">TicTac Agency Performance</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 text-xs">
            <div className="text-center my-1">
              <span className="px-3 py-1 rounded-full bg-slate-200/60 text-slate-500 text-[10px] font-medium">
                Conectado con Tico Smart Agent
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl p-3.5 ${
                    msg.sender === 'user'
                      ? 'bg-slate-950 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-tl-xs'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>

                  {/* Product card snippet if any */}
                  {msg.productCard && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                        👟
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate">{msg.productCard.name}</div>
                        <div className="text-[10px] text-slate-500">{msg.productCard.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{msg.productCard.price}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">{msg.productCard.status}</div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                      msg.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-indigo-400" />}
                  </div>
                </div>

                {/* Interactive Suggestion Options */}
                {msg.options && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (opt.includes('Briefing')) {
                            const el = document.getElementById('briefing');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                            setIsOpen(false);
                          } else if (opt.includes('WhatsApp Oficial')) {
                            window.open(
                              'https://api.whatsapp.com/send?text=Hola%20Tico,%20quisiera%20asesor%C3%ADa',
                              '_blank'
                            );
                          } else {
                            handleSend(opt);
                          }
                        }}
                        className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 w-20 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Escribe un mensaje a Tico..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="w-9 h-9 rounded-full bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
