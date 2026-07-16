import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account | Solvra",
  description: "Create a Solvra workspace account",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
