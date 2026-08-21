import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import styles from './CategoryDropdown.module.scss';

const CategoryDropdown = ({ categories, value, onChange, label = 'Category', placeholder = 'Search categories', disabled = false }) => {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const selectedIds = useMemo(() => (Array.isArray(value) ? value.map(Number) : []), [value]);

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

  const byId = useMemo(() => new Map(categories.map((c) => [Number(c.id), c])), [categories]);

  const childrenByParent = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      const parentId = category.parentId ? Number(category.parentId) : null;
      const key = parentId && byId.has(parentId) ? parentId : null;
      map.set(key, [...(map.get(key) || []), category]);
    });
    return map;
  }, [categories, byId]);

  const childrenOf = (parentId) => childrenByParent.get(parentId === null ? null : Number(parentId)) || [];
  const hasChildren = (id) => childrenOf(id).length > 0;

  const pathOf = (id) => {
    const path = [];
    let current = byId.get(Number(id));
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? byId.get(Number(current.parentId)) : null;
    }
    return path;
  };

  const searchTerm = search.trim().toLowerCase();
  const treeRows = useMemo(() => {
    const rows = [];
    const walk = (parentId = null, level = 0) => {
      childrenOf(parentId).forEach((category) => {
        const id = Number(category.id);
        rows.push({ category, level, isExpanded: expandedIds.has(id), hasChildren: hasChildren(id) });
        if (expandedIds.has(id)) walk(id, level + 1);
      });
    };
    walk();
    return rows;
  }, [childrenByParent, expandedIds]);

  const searchRows = useMemo(
    () =>
      categories
        .filter((category) => pathOf(category.id).join(' ').toLowerCase().includes(searchTerm))
        .map((category) => ({ category, level: Math.max(pathOf(category.id).length - 1, 0), isExpanded: false, hasChildren: hasChildren(category.id) })),
    [categories, searchTerm, childrenByParent]
  );

  const visibleRows = searchTerm ? searchRows : treeRows;
  const selected = useMemo(() => selectedIds.map((id) => byId.get(Number(id))).filter(Boolean), [selectedIds, byId]);

  useEffect(() => {
    if (!open) return;
    setExpandedIds((current) => {
      const next = new Set(current);
      selectedIds.forEach((id) => {
        let category = byId.get(Number(id));
        while (category?.parentId) {
          next.add(Number(category.parentId));
          category = byId.get(Number(category.parentId));
        }
      });
      return next;
    });
  }, [open, selectedIds, byId]);

  const toggle = (id) => {
    if (disabled) return;
    const numId = Number(id);
    onChange(selectedIds.includes(numId) ? selectedIds.filter((v) => Number(v) !== numId) : [...selectedIds, numId]);
  };

  const toggleExpanded = (id) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      const numId = Number(id);
      if (next.has(numId)) next.delete(numId);
      else next.add(numId);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(categories.filter((category) => hasChildren(category.id)).map((category) => Number(category.id))));
  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div className={styles.field} ref={containerRef}>
      {label ? <label>{label}</label> : null}

      <div className={styles.control} onClick={() => !disabled && setOpen(true)} aria-disabled={disabled}>
        <Search size={14} />
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
        <ChevronDown size={14} className={open ? styles.chevronOpen : undefined} />
      </div>

      {open && !disabled ? (
        <div className={styles.panel}>
          {!searchTerm ? (
            <div className={styles.panelHeader}>
              <span>All categories</span>
              <div>
                <button type="button" onClick={expandAll}>Expand all</button>
                <button type="button" onClick={collapseAll}>Collapse</button>
              </div>
            </div>
          ) : null}

          <div className={styles.list}>
            {visibleRows.length ? (
              visibleRows.map(({ category, level, isExpanded, hasChildren: rowHasChildren }) => {
                const isSelected = selectedIds.includes(Number(category.id));
                const path = pathOf(category.id);
                return (
                  <div key={category.id} className={styles.row} style={{ '--level': level }} onClick={() => toggle(category.id)}>
                    {rowHasChildren && !searchTerm ? (
                      <button
                        type="button"
                        className={styles.expandBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded(category.id);
                        }}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name}`}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : (
                      <span className={styles.expandSpacer} />
                    )}
                    <span className={isSelected ? styles.checkboxChecked : styles.checkbox}>
                      {isSelected ? <Check size={12} /> : null}
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.name}>{category.name}</span>
                      {level > 0 || searchTerm ? <small>{path.slice(0, -1).join(' / ') || 'Root category'}</small> : null}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className={styles.empty}>No categories found.</div>
            )}
          </div>
        </div>
      ) : null}

      {selected.length ? (
        <div className={styles.chips}>
          {selected.map((category) => (
            <span key={category.id} className={styles.chip}>
              <span>{pathOf(category.id).join(' / ')}</span>
              {!disabled ? (
                <button type="button" onClick={() => toggle(category.id)}>
                  <X size={12} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default CategoryDropdown;
