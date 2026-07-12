import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account — GemStack",
  description: "Create a GemStack workspace account",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
