import { Layers, Map, SlidersHorizontal } from 'lucide-react'

import { Button } from '../ui/button'
import { Separator } from '../ui/separator'

export type SidebarProps = {
  scenes: string[]
  selectedSceneId?: string
  onSelectScene?: (sceneId: string) => void
}

export function Sidebar({ scenes, selectedSceneId, onSelectScene }: SidebarProps) {
  return (
    <aside className="min-h-0 border-r border-border bg-card p-3">
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Map className="h-4 w-4" />
            Scenes
          </div>

          <div className="mt-3 grid gap-2">
            {scenes.length === 0 ? (
              <div className="text-xs text-muted-foreground">No scenes loaded.</div>
            ) : (
              scenes.map((s) => (
                <button
                  key={s}
                  onClick={() => onSelectScene?.(s)}
                  className={
                    s === selectedSceneId
                      ? 'rounded-md border border-border bg-muted px-2 py-2 text-left text-xs'
                      : 'rounded-md border border-transparent px-2 py-2 text-left text-xs hover:bg-muted'
                  }
                >
                  {s}
                </button>
              ))
            )}
          </div>
        </div>

        <Separator />

        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            Controls
          </div>

          <div className="mt-3 grid gap-2">
            <Button variant="secondary" size="sm" className="justify-start">
              <Layers className="mr-2 h-4 w-4" />
              Layers
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
