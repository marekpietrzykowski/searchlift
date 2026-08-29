"use client";
export function Sparkline({ values }: {
    values: number[];
}) {
    if (values.length < 2)
        return <div className="h-24"/>;
    const width = 720;
    const height = 150;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values
        .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 18) - 9;
        return `${x},${y}`;
    })
        .join(" ");
    const area = `0,${height} ${points} ${width},${height}`;
    return (<svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full overflow-visible" role="img" aria-label="Trend kliknięć">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#34d399" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)"/>
      <polyline points={points} fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>);
}

