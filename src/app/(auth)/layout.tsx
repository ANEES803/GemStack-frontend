/** Same as (main): avoid long static generation passes during `next build`. */
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
