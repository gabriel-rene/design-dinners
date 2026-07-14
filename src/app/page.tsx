/**
 * Placeholder landing hero — establishes the brand foundation is live.
 * Task 5 rebuilds this page in full (hero + events + speakers + resources).
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-display text-sm font-medium uppercase tracking-[0.2em] text-dd-brown">
        Delicious Collective
      </p>
      <h1 className="mt-4 font-display text-[clamp(3rem,14vw,5.5rem)] font-extrabold uppercase leading-[0.85] text-dd-red">
        Design Dinners
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-dd-black">
        La comunidad de diseño que se junta a cenar, aprender de speakers y
        compartir recursos.
      </p>
    </main>
  );
}
