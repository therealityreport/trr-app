const ACCENT = "#7A0307";

const buildList = (items: readonly string[]) => (
  <ul className="space-y-3 text-sm leading-6 text-black/75">
    {items.map((item) => (
      <li key={item} className="flex gap-3">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const buildPill = (label: string) => (
  <span
    key={label}
    className="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
    style={{ color: ACCENT }}
  >
    {label}
  </span>
);

const QUICKSTART = [
  "Classify the surface as landing, app/admin, or game before layout work begins.",
  "Write a visual thesis, content plan, and interaction thesis before prompting or coding.",
  "Lock one H1, one accent color, two typefaces max, and one primary CTA above the fold.",
  "Use local screenshots or approved mood boards instead of vague style requests.",
  "Verify the result at desktop and mobile widths with Playwright and screenshot review.",
] as const;

const LANDING_RULES = [
  "Default to a full-bleed first viewport with one dominant visual anchor.",
  "Brand and purpose should be readable before the user starts scanning sections.",
  "Keep supporting copy sparse and remove stat strips, hero cards, and generic feature grids.",
  "Do not place text over unstable or noisy imagery.",
] as const;

const APP_RULES = [
  "No hero by default. Start with search, status, controls, and action.",
  "Every heading should orient the operator, prioritize work, or explain state.",
  "Remove decorative card treatments when spacing or grouping already communicates hierarchy.",
  "Utility copy beats campaign copy on admin and product surfaces.",
] as const;

const FAILURE_PATTERNS = [
  "Generic SaaS card walls",
  "Weak branding in the first viewport",
  "Busy hero imagery behind text",
  "Repeated section rhythms with no narrative change",
  "Carousel sections that add motion but not structure",
  "Dashboards built as stacked bordered panels",
] as const;

export default function Gpt54DelightfulFrontendsSection() {
  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-6 text-black sm:px-6">
      <header className="rounded-[2rem] border-2 border-black bg-white px-6 py-8 sm:px-8">
        <div className="mb-5 flex flex-wrap gap-2">
          {["GPT-5.4", "Frontend skill", "Landing vs app", "Playwright review"].map(buildPill)}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
          Delightful frontends
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-black sm:text-5xl">
          Build composition-first interfaces before the prompt slips back into generic UI habits.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-black/75 sm:text-lg">
          This section translates the GPT-5.4 frontend article into TRR rules: choose the surface
          type first, define the visual direction up front, constrain the layout hard, then verify
          the result in browser instead of trusting the first attractive screenshot.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-black bg-white p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>Quickstart</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-black">
            Start by reducing ambiguity, not by writing more prompt text.
          </h2>
          <div className="mt-6">{buildList(QUICKSTART)}</div>
        </div>
        <div className="rounded-[1.75rem] border border-black bg-white p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>Prompt inputs</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-black">Required before coding</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "visual thesis",
              "content plan",
              "interaction thesis",
              "real context",
              "reference images",
              "hard constraints",
            ].map((label) => (
              <span
                key={label}
                className="rounded-full border border-black bg-white px-3 py-1 text-xs font-medium tracking-[0.08em]"
                style={{ color: ACCENT }}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-black/75">
            Default to low reasoning. Raise it only when the surface requires difficult composition,
            interaction, or responsive tradeoffs.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-black bg-white p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>Landing surfaces</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-black">
            Brand first, then purpose, then action.
          </h2>
          <div className="mt-6">{buildList(LANDING_RULES)}</div>
        </div>
        <div className="rounded-[1.75rem] border border-black bg-white p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>App and admin surfaces</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-black">
            Useful before scroll, readable without marketing copy.
          </h2>
          <div className="mt-6">{buildList(APP_RULES)}</div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>Verification loop</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-black">
              Browser review is part of the design process.
            </h2>
          </div>
          <div className="rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black/75">
            Desktop and mobile screenshots are required review artifacts.
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Run the page in browser", "Do not judge the UI from code alone."],
            ["2", "Check the first viewport", "Brand, purpose, and action must read immediately."],
            ["3", "Remove clutter", "Delete decorative cards, filler copy, and ornamental motion."],
          ].map(([step, title, body]) => (
            <div key={step} className="rounded-[1.5rem] border border-black bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Step {step}</p>
              <h3 className="mt-2 text-lg font-semibold text-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-black/75">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>Reject these failures</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-black">If these patterns appear, the surface is not done.</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {FAILURE_PATTERNS.map((pattern) => (
            <div key={pattern} className="rounded-[1.25rem] border border-black bg-white px-4 py-4 text-sm leading-6 text-black/75">
              {pattern}
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
