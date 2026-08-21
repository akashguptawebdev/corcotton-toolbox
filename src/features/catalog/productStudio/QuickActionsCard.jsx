import { Copy, ExternalLink, Save, Trash2 } from 'lucide-react';
import Button from '@components/ui/Button/Button';
import styles from './QuickActionsCard.module.scss';

const QuickActionsCard = ({ onSaveDraft, onPreviewStore, onDuplicate, onDeleteDraft, saving, canPreview, canDuplicate, canDelete }) => (
  <section className={styles.card}>
    <header>
      <h2>Quick Actions</h2>
    </header>

    <div className={styles.actions}>
      <Button type="button" onClick={onSaveDraft} disabled={saving}>
        <Save size={15} /> {saving ? 'Saving…' : 'Save Draft'}
      </Button>
      <Button type="button" variant="secondary" onClick={onPreviewStore} disabled={!canPreview}>
        <ExternalLink size={15} /> Preview Store
      </Button>
      <Button type="button" variant="secondary" onClick={onDuplicate} disabled={!canDuplicate}>
        <Copy size={15} /> Duplicate Product
      </Button>
      <Button type="button" variant="danger" onClick={onDeleteDraft} disabled={!canDelete}>
        <Trash2 size={15} /> Delete Draft
      </Button>
    </div>
  </section>
);

export default QuickActionsCard;
