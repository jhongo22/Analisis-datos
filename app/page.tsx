import Link from "next/link";
import { MonitorPlay, Smartphone } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between p-6 md:p-12">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-display font-bold text-base">
            D
          </div>
          <span className="font-display font-bold text-lg text-[#0F172A]">
            Experiencia interactiva en vivo
          </span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#334155] font-medium">
          <span>Presentación de 20 minutos</span>
        </div>
      </header>

      <section className="max-w-5xl w-full mx-auto my-auto py-10">
        <div className="max-w-3xl mb-10">
          <p className="text-base font-semibold text-[#2563EB] mb-2">
            Participación en tiempo real con la audiencia
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-[#0F172A] leading-[1.08] mb-4">
            Datos de adorno contra decisiones reales
          </h1>
          <p className="text-lg md:text-xl text-[#334155] leading-relaxed">
            Por qué las empresas pierden dinero al decidir por corazonadas en
            lugar de escuchar lo que dicen sus propios clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/presenter"
            className="group rounded-2xl bg-white border-2 border-[#0F172A] p-8 shadow-[6px_6px_0px_#0F172A] hover:bg-[#F8FAFC] transition-transform active:translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] mb-5">
                <MonitorPlay className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#2563EB] mb-1">
                Pantalla principal del salón
              </p>
              <h2 className="font-display text-2xl font-bold text-[#0F172A] mb-3">
                Abrir pantalla del presentador
              </h2>
              <p className="text-[#334155] text-base leading-relaxed mb-6">
                Incluye el código QR gigante para escanear desde lejos, el
                tablero de resultados en una sola vista y el simulador de
                decisiones con gráficas en vivo.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="font-semibold text-base text-[#0F172A] group-hover:text-[#2563EB]">
                Entrar al modo presentador
              </span>
              <span className="px-3 py-1 rounded-md bg-[#0F172A] text-white text-xs font-semibold">
                Proyector
              </span>
            </div>
          </Link>

          <Link
            href="/play"
            className="group rounded-2xl bg-white border-2 border-[#CBD5E1] hover:border-[#0F172A] p-8 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669] mb-5">
                <Smartphone className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#059669] mb-1">
                Celular de los asistentes
              </p>
              <h2 className="font-display text-2xl font-bold text-[#0F172A] mb-3">
                Entrar como participante
              </h2>
              <p className="text-[#334155] text-base leading-relaxed mb-6">
                Elige tu personaje, escribe tu nombre y vota en tiempo real. La
                pantalla de tu celular avanza sola junto con la presentación.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="font-semibold text-base text-[#0F172A] group-hover:text-[#059669]">
                Abrir vista móvil
              </span>
              <span className="px-3 py-1 rounded-md bg-[#F1F5F9] text-[#334155] text-xs font-semibold">
                Móvil
              </span>
            </div>
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-sm text-[#64748B] gap-2">
        <span>Exposición interactiva en vivo</span>
        <span>El análisis de datos en las empresas</span>
      </footer>
    </main>
  );
}
