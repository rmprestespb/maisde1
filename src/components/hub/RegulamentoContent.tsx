import { REGULAMENTO, REGULAMENTO_VERSION_LABEL } from "@/lib/regulamento";

/**
 * Texto do regulamento, sem cor própria: quem usa decide a cor do texto (a
 * tela de aceite é bordô/dourada, o diálogo das Configurações segue o tema do
 * painel).
 */
export function RegulamentoContent() {
  return (
    <div className="flex flex-col gap-5 text-sm leading-relaxed">
      <p className="text-xs opacity-70">Versão de {REGULAMENTO_VERSION_LABEL}</p>
      {REGULAMENTO.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{section.title}</h3>
          {section.paragraphs?.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {section.items && (
            <ul className="ml-5 flex list-disc flex-col gap-1.5">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
