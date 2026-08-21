import { useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import styles from './TagsInput.module.scss';

const toList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const TagsInput = ({ label = 'Tags', value, onChange, suggestions = [], disabled = false, onCreateTag }) => {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef(null);
  const selectedValues = toList(value);

  const tagsById = useMemo(
    () => new Map(suggestions.map((tag) => [String(tag.id), tag])),
    [suggestions]
  );

  const tagsByName = useMemo(
    () => new Map(suggestions.map((tag) => [tag.name.toLowerCase(), tag])),
    [suggestions]
  );

  const selectedTags = useMemo(
    () =>
      selectedValues.map((raw) => {
        const byId = tagsById.get(String(raw));
        if (byId) return { id: String(byId.id), name: byId.name };
        const byName = tagsByName.get(String(raw).toLowerCase());
        if (byName) return { id: String(byName.id), name: byName.name };
        return { id: String(raw), name: String(raw) };
      }),
    [selectedValues, tagsById, tagsByName]
  );

  const filteredSuggestions = useMemo(() => {
    const term = draft.trim().toLowerCase();
    return suggestions
      .filter((tag) => !selectedTags.some((selected) => String(selected.id) === String(tag.id)))
      .filter((tag) => !term || tag.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [suggestions, selectedTags, draft]);

  const emit = (nextTags) => onChange(nextTags.map((tag) => tag.id).join(', '));

  const commitTag = (tag) => {
    if (!tag?.id) return;
    if (selectedTags.some((existing) => String(existing.id) === String(tag.id))) {
      setDraft('');
      return;
    }
    emit([...selectedTags, { id: String(tag.id), name: tag.name }]);
    setDraft('');
  };

  const commit = async (raw) => {
    const name = raw.trim();
    if (!name) return;
    const existing = tagsByName.get(name.toLowerCase());
    if (existing) {
      commitTag(existing);
      return;
    }

    if (!onCreateTag) return;
    setCreating(true);
    try {
      const created = await onCreateTag(name);
      commitTag(created);
    } finally {
      setCreating(false);
    }
  };

  const removeAt = (index) => emit(selectedTags.filter((_, i) => i !== index));

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      void commit(draft);
    } else if (event.key === 'Backspace' && !draft && selectedTags.length) {
      removeAt(selectedTags.length - 1);
    }
  };

  return (
    <div className={styles.field} ref={containerRef}>
      <span>{label}</span>
      <div className={styles.control} onClick={() => !disabled && setOpen(true)}>
        {selectedTags.map((tag, index) => (
          <span key={`${tag.id}-${index}`} className={styles.chip}>
            {tag.name}
            {disabled ? null : (
              <button type="button" onClick={(event) => { event.stopPropagation(); removeAt(index); }}>
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={selectedTags.length ? '' : 'e.g. t-shirt, blue, cotton'}
          disabled={disabled || creating}
        />
      </div>

      {open && !disabled && (filteredSuggestions.length || draft.trim()) ? (
        <div className={styles.panel}>
          {filteredSuggestions.map((tag) => (
            <button key={tag.id} type="button" className={styles.suggestion} onMouseDown={(event) => { event.preventDefault(); commitTag(tag); }}>
              {tag.name}
            </button>
          ))}
          {draft.trim() && !tagsByName.has(draft.trim().toLowerCase()) ? (
            <button type="button" className={styles.suggestion} disabled={creating || !onCreateTag} onMouseDown={(event) => { event.preventDefault(); void commit(draft); }}>
              <Plus size={12} /> {creating ? 'Adding...' : `Add "${draft.trim()}"`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default TagsInput;
