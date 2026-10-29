import { AppShell } from '../../components/AppShell'
import { Empty, Panel } from '../../components/ui'

export default function LibrarySoon() {
  return (
    <AppShell>
      <span className="eyebrow">Books</span>
      <h1 className="text-[26px] mt-1">Library</h1>
      <p className="mt-2 text-[14px] text-ink-soft max-w-[48ch]">
        Catalogue, loans and returns will live here. Not built yet.
      </p>
      <div className="mt-6">
        <Panel title="Coming soon">
          <Empty line="The library desk is reserved. Issue, return, and overdue notes will land on this page." />
        </Panel>
      </div>
    </AppShell>
  )
}
