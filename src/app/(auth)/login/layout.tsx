import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | Solvra",
  description: "Sign in to Solvra business ERP",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
