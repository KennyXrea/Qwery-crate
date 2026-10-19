import { PageShell } from '../components/layout/PageShell'
import { Sidebar } from '../components/layout/Sidebar'
import { ListLevels } from '../components/list/ListResults'
import { ListSidebar } from '../components/list/ListSidebar'
import { ListToolbar } from '../components/list/ListToolbar'
import { SectionTabs } from '../components/list/SectionTabs'
import { useListParams } from '../components/list/useListParams'
import { usePageTitle } from '../hooks/usePageTitle'

/**
 * /list — the ranked list. Everything you can change (section, search, difficulty, player,
 * sort, view, page) lives in the URL query string, so Back / Forward and shared links work;
 * see components/list/list-params.ts.
 */
export function ListPage() {
  usePageTitle('The List')
  const { params, update } = useListParams()

  return (
    <PageShell
      eyebrow="Ranked by us"
      title="The List"
      description="Our friend group's hardest Geometry Dash levels, ordered from hardest to easiest. Main and Extended levels earn points; Legacy levels are kept for history."
      sidebar={
        <Sidebar label="About the list">
          <ListSidebar />
        </Sidebar>
      }
    >
      <div className="space-y-4">
        <SectionTabs params={params} />
        <ListToolbar params={params} onChange={update} />
        <ListLevels params={params} onChange={update} />
      </div>
    </PageShell>
  )
}
