export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center space-y-8 p-8">
      <section className="max-w-2xl text-center">
        <h1 className="font-serif text-5xl tracking-tight">
          This is a Serif Heading (Source Serif 4)
        </h1>
        <p className="mt-4 text-lg text-gray-700">
          Body text below is using the sans font (Geist). If you can tell the
          difference, both fonts are wired correctly.
        </p>
      </section>

      <section className="max-w-xl text-left border border-gray-300 rounded p-6">
        <h2 className="font-sans text-2xl font-medium">
          Sans Section Heading (Geist)
        </h2>
        <p className="mt-2">
          This is a paragraph with the sans font. Compare with the serif
          heading above to confirm fonts are working.
        </p>
      </section>
    </main>
  );
}