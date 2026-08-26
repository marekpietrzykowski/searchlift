type Opportunity = {
  page: string;
  score: number;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  trend: number;
  reason: string;
};

const opportunities: Opportunity[] = [
  {
    page: "/poradnik-randkowy",
    score: 94,
    position: 8.3,
    impressions: 18430,
    clicks: 241,
    ctr: 1.31,
    trend: -18,
    reason: "Dużo wyświetleń, pozycja TOP 10 i niski CTR",
  },
  {
    page: "/jak-poznac-kogos",
    score: 89,
    position: 11.2,
    impressions: 31200,
    clicks: 290,
    ctr: 0.93,
    trend: 4,
    reason: "Bardzo duży potencjał wejścia do TOP 10",
  },
  {
    page: "/randki-online",
    score: 82,
    position: 4.7,
    impressions: 12800,
    clicks: 310,
    ctr: 2.42,
    trend: -7,
    reason: "Wysoka pozycja, ale CTR poniżej potencjału",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("pl-PL").format(value);
}

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
              SearchLift
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              SEO Growth Dashboard
            </h1>

            <p className="mt-2 text-zinc-400">
              Znajdź strony i frazy z największym potencjałem wzrostu.
            </p>
          </div>

          <button className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300">
            Connect Search Console
          </button>
        </header>

        <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Organic clicks"
            value="4 821"
            change="+18%"
            positive
          />

          <StatCard
            label="Impressions"
            value="148 220"
            change="+11%"
            positive
          />

          <StatCard label="Average CTR" value="3.25%" change="+0.4%" positive />

          <StatCard
            label="Average position"
            value="8.4"
            change="-1.2"
            positive
          />
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <InsightCard
            icon="🔥"
            value="14"
            title="High-impact opportunities"
            description="Strony z największym potencjałem wzrostu."
          />

          <InsightCard
            icon="⚠️"
            value="7"
            title="Pages losing traffic"
            description="Strony ze spadkiem kliknięć lub pozycji."
          />

          <InsightCard
            icon="📈"
            value="9"
            title="Rising pages"
            description="Treści, które zaczynają zdobywać widoczność."
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 p-6">
            <h2 className="text-xl font-semibold">Top opportunities</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Priorytety wyliczone na podstawie pozycji, wyświetleń, CTR i
              trendu.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-800 text-sm text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Page</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4">Impressions</th>
                  <th className="px-6 py-4">Clicks</th>
                  <th className="px-6 py-4">CTR</th>
                  <th className="px-6 py-4">Trend</th>
                </tr>
              </thead>

              <tbody>
                {opportunities.map((item) => (
                  <tr
                    key={item.page}
                    className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/40"
                  >
                    <td className="px-6 py-5">
                      <span className="rounded-lg bg-emerald-400/10 px-3 py-2 font-bold text-emerald-400">
                        {item.score}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="font-medium">{item.page}</div>
                      <div className="mt-1 max-w-xs text-sm text-zinc-500">
                        {item.reason}
                      </div>
                    </td>

                    <td className="px-6 py-5">{item.position}</td>

                    <td className="px-6 py-5">
                      {formatNumber(item.impressions)}
                    </td>

                    <td className="px-6 py-5">
                      {formatNumber(item.clicks)}
                    </td>

                    <td className="px-6 py-5">{item.ctr}%</td>

                    <td className="px-6 py-5">
                      <span
                        className={
                          item.trend >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {item.trend >= 0 ? "+" : ""}
                        {item.trend}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm text-zinc-500">{label}</p>

      <div className="mt-3 flex items-end justify-between">
        <span className="text-3xl font-bold">{value}</span>

        <span className={positive ? "text-emerald-400" : "text-red-400"}>
          {change}
        </span>
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  value,
  title,
  description,
}: {
  icon: string;
  value: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>

      <h3 className="mt-4 font-semibold">{title}</h3>

      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}