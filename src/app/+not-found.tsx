import { Page } from '@/components/layout/page';
import { InLink, T } from '@/components/ui/primitives';
import { t } from '@/lib/i18n-mn';

export default function NotFound() {
  return (
    <Page title={t.notFound.title}>
      <T color="textMuted">{t.notFound.body}</T>
      <InLink href="/" v="bodyStrong">
        {t.notFound.home}
      </InLink>
    </Page>
  );
}
