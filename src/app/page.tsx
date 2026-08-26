export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 bg-base px-6 text-center">
      <p className="font-mono text-12 uppercase tracking-widest text-text-muted">
        Nigeria Electricity Tracker
      </p>
      <h1 className="font-display text-32 font-medium text-text">
        Power is on in Akure South.
      </h1>
      <p className="font-meter text-24 text-on">04:17</p>
      <p className="max-w-sm text-14 text-text-muted">
        Off for 4 hours 17 minutes. Based on 18 logs from 3 contributors.
      </p>
    </main>
  );
}
