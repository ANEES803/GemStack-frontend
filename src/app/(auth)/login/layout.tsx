import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — GemStack",
  description: "Sign in to GemStack gemstone ERP",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
