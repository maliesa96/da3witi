'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';

type Props = {
  formAction: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
};

export default function MagicLinkSubmitButton({ formAction, className, children }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      formAction={formAction}
      disabled={pending}
      aria-busy={pending}
      className={[
        className,
        'disabled:opacity-70 disabled:cursor-not-allowed',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? (
          <svg
            className="h-4 w-4 animate-spin text-white"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
            />
          </svg>
        ) : null}
        <span>{children}</span>
      </span>
    </button>
  );
}

