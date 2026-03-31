import type { ReactNode } from 'react'

export type AppShellProps = {
  header: ReactNode
  sidebar: ReactNode
  main: ReactNode
  bottom: ReactNode
}

export function AppShell({ header, sidebar, main, bottom }: AppShellProps) {
  return (
    <div className="app-bg h-full bg-background text-foreground">
      <div className="grid h-full grid-rows-[56px_1fr_200px]">
        {header}

        <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[320px_1fr]">
          <div className="hidden lg:block">{sidebar}</div>
          {main}
        </div>

        {bottom}
      </div>
    </div>
  )
}
