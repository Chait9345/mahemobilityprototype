import { motion } from 'framer-motion'
import { SlidersHorizontal } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, type SelectOption } from '../ui/select'
import { Switch } from '../ui/switch'

export type SidebarProps = {
  scenes: SelectOption[]
  agents: SelectOption[]
  sceneId: string
  agentId: string
  onChangeSceneId: (sceneId: string) => void
  onChangeAgentId: (agentId: string) => void
  toggles: {
    showGrid: boolean
    showHistory: boolean
    showPredictions: boolean
  }
  onToggle: (key: keyof SidebarProps['toggles'], value: boolean) => void
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function Sidebar({
  scenes,
  agents,
  sceneId,
  agentId,
  onChangeSceneId,
  onChangeAgentId,
  toggles,
  onToggle,
}: SidebarProps) {
  return (
    <aside className="min-h-0 border-r border-white/10 bg-gradient-to-b from-white/6 to-white/2 p-4 backdrop-blur-xl">
      <div className="flex h-full flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: 'transform, opacity' }}
          whileHover={{ scale: 1.01, y: -1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="tracking-tight">Scene</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={sceneId} onValueChange={onChangeSceneId} placeholder="Select scene">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scenes.map((o: SelectOption) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: 'transform, opacity' }}
          whileHover={{ scale: 1.01, y: -1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="tracking-tight">Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={agentId || ''} onValueChange={onChangeAgentId} placeholder="Select agent">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((o: SelectOption) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.19, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: 'transform, opacity' }}
          whileHover={{ scale: 1.01, y: -1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="tracking-tight">Toggles</CardTitle>
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <ToggleRow label="Grid" checked={toggles.showGrid} onChange={(v) => onToggle('showGrid', v)} />
                <ToggleRow label="History" checked={toggles.showHistory} onChange={(v) => onToggle('showHistory', v)} />
                <ToggleRow
                  label="Predictions"
                  checked={toggles.showPredictions}
                  onChange={(v) => onToggle('showPredictions', v)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </aside>
  )
}
