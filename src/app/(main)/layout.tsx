import { AppShell } from "@/components/layout/AppShell";

/** Skip static HTML prerender for this whole segment — heavy client shells made `next build` look stuck on Windows. */
export const dynamic = "force-dynamic";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
