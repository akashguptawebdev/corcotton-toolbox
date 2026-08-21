import { useEffect, useRef, useState } from 'react';
import { catalogApi } from '@features/catalog/catalog.api';
import styles from './LinkUrlInput.module.scss';

// Categories change rarely within a toolbox session — cached at module scope so every
// LinkUrlInput on the page (header links, footer links, hero button link) shares one
// fetch instead of each row re-requesting the same list.
let categoriesCache = null;
const loadCategories = async () => {
  if (categoriesCache) return categoriesCache;
  const data = await catalogApi.categories.list();
  categoriesCache = data.categories || [];
  return categoriesCache;
};

const STATIC_LINKS = [
  { label: 'Home', url: '/' },
  { label: 'Login', url: '/login' },
  { label: 'Register', url: '/register' },
  { label: 'My Account', url: '/account' },
];

// Only suggests destinations that actually resolve in the storefront (storefront/src/app
// currently has just '/', '/category/:slug', '/products/:slug') — no point suggesting a
// link that 404s.
const buildSuggestions = async (query) => {
  const term = query.replace(/^\/+/, '').trim().toLowerCase();

  const categories = await loadCategories();
  const categoryMatches = categories
    .filter((category) => !term || category.name.toLowerCase().includes(term) || category.slug.includes(term))
    .slice(0, 6)
    .map((category) => ({ label: category.name, group: 'Category', url: `/category/${category.slug}` }));

  const homeMatches = STATIC_LINKS.filter((link) => !term || link.label.toLowerCase().includes(term) || link.url.includes(term));

  let productMatches = [];
  if (term) {
    const data = await catalogApi.products.list({ search: term, limit: 6 });
    productMatches = (data.products || []).map((product) => ({ label: product.name, group: 'Product', url: `/products/${product.slug}` }));
  }

  return [...homeMatches, ...categoryMatches, ...productMatches];
};

const LinkUrlInput = ({ value, onChange, placeholder = '/url', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const runSearch = (query) => {
    setLoading(true);
    buildSuggestions(query)
      .then(setSuggestions)
      .finally(() => setLoading(false));
  };

  const handleChange = (event) => {
    const next = event.target.value;
    onChange(next);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(next), 250);
  };

  const handleFocus = () => {
    if (disabled) return;
    setOpen(true);
    runSearch(value || '');
  };

  const pick = (suggestion) => {
    onChange(suggestion.url);
    setOpen(false);
  };

  const showDropdown = open && !disabled && (loading || suggestions.length > 0);

  return (
    <div className={styles.field} ref={containerRef}>
      <input value={value} onChange={handleChange} onFocus={handleFocus} placeholder={placeholder} disabled={disabled} autoComplete="off" />
      {showDropdown ? (
        <div className={styles.dropdown}>
          {loading ? <div className={styles.hint}>Searching...</div> : null}
          {!loading &&
            suggestions.map((suggestion) => (
              <button type="button" key={`${suggestion.group || 'page'}-${suggestion.url}`} className={styles.option} onMouseDown={(event) => event.preventDefault()} onClick={() => pick(suggestion)}>
                {suggestion.group ? <span className={styles.group}>{suggestion.group}</span> : null}
                <span className={styles.label}>{suggestion.label}</span>
                <span className={styles.url}>{suggestion.url}</span>
              </button>
            ))}
          {!loading && !suggestions.length ? <div className={styles.hint}>No matches</div> : null}
        </div>
      ) : null}
    </div>
  );
};

export default LinkUrlInput;
