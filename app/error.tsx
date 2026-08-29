"use client";
export default function GlobalError({ reset }: {
    reset: () => void;
}) {
    return (<main className="grid min-h-screen place-items-center p-6 text-zinc-100">
      <div className="max-w-lg rounded-3xl border border-rose-500/20 bg-zinc-950/80 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-rose-300">SearchLift error</p>
        <h1 className="mt-3 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">The dashboard hit an unexpected client-side error. Your Google credentials were not exposed.</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-zinc-950">Try again</button>
      </div>
    </main>);
}

