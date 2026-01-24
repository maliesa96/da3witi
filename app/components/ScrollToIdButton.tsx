"use client";

import type { ReactNode } from "react";

type Props = {
  targetId: string;
  className?: string;
  children: ReactNode;
};

export default function ScrollToIdButton({ targetId, className, children }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
      className={className}
    >
      {children}
    </button>
  );
}

