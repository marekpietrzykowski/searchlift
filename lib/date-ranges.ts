function iso(date: Date): string {
    return date.toISOString().slice(0, 10);
}
function addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
}
export function getComparisonPeriod(days: number) {
    const safeDays = days === 90 ? 90 : 28;
    const today = new Date();
    // Final Search Console data can lag. Using a 3-day buffer keeps comparisons stable.
    const currentEnd = addDays(today, -3);
    const currentStart = addDays(currentEnd, -(safeDays - 1));
    const previousEnd = addDays(currentStart, -1);
    const previousStart = addDays(previousEnd, -(safeDays - 1));
    return {
        days: safeDays,
        currentStart: iso(currentStart),
        currentEnd: iso(currentEnd),
        previousStart: iso(previousStart),
        previousEnd: iso(previousEnd),
    };
}

