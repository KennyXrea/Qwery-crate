import { PageShell } from '../../components/layout/PageShell'
import { LogoMark } from '../../components/layout/Logo'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { IconChevronLeft, IconInfo } from '../../components/ui/icons'
import { Input } from '../../components/ui/Input'
import { usePageTitle } from '../../hooks/usePageTitle'

export function AdminLoginPage() {
  usePageTitle('Admin login')

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md animate-fade-in py-2 sm:py-8">
        <Card padding="lg">
          <div className="flex items-center justify-between gap-3">
            <LogoMark className="size-10" />
            <Badge tone="accent">Admins only</Badge>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-text sm:text-3xl">Admin login</h1>
          <p className="mt-2 text-muted">
            Signing in arrives in Phase 5, once the database and admin accounts are set up. Below is
            a preview of the form.
          </p>

          <fieldset disabled aria-describedby="admin-login-preview-note" className="mt-6 space-y-4">
            <legend className="sr-only">Sign-in form preview (not active yet)</legend>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
            />
            <Input label="Password" type="password" autoComplete="current-password" />
            <Button size="lg" fullWidth disabled>
              Sign in
            </Button>
          </fieldset>

          <p
            id="admin-login-preview-note"
            className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-muted"
          >
            <IconInfo className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              This form is switched off for now. Only group admins will have accounts — there is no
              public sign-up.
            </span>
          </p>
        </Card>

        <div className="mt-6 flex justify-center">
          <ButtonLink to="/" variant="ghost" leftIcon={<IconChevronLeft />}>
            Back to the site
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  )
}
