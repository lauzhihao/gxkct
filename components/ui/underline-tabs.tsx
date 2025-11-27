'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

function UnderlineTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="underline-tabs-list"
      className={cn(
        'flex w-full border-b border-border',
        className,
      )}
      {...props}
    />
  )
}

function UnderlineTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="underline-tabs-trigger"
      className={cn(
        'flex-1 px-4 py-0.5 text-base font-medium text-muted-foreground transition-all relative',
        'data-[state=active]:text-primary data-[state=active]:text-[1.5rem] data-[state=active]:border-b-[3px] data-[state=active]:border-primary',
        'hover:text-primary hover:border-b-[3px] hover:border-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}

export { UnderlineTabsList, UnderlineTabsTrigger }

