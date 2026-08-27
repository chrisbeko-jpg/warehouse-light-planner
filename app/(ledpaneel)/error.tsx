"use client";

export default function LedpaneelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Public page error:", error);

  return (
    <section className="lp-section">
      <div className="lp-container max-w-2xl text-center">
        <h1 className="lp-heading-2">Pagina tijdelijk niet beschikbaar</h1>
        <p className="lp-body mt-4">
          Er ging iets mis bij het laden van deze pagina. Probeer het opnieuw of ga verder via AI
          Lichtadvies.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="lp-btn-secondary" onClick={() => reset()}>
            Opnieuw proberen
          </button>
          <a href="/lichtadvies" className="lp-btn-primary">
            Naar AI Lichtadvies
          </a>
        </div>
      </div>
    </section>
  );
}
