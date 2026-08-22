import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, ImageOff } from 'lucide-react';
import styles from './NavigationManagerPage.module.scss';

// Same precedence the storefront card row itself uses (cardImage > image > cardGradient) —
// so what the admin sees here is what the shop-card will actually look like, not a guess.
const Thumb = ({ category }) => {
  const src = category.cardImage || category.image;
  if (src) return <img src={src} alt="" className={styles.miniThumb} />;
  if (category.cardGradient) return <span className={styles.miniThumb} style={{ background: category.cardGradient }} />;
  return (
    <span className={`${styles.miniThumb} ${styles.miniThumbEmpty}`}>
      <ImageOff size={12} />
    </span>
  );
};

/**
 * Dropdown multi-select for curating the mega-menu's category card row. Deliberately not the
 * generic <Dropdown> — that popover closes on every click inside it, which makes ticking more
 * than one checkbox impossible. This one only closes on an outside click, Escape, or "Done".
 */
const CategoryMultiSelect = ({ categories, selectedIds, onToggle, onClear, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = categories.filter((c) => selectedIds.includes(c.id));
  const summary = !categories.length
    ? 'No categories available'
    : selectedIds.length === 0
      ? `All ${categories.length} shown`
      : `${selectedIds.length} of ${categories.length} selected`;

  return (
    <div className={styles.multiSelect} ref={ref}>
      <button
        type="button"
        className={styles.multiSelectTrigger}
        disabled={disabled || !categories.length}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.multiSelectSummary}>
          {selected.length > 0 && (
            <span className={styles.miniStack}>
              {selected.slice(0, 4).map((category) => (
                <Thumb key={category.id} category={category} />
              ))}
            </span>
          )}
          {summary}
        </span>
        <ChevronDown size={15} className={open ? styles.multiSelectChevronOpen : undefined} />
      </button>

      {open && (
        <div className={styles.multiSelectPanel}>
          <div className={styles.multiSelectList}>
            {categories.map((category) => {
              const checked = selectedIds.includes(category.id);
              return (
                <label key={category.id} className={styles.multiSelectRow}>
                  <span className={checked ? styles.multiCheckOn : styles.multiCheck}>
                    {checked && <Check size={11} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(category.id)}
                    hidden
                  />
                  <Thumb category={category} />
                  <span className={styles.multiSelectRowText}>
                    <span className={styles.multiSelectRowName}>{category.name}</span>
                    {category.tagline && <span className={styles.multiSelectRowTagline}>{category.tagline}</span>}
                  </span>
                </label>
              );
            })}
          </div>
          <div className={styles.multiSelectFooter}>
            <button type="button" onClick={onClear} disabled={!selectedIds.length}>
              Clear
            </button>
            <button type="button" className={styles.multiSelectDone} onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryMultiSelect;
