import { Construction } from 'lucide-react';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import styles from './StatusPage.module.scss';

// Placeholder for nav destinations whose module isn't built yet. Still goes through
// ProtectedRoute + usePermission, so RBAC gating is real even before the feature exists.
const ComingSoonPage = ({ title }) => (
  <div className={styles.page}>
    <PageHeader
      eyebrow="Workspace"
      icon={Construction}
      title={title}
      description="This module is on the build roadmap and will use the same admin page layout when it is wired up."
      meta="Coming soon"
    />
    <div className={styles.placeholderPanel}>
      <Construction size={30} className={styles.icon} />
      <strong>{title} module</strong>
      <p>Navigation is ready. The workspace for this section has not been implemented yet.</p>
    </div>
  </div>
);

export default ComingSoonPage;
