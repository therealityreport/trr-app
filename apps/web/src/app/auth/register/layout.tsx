import type { ReactNode } from "react";

export default function RegisterLayout({ children }: { children: ReactNode }) {
  // A durable server cookie can outlive client Firebase auth. Registration must
  // remain reachable for sign-in recovery; the client owns completion routing.
  return children;
}
