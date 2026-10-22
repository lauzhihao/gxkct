'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ duration = 8000, closeButton = true, toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      duration={duration}
      closeButton={closeButton}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          error: [
            toastOptions?.classNames?.error,
            "!border-red-900 !bg-red-900 !text-white [&_[data-description]]:!text-white [&_[data-icon]]:!text-white [&_[data-close-button]]:!border-white/40 [&_[data-close-button]]:!bg-red-900 [&_[data-close-button]]:!text-white [&_[data-close-button]:hover]:!bg-red-800 [&_[data-close-button]:hover]:!text-white",
          ]
            .filter(Boolean)
            .join(" "),
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
