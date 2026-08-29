export default function NotFound() {
    return (<main className="grid min-h-screen place-items-center p-6 text-zinc-100">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-300">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <a href="/" className="mt-6 inline-block rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300">Back to SearchLift</a>
      </div>
    </main>);
}

