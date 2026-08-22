import { useState } from 'react';
import styles from './NavigationManagerPage.module.scss';

// Mirrors backend/src/services/navigation.service.js's categoryPath/collectionPath — both
// resolve to /collections/<slug> on the storefront.
const pathFor = (slug) => `/collections/${slug}`;

const optionValue = (kind, id) => `${kind}:${id}`;

// Given the link currently stored on the config, work out which dropdown option it
// corresponds to — a category, a collection, a custom path, or nothing. This only runs once
// per mount (the parent remounts this component via `key={selectedId}` whenever the admin
// switches nav items), so a value the admin is actively editing never gets re-resolved out
// from under them.
const resolveInitial = (value, categories, collections) => {
  if (!value) return { option: '', customUrl: '' };
  const category = categories.find((c) => pathFor(c.slug) === value);
  if (category) return { option: optionValue('category', category.id), customUrl: '' };
  const collection = collections.find((c) => pathFor(c.slug) === value);
  if (collection) return { option: optionValue('collection', collection.id), customUrl: '' };
  return { option: 'custom', customUrl: value };
};

// Indents child categories under their parent so the single dropdown still reads as a
// hierarchy, without needing a nested picker.
const categoryLabel = (category, byId) => {
  const parent = category.parentId ? byId.get(Number(category.parentId)) : null;
  const name = parent ? `— ${category.name}` : category.name;
  // Picking an inactive category here produces the exact same silent failure as picking one
  // for the item's own link target: the backend only resolves ACTIVE categories, so the
  // button would render with no visible indication its link goes nowhere.
  return category.status !== 'ACTIVE' ? `${name} — Inactive` : name;
};

/**
 * Optional link target for the promotional card's CTA — a single dropdown of existing
 * categories/collections, or "Custom URL" for anything else. Replaces free-typing a path
 * the admin has to already know, and makes "no link" (button hidden) a first-class choice
 * rather than an empty text field that reads as unfinished.
 */
const LinkTargetField = ({ value, onChange, categories, collections, disabled }) => {
  const [{ option, customUrl }, setState] = useState(() => resolveInitial(value, categories, collections));

  const byId = new Map(categories.map((c) => [Number(c.id), c]));
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  const selectOption = (next) => {
    setState({ option: next, customUrl: next === 'custom' ? customUrl : '' });

    if (!next) return onChange('');
    if (next === 'custom') return onChange(customUrl);

    const [kind, id] = next.split(':');
    const source = kind === 'category' ? categories : collections;
    const row = source.find((item) => Number(item.id) === Number(id));
    onChange(row ? pathFor(row.slug) : '');
  };

  const setCustomUrl = (url) => {
    setState({ option: 'custom', customUrl: url });
    onChange(url);
  };

  return (
    <div className={styles.linkField}>
      <select value={option} disabled={disabled} onChange={(e) => selectOption(e.target.value)}>
        <option value="">No link (button hidden)</option>
        {sortedCategories.length > 0 && (
          <optgroup label="Categories">
            {sortedCategories.map((c) => (
              <option key={c.id} value={optionValue('category', c.id)}>{categoryLabel(c, byId)}</option>
            ))}
          </optgroup>
        )}
        {collections.length > 0 && (
          <optgroup label="Collections">
            {collections.map((c) => (
              <option key={c.id} value={optionValue('collection', c.id)}>{c.name}</option>
            ))}
          </optgroup>
        )}
        <option value="custom">Custom URL…</option>
      </select>

      {option === 'custom' && (
        <input
          value={customUrl}
          disabled={disabled}
          placeholder="/pages/about or https://…"
          onChange={(e) => setCustomUrl(e.target.value)}
        />
      )}
    </div>
  );
};

export default LinkTargetField;
