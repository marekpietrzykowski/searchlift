import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: {
        default: "SearchLift — SEO Opportunity Intelligence",
        template: "%s | SearchLift",
    },
    description: "Turn Google Search Console data into a prioritized SEO action plan, decay diagnosis, click-upside estimates and measurable optimization experiments.",
    icons: {
        icon: "/searchlift-mark.svg",
    },
    applicationName: "SearchLift",
    keywords: ["SEO", "Google Search Console", "Next.js", "analytics", "TypeScript"],
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="pl">
      <body>{children}</body>
    </html>);
}

