import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Folder, ImageOff, Loader2, RotateCcw, Search, Trash2, Upload, X } from 'lucide-react';
import { catalogApi } from '@features/catalog/catalog.api';
import styles from './MediaPicker.module.scss';

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Centralized asset browser used everywhere media is attached (Products, Media
// Library page, and — once wired — Categories/Brands/Collections). Selecting an
// existing asset never re-uploads; picking "Upload new" pushes through the same
// /admin/media/upload endpoint so every asset lands in the library exactly once.
const MediaPicker = ({ open, onClose, onSelect, multiple = true, folder = 'library', title = 'Select Media' }) => {
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('library');
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const selectedFiles = useMemo(() => files.filter((file) => selectedIds.has(file.id)), [files, selectedIds]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { files: rows, pagination: meta } = await catalogApi.media.list({
        page,
        limit: 24,
        search: search || undefined,
        mimeType: mimeFilter || undefined,
        folderId: folderId || undefined,
        trashed: tab === 'trash',
      });
      setFiles(rows || []);
      setPagination(meta || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    catalogApi.media.listFolders().then(({ folders: rows }) => setFolders(rows || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, tab, folderId]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, mimeFilter]);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setTab('library');
      setSearch('');
      setMimeFilter('');
      setFolderId('');
      setPage(1);
    }
  }, [open]);

  if (!open) return null;

  const toggleSelect = (file) => {
    setSelectedIds((current) => {
      const next = new Set(multiple ? current : []);
      if (next.has(file.id)) next.delete(file.id);
      else {
        if (!multiple) next.clear();
        next.add(file.id);
      }
      return next;
    });
  };

  const onUploadChange = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (!picked.length) return;
    setUploading(true);
    setError('');
    try {
      const { assets } = await catalogApi.media.uploadMultiple(picked, folder, { folderId: folderId || undefined });
      setPage(1);
      setTab('library');
      await load();
      setSelectedIds((current) => {
        const next = new Set(multiple ? current : []);
        assets.forEach((asset) => next.add(asset.id));
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const confirmSelection = () => {
    onSelect(multiple ? selectedFiles : selectedFiles[0] || null);
    onClose();
  };

  const restoreFile = async (id) => {
    await catalogApi.media.restore(id);
    load();
  };

  const purgeFile = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Permanently delete this file? This cannot be undone.')) return;
    await catalogApi.media.purge(id);
    load();
  };

  const trashFile = async (id) => {
    await catalogApi.media.trash(id);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    load();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <strong>{title}</strong>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className={styles.tabs}>
          <button type="button" className={tab === 'library' ? styles.tabActive : styles.tab} onClick={() => { setTab('library'); setPage(1); }}>
            Library
          </button>
          <button type="button" className={tab === 'trash' ? styles.tabActive : styles.tab} onClick={() => { setTab('trash'); setPage(1); }}>
            Trash
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, alt text, or tag" />
          </div>
          <select value={mimeFilter} onChange={(event) => setMimeFilter(event.target.value)}>
            <option value="">All types</option>
            <option value="image/">Images</option>
            <option value="video/">Videos</option>
          </select>
          <select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {tab === 'library' ? (
            <button type="button" className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={15} className={styles.spinner} /> : <Upload size={15} />}
              {uploading ? 'Uploading…' : 'Upload New'}
            </button>
          ) : null}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={onUploadChange} />
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.grid}>
          {loading ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : files.length ? (
            files.map((file) => (
              <div key={file.id} className={selectedIds.has(file.id) ? `${styles.card} ${styles.cardSelected}` : styles.card}>
                <button
                  type="button"
                  className={styles.thumbButton}
                  onClick={() => (tab === 'library' ? toggleSelect(file) : null)}
                  disabled={tab === 'trash'}
                >
                  {file.mimeType?.startsWith('image/') ? <img src={file.url} alt={file.altText || ''} /> : <Folder size={28} />}
                  {tab === 'library' ? (
                    <span className={styles.checkbox}>{selectedIds.has(file.id) ? <Check size={12} /> : null}</span>
                  ) : null}
                </button>
                <div className={styles.cardMeta}>
                  <span className={styles.fileName} title={file.originalName || file.fileName}>{file.originalName || file.fileName}</span>
                  <span className={styles.fileSize}>{formatBytes(file.bytes)}</span>
                </div>
                {tab === 'trash' ? (
                  <div className={styles.trashActions}>
                    <button type="button" onClick={() => restoreFile(file.id)} title="Restore">
                      <RotateCcw size={13} /> Restore
                    </button>
                    <button type="button" className={styles.dangerBtn} onClick={() => purgeFile(file.id)} title="Delete permanently">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <button type="button" className={styles.cardTrashBtn} onClick={() => trashFile(file.id)} title="Move to trash">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <ImageOff size={30} />
              <strong>{tab === 'trash' ? 'Trash is empty' : 'No media found'}</strong>
              <span>{tab === 'trash' ? '' : 'Upload files or adjust your search.'}</span>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className={styles.pagination}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        ) : null}

        {tab === 'library' ? (
          <footer className={styles.footer}>
            <span>{selectedIds.size ? `${selectedIds.size} selected` : 'Nothing selected'}</span>
            <div>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button type="button" className={styles.confirmBtn} onClick={confirmSelection} disabled={!selectedIds.size}>
                {multiple ? 'Add Selected' : 'Select'}
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
};

export default MediaPicker;
