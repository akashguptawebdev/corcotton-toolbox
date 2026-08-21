import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, FolderPlus, Image as ImageIcon, RefreshCw, RotateCcw, Search, Trash2, Upload, X } from 'lucide-react';
import { catalogApi } from '@features/catalog/catalog.api';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import styles from './MediaLibraryPage.module.scss';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function MediaLibraryPage() {
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('library');
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState('');
  const [selected, setSelected] = useState(null);
  const [usages, setUsages] = useState(null);
  const [altDraft, setAltDraft] = useState('');
  const [savingAlt, setSavingAlt] = useState(false);

  const loadFolders = () => catalogApi.media.listFolders().then(({ folders: rows }) => setFolders(rows || [])).catch(() => {});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { files: rows, pagination: meta } = await catalogApi.media.list({
        page,
        limit: 30,
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
    loadFolders();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab, folderId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, mimeFilter]);

  const openDetail = async (file) => {
    setSelected(file);
    setAltDraft(file.altText || '');
    setUsages(null);
    try {
      const { usages: rows } = await catalogApi.media.usages(file.id);
      setUsages(rows);
    } catch {
      setUsages([]);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setUsages(null);
  };

  const onUploadChange = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (!picked.length) return;
    setUploading(true);
    setError('');
    try {
      await catalogApi.media.uploadMultiple(picked, 'library', { folderId: folderId || undefined });
      setNotice(`${picked.length} file${picked.length > 1 ? 's' : ''} uploaded.`);
      setPage(1);
      setTab('library');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const trashFile = async (id) => {
    await catalogApi.media.trash(id);
    if (selected?.id === id) closeDetail();
    load();
  };

  const restoreFile = async (id) => {
    await catalogApi.media.restore(id);
    load();
  };

  const purgeFile = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Permanently delete this file? This cannot be undone.')) return;
    await catalogApi.media.purge(id);
    if (selected?.id === id) closeDetail();
    load();
  };

  const saveAltText = async () => {
    if (!selected) return;
    setSavingAlt(true);
    try {
      const asset = await catalogApi.media.update(selected.id, { altText: altDraft });
      setSelected(asset);
      setFiles((current) => current.map((file) => (file.id === asset.id ? asset : file)));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save');
    } finally {
      setSavingAlt(false);
    }
  };

  const createFolder = async () => {
    // eslint-disable-next-line no-alert
    const name = window.prompt('Folder name');
    if (!name?.trim()) return;
    try {
      await catalogApi.media.createFolder({ name: name.trim() });
      await loadFolders();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create folder');
    }
  };

  const usageSummary = useMemo(() => {
    if (!usages?.length) return null;
    const byType = usages.reduce((acc, u) => {
      acc[u.entityLabel] = (acc[u.entityLabel] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byType).map(([label, count]) => `${count} ${label}${count > 1 ? 's' : ''}`).join(', ');
  }, [usages]);

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="Content / Media"
        icon={FolderOpen}
        title="Media Library"
        description="Reuse images and videos across products, categories, collections, and brands from one source."
        meta={`${files.length} files`}
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>
            <Button type="button" variant="secondary" onClick={createFolder}><FolderPlus size={16} /> New Folder</Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={onUploadChange} />
          </>
        )}
      />

      {error ? <div className={styles.alert}>{error}</div> : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <div className={styles.tabs}>
        <button type="button" className={tab === 'library' ? styles.tabActive : styles.tab} onClick={() => { setTab('library'); setPage(1); }}>Library</button>
        <button type="button" className={tab === 'trash' ? styles.tabActive : styles.tab} onClick={() => { setTab('trash'); setPage(1); }}>Trash</button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, alt text, or tag" />
        </div>
        <select value={mimeFilter} onChange={(event) => setMimeFilter(event.target.value)}>
          <option value="">All types</option>
          <option value="image/">Images</option>
          <option value="video/">Videos</option>
        </select>
        <select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
          <option value="">All folders</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className={styles.body}>
        <div className={styles.grid}>
          {loading ? <div className={styles.emptyState}>Loading…</div> : null}
          {!loading && !files.length ? (
            <div className={styles.emptyState}>
              <ImageIcon size={32} />
              <strong>{tab === 'trash' ? 'Trash is empty' : 'No media yet'}</strong>
              <span>{tab === 'trash' ? '' : 'Upload your first asset to get started.'}</span>
            </div>
          ) : null}
          {files.map((file) => (
            <div key={file.id} className={selected?.id === file.id ? `${styles.card} ${styles.cardActive}` : styles.card} onClick={() => openDetail(file)}>
              <div className={styles.thumb}>
                {file.mimeType?.startsWith('image/') ? <img src={file.url} alt={file.altText || ''} /> : <FolderOpen size={24} />}
              </div>
              <span className={styles.fileName} title={file.originalName || file.fileName}>{file.originalName || file.fileName}</span>
              {tab === 'trash' ? (
                <div className={styles.trashActions} onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => restoreFile(file.id)}><RotateCcw size={12} /> Restore</button>
                  <button type="button" className={styles.dangerBtn} onClick={() => purgeFile(file.id)}><Trash2 size={12} /></button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {selected ? (
          <aside className={styles.detail}>
            <div className={styles.detailHeader}>
              <strong>Asset Details</strong>
              <button type="button" onClick={closeDetail}><X size={16} /></button>
            </div>
            <div className={styles.detailPreview}>
              {selected.mimeType?.startsWith('image/') ? <img src={selected.url} alt="" /> : <FolderOpen size={32} />}
            </div>
            <dl className={styles.detailMeta}>
              <div><dt>File name</dt><dd title={selected.fileName}>{selected.originalName || selected.fileName}</dd></div>
              <div><dt>Type</dt><dd>{selected.mimeType}</dd></div>
              <div><dt>Size</dt><dd>{formatBytes(selected.bytes)}</dd></div>
              {selected.width ? <div><dt>Dimensions</dt><dd>{selected.width} × {selected.height}</dd></div> : null}
              <div><dt>Uploaded</dt><dd>{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : '—'}</dd></div>
            </dl>

            <label className={styles.altLabel}>
              Alt text
              <div className={styles.altRow}>
                <input value={altDraft} onChange={(event) => setAltDraft(event.target.value)} placeholder="Describe this image" />
                <button type="button" onClick={saveAltText} disabled={savingAlt}>Save</button>
              </div>
            </label>

            <div className={styles.usageBlock}>
              <strong>Used in</strong>
              {usages === null ? <span className={styles.usageMuted}>Checking…</span> : usages.length ? (
                <>
                  <span className={styles.usageMuted}>{usageSummary}</span>
                  <ul>
                    {usages.map((u, i) => (
                      <li key={`${u.entityType}-${u.entityId}-${i}`}>{u.entityLabel} #{u.entityId}{u.isPrimary ? ' (primary)' : ''}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <span className={styles.usageMuted}>Not used anywhere yet.</span>
              )}
            </div>

            <button type="button" className={styles.trashDetailBtn} onClick={() => trashFile(selected.id)}>
              <Trash2 size={14} /> Move to Trash
            </button>
          </aside>
        ) : null}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className={styles.pagination}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      ) : null}
    </section>
  );
}

export default MediaLibraryPage;
