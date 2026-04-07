import { useState, useMemo } from "react";
import {
  Search,
  Users,
  Building2,
  Truck,
  MapPin,
  Wrench,
  Fuel,
  DollarSign,
  BookOpen,
  ChevronRight,
  Table2,
  MessageSquareText,
  Layers,
  CheckCircle2,
  X,
  CircleDot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { manualsData, type ManualModule } from "@/features/manuals/data/manualsData";

const iconMap: Record<string, React.ElementType> = {
  Users,
  Building2,
  Truck,
  MapPin,
  Wrench,
  Fuel,
  DollarSign,
  CircleDot,
};

const allTags = ["Básico", "Avanzado", "Administración", "Seguridad", "Facturación"];

export default function ManualsPage() {
  const [selectedModuleId, setSelectedModuleId] = useState<string>("usuarios");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedModule = useMemo(
    () => manualsData.find((m) => m.id === selectedModuleId) ?? manualsData[0],
    [selectedModuleId]
  );

  const filteredModules = useMemo(() => {
    return manualsData.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.titulo.toLowerCase().includes(q);
        const matchDesc = m.descripcion.toLowerCase().includes(q);
        const matchFaq = m.faq.some(
          (f) =>
            f.pregunta.toLowerCase().includes(q) ||
            f.respuesta.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchDesc && !matchFaq) return false;
      }
      if (activeTags.length > 0) {
        if (!activeTags.some((t) => m.etiquetas.includes(t))) return false;
      }
      return true;
    });
  }, [searchQuery, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const Icon = iconMap[selectedModule.icono] || BookOpen;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/50 dark:bg-background">
      {/* ─── SIDEBAR ─── */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
        )}
      >
        <div className="p-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5 mb-1">
            <BookOpen className="h-5 w-5 text-brand-red" />
            <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
              Manuales
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-white/40 tracking-wide">
            Base de conocimiento del sistema
          </p>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {filteredModules.map((mod) => {
              const ModIcon = iconMap[mod.icono] || BookOpen;
              const isActive = mod.id === selectedModuleId;
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModuleId(mod.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group",
                    isActive
                      ? "bg-brand-red/10 dark:bg-brand-red/20 text-brand-red"
                      : "text-slate-600 dark:text-white/60 hover:bg-slate-100/80 dark:hover:bg-white/5"
                  )}
                >
                  <ModIcon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-brand-red" : "opacity-60 group-hover:opacity-100"
                    )}
                  />
                  <span className="text-[12px] font-bold uppercase tracking-wider truncate">
                    {mod.titulo}
                  </span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 ml-auto flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Search bar + filters */}
        <div className="flex-shrink-0 p-4 md:p-6 pb-0 space-y-4">
          {/* Spotlight search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/40" />
            <Input
              placeholder="Buscar en la documentación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-sm shadow-sm text-[13px] font-medium placeholder:text-slate-400 dark:placeholder:text-white/30 focus-visible:ring-brand-red/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Tag filters */}
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-200",
                  activeTags.includes(tag)
                    ? "bg-brand-red text-white border-brand-red shadow-sm"
                    : "bg-white dark:bg-white/5 text-slate-500 dark:text-white/50 border-slate-200 dark:border-white/10 hover:border-brand-red/50 hover:text-brand-red"
                )}
              >
                {tag}
              </button>
            ))}
            {activeTags.length > 0 && (
              <button
                onClick={() => setActiveTags([])}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-red transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Module content */}
        <ScrollArea className="flex-1 px-4 md:px-6 py-4">
          <div className="max-w-4xl space-y-6 pb-8">
            {/* Module header */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-brand-red/10 dark:bg-brand-red/20 flex items-center justify-center flex-shrink-0">
                <Icon className="h-6 w-6 text-brand-red" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {selectedModule.titulo}
                </h1>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedModule.etiquetas.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[9px] font-bold uppercase tracking-widest border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="descripcion" className="w-full">
              <TabsList className="w-full justify-start h-auto p-1 bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl gap-1 flex-wrap">
                <TabsTrigger
                  value="descripcion"
                  className="text-[11px] font-bold uppercase tracking-widest rounded-xl data-[state=active]:bg-brand-red data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2 gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  General
                </TabsTrigger>
                {selectedModule.campos.length > 0 && (
                  <TabsTrigger
                    value="campos"
                    className="text-[11px] font-bold uppercase tracking-widest rounded-xl data-[state=active]:bg-brand-red data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2 gap-1.5"
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Diccionario
                  </TabsTrigger>
                )}
                {selectedModule.modales.length > 0 && (
                  <TabsTrigger
                    value="modales"
                    className="text-[11px] font-bold uppercase tracking-widest rounded-xl data-[state=active]:bg-brand-red data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2 gap-1.5"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Modales
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="faq"
                  className="text-[11px] font-bold uppercase tracking-widest rounded-xl data-[state=active]:bg-brand-red data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2 gap-1.5"
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  FAQ
                </TabsTrigger>
              </TabsList>

              {/* ─── GENERAL TAB ─── */}
              <TabsContent value="descripcion" className="mt-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="p-5 md:p-6 rounded-2xl border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm shadow-sm">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-3">
                    Descripción
                  </h3>
                  <p className="text-[13px] text-slate-700 dark:text-white/70 leading-relaxed">
                    {selectedModule.descripcion}
                  </p>
                </Card>

                {selectedModule.funcionalidades.length > 0 && (
                  <Card className="p-5 md:p-6 rounded-2xl border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm shadow-sm">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-4">
                      Funcionalidades principales
                    </h3>
                    <ul className="space-y-2.5">
                      {selectedModule.funcionalidades.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-[12px] text-slate-600 dark:text-white/60 leading-relaxed">
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </TabsContent>

              {/* ─── FIELDS / DICTIONARY TAB ─── */}
              {selectedModule.campos.length > 0 && (
                <TabsContent value="campos" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="rounded-2xl border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm shadow-sm overflow-hidden">
                    <div className="p-5 md:p-6 pb-3">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">
                        Diccionario de datos / Formulario
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-y border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                              Campo
                            </th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                              Tipo
                            </th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 hidden md:table-cell">
                              Longitud
                            </th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                              Req.
                            </th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 hidden lg:table-cell">
                              Descripción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedModule.campos.map((campo, i) => (
                            <tr
                              key={i}
                              className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="px-5 py-3 text-[12px] font-bold text-slate-800 dark:text-white/80">
                                {campo.nombre}
                              </td>
                              <td className="px-5 py-3">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-bold uppercase tracking-wider border-slate-200 dark:border-white/10"
                                >
                                  {campo.tipo}
                                </Badge>
                              </td>
                              <td className="px-5 py-3 text-[11px] text-slate-500 dark:text-white/50 font-medium hidden md:table-cell">
                                {campo.longitud || "—"}
                              </td>
                              <td className="px-5 py-3">
                                {campo.requerido ? (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
                                    <CheckCircle2 className="h-3 w-3" />
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 dark:text-white/30 font-medium">
                                    Opcional
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-[11px] text-slate-500 dark:text-white/50 leading-relaxed hidden lg:table-cell max-w-xs">
                                {campo.descripcion}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </TabsContent>
              )}

              {/* ─── MODALS TAB ─── */}
              {selectedModule.modales.length > 0 && (
                <TabsContent value="modales" className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {selectedModule.modales.map((modal, i) => (
                    <Card
                      key={i}
                      className="p-5 rounded-2xl border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                          <Layers className="h-4 w-4 text-indigo-500" />
                        </div>
                        <h4 className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-wide">
                          {modal.nombre}
                        </h4>
                      </div>
                      <p className="text-[12px] text-slate-600 dark:text-white/60 leading-relaxed pl-11">
                        {modal.descripcion}
                      </p>
                    </Card>
                  ))}
                </TabsContent>
              )}

              {/* ─── FAQ TAB ─── */}
              <TabsContent value="faq" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="p-5 md:p-6 rounded-2xl border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm shadow-sm">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-4">
                    Preguntas frecuentes
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {selectedModule.faq.map((item, i) => (
                      <AccordionItem
                        key={i}
                        value={`faq-${i}`}
                        className="border border-slate-100 dark:border-white/10 rounded-xl px-4 data-[state=open]:bg-slate-50/50 dark:data-[state=open]:bg-white/[0.02] transition-colors"
                      >
                        <AccordionTrigger className="text-[12px] font-bold text-slate-700 dark:text-white/80 hover:no-underline py-3.5">
                          {item.pregunta}
                        </AccordionTrigger>
                        <AccordionContent className="text-[12px] text-slate-600 dark:text-white/60 leading-relaxed pb-4">
                          {item.respuesta}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
