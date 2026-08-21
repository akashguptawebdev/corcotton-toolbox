import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import styles from './TaxCategoryDropdown.module.scss';

// Single-select HSN/tax-category picker for the product form. Search matches both the
// HSN code and the category name, since admins look products up either way. Selecting a
// row hands the caller the full category object (not just an id) so it can auto-fill the
// HS Code field and preview the GST split without a second round trip.
const TaxCategoryDropdown = ({ categories, value, onChange, label = 'Tax Category (HSN)', placeholder = 'Search HSN code or name', disabled = false }) => {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selected = useMemo(
    () => categories.find((category) => String(category.id) === String(value)) || null,
    [categories, value]
  );

  const searchTerm = search.trim().toLowerCase();
  const visibleList = searchTerm
    ? categories.filter((category) => `${category.hsnCode} ${category.name || ''}`.toLowerCase().includes(searchTerm))
    : categories;

  const select = (category) => {
    if (disabled) return;
    onChange(category);
    setOpen(false);
    setSearch('');
  };

  const clear = (event) => {
    event.stopPropagation();
    if (disabled) return;
    onChange(null);
  };

  return (
    <div className={styles.field} ref={containerRef}>
      {label ? <label>{label}</label> : null}

      <div className={styles.control} onClick={() => !disabled && setOpen(true)} aria-disabled={disabled}>
        <Search size={14} />
        {selected && !open ? (
          <span className={styles.selectedValue}>
            {selected.hsnCode} — {selected.name || 'Untitled'} ({selected.gstRate}%)
          </span>
        ) : (
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
          />
        )}
        {selected && !disabled ? (
          <button type="button" className={styles.clearBtn} onClick={clear}>
            <X size={13} />
          </button>
        ) : null}
        <ChevronDown size={14} className={open ? styles.chevronOpen : undefined} />
      </div>

      {open && !disabled ? (
        <div className={styles.panel}>
          <div className={styles.list}>
            {visibleList.length ? (
              visibleList.map((category) => {
                const isSelected = String(category.id) === String(value);
                return (
                  <div key={category.id} className={styles.row} onClick={() => select(category)}>
                    <span className={isSelected ? styles.checkboxChecked : styles.checkbox}>
                      {isSelected ? <Check size={12} /> : null}
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.name}>{category.hsnCode} — {category.name || 'Untitled'}</span>
                      <small>{category.isTaxable ? `${category.gstRate}% GST` : 'Exempt'}</small>
                    </span>
                  </div>
                );
              })
            ) : (
              <div className={styles.empty}>No tax categories found. Create one under Settings → Tax Management.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TaxCategoryDropdown;
