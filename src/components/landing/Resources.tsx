import { groupResources } from "@/lib/derive";
import type { ResourceRow } from "@/lib/types";

/**
 * Patty Brown block styled as the house menu: categories as menu sections,
 * each resource with a dotted leader to its external link. Hidden entirely
 * when there are no resources.
 */
export default function Resources({ resources }: { resources: ResourceRow[] }) {
  if (resources.length === 0) return null;

  const grouped = groupResources(resources);

  return (
    <section
      id="recursos"
      aria-labelledby="recursos-titulo"
      className="bg-dd-brown py-16 text-dd-cream md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <h2
          id="recursos-titulo"
          className="font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-none text-dd-yellow"
        >
          Recursos
        </h2>
        <p className="mt-3 text-lg italic">
          El menú de la casa: curado por la comunidad, servido a la carta.
        </p>

        <div className="mt-10 grid gap-x-16 gap-y-12 md:mt-14 md:grid-cols-2">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <h3 className="border-b-2 border-dd-cream/30 pb-3 font-display text-2xl font-bold uppercase tracking-wide text-dd-yellow">
                {category}
              </h3>
              <ul className="mt-5 flex flex-col gap-6">
                {items.map((resource) => (
                  <li key={resource.id}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="font-bold leading-snug underline-offset-4 group-hover:underline group-hover:decoration-2">
                          {resource.title}
                        </span>
                        <span
                          aria-hidden
                          className="mb-1 flex-1 border-b-2 border-dotted border-dd-cream/40"
                        />
                        <span aria-hidden className="font-bold">
                          ↗
                        </span>
                      </span>
                      {resource.description && (
                        <span className="mt-1 block max-w-[60ch] text-[15px] leading-snug text-dd-cream/85">
                          {resource.description}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
