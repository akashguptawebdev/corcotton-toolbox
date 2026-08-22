import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import catalogStyles from '@features/catalog/CatalogPage.module.scss';
import styles from './NavigationManagerPage.module.scss';

/**
 * One editorSection card that can be collapsed — same chevron-toggle convention as
 * ProductStudio's variant cards (button with aria-expanded, chevron rotates via CSS).
 * Opens expanded by default; give it `key={selectedId}` from the caller so switching
 * header items resets every section back to expanded rather than carrying over whatever
 * was collapsed for the previous item.
 */
const CollapsibleSection = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={catalogStyles.editorSection}>
      <div className={styles.sectionHead}>
        <h3>{title}</h3>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          title={open ? 'Collapse' : 'Expand'}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      {open ? children : null}
    </section>
  );
};

export default CollapsibleSection;
