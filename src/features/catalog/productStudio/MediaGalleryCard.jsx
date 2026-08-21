import { useMemo, useRef, useState } from 'react';
import { Crop, Eye, GripVertical, ImageOff, ImagePlus, Star, Trash2, X } from 'lucide-react';
import { catalogApi } from '../catalog.api';
import ImageCropModal from './ImageCropModal';
import MediaPicker from '@components/media/MediaPicker/MediaPicker';
import styles from './MediaGalleryCard.module.scss';

const MAX_IMAGES = 10;

const toList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// Every "add an image" action — the empty-state click target, Replace on an existing
// tile — opens the same MediaPicker gallery rather than a competing direct-upload
// control. The gallery itself already lets the admin either pick an existing asset or
// upload a new one in place, so there's exactly one entry point, not two. Crop is the
// one legitimate exception: it produces a brand-new derived image (the crop result)
// that can't already exist in the library to "pick", so it still uploads directly.
const MediaGalleryCard = ({ primaryImage, galleryImages, onChange, folder = 'products' }) => {
  const dragIndexRef = useRef(null);

  const [error, setError] = useState('');
  const [previewIndex, setPreviewIndex] = useState(null);
  const [cropIndex, setCropIndex] = useState(null);
  const [cropApplying, setCropApplying] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState(null); // null = adding new images; number = replacing that tile

  const images = useMemo(() => [primaryImage, ...toList(galleryImages)].filter(Boolean), [primaryImage, galleryImages]);
  const busy = cropApplying;

  const commit = (next) => onChange({ primaryImage: next[0] || '', galleryImages: next.slice(1).join(', ') });

  const removeAt = (index) => {
    if (busy) return;
    setError('');
    commit(images.filter((_, i) => i !== index));
  };

  const setCover = (index) => {
    if (index === 0 || busy) return;
    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.unshift(moved);
    commit(next);
  };

  const reorder = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || busy) return;
    const next = [...images];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    commit(next);
  };

  const openAddPicker = () => {
    if (busy) return;
    setReplaceIndex(null);
    setPickerOpen(true);
  };

  const openReplacePicker = (index) => {
    if (busy) return;
    setReplaceIndex(index);
    setPickerOpen(true);
  };

  const applyCrop = async (blob) => {
    if (!blob) {
      setError('Crop failed — could not process that image.');
      return;
    }
    setCropApplying(true);
    setError('');
    try {
      const file = new File([blob], `cropped-${Date.now()}.png`, { type: 'image/png' });
      const { asset } = await catalogApi.media.upload(file, folder);
      const next = [...images];
      next[cropIndex] = asset.url;
      commit(next);
      setCropIndex(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Crop upload failed');
    } finally {
      setCropApplying(false);
    }
  };

  return (
    <section className={styles.card}>
      <header>
        <h2>Product Gallery</h2>
        <p>Choose product images from the media gallery.</p>
      </header>

      {images.length === 0 ? (
        <button type="button" className={styles.dropzone} disabled={busy} onClick={openAddPicker}>
          <ImagePlus size={30} />
          <strong>Choose Images from Gallery</strong>
          <span>Find an existing asset or upload a new one</span>
        </button>
      ) : (
        <button type="button" className={styles.addMoreBtn} disabled={busy || images.length >= MAX_IMAGES} onClick={openAddPicker}>
          <ImagePlus size={14} /> Add more from Gallery
        </button>
      )}

      <p className={styles.helper}>Up to {MAX_IMAGES} images</p>

      {error ? <div className={styles.error}>{error}</div> : null}

      {images.length ? (
        <div className={styles.grid}>
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={styles.tile}
              draggable
              onDragStart={(event) => {
                dragIndexRef.current = index;
                event.dataTransfer.setData('text/plain', String(index));
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                reorder(dragIndexRef.current, index);
              }}
            >
              <img src={url} alt="" />
              {index === 0 ? <span className={styles.coverBadge}>Cover</span> : null}

              <button type="button" className={styles.removeBtn} onClick={() => removeAt(index)} aria-label="Remove image">
                <X size={13} />
              </button>

              {index !== 0 ? (
                <button type="button" className={styles.coverBtn} onClick={() => setCover(index)} aria-label="Set as cover">
                  <Star size={13} />
                </button>
              ) : null}

              <span className={styles.dragHandle}>
                <GripVertical size={14} />
              </span>

              <div className={styles.hoverActions}>
                <button type="button" onClick={() => openReplacePicker(index)}>
                  <ImagePlus size={13} /> Replace
                </button>
                <button type="button" onClick={() => setCropIndex(index)}>
                  <Crop size={13} /> Crop
                </button>
                <button type="button" onClick={() => setPreviewIndex(index)}>
                  <Eye size={13} /> Preview
                </button>
                <button type="button" onClick={() => removeAt(index)}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <ImageOff size={30} />
          <strong>No images yet</strong>
          <span>Your customers buy with their eyes.</span>
        </div>
      )}

      {previewIndex != null ? (
        <div className={styles.lightbox} role="dialog" aria-modal="true" onClick={() => setPreviewIndex(null)}>
          <img src={images[previewIndex]} alt="" onClick={(event) => event.stopPropagation()} />
          <button type="button" onClick={() => setPreviewIndex(null)} aria-label="Close preview">
            <X size={18} />
          </button>
        </div>
      ) : null}

      {cropIndex != null ? (
        <ImageCropModal src={images[cropIndex]} applying={cropApplying} onCancel={() => setCropIndex(null)} onApply={applyCrop} />
      ) : null}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder={folder}
        multiple={replaceIndex === null}
        title={replaceIndex === null ? 'Select Product Images' : 'Replace Image'}
        onSelect={(picked) => {
          if (replaceIndex !== null) {
            if (!picked) return;
            const next = [...images];
            next[replaceIndex] = picked.url;
            commit(next);
            return;
          }
          const urls = picked.map((asset) => asset.url).filter((url) => !images.includes(url));
          if (urls.length) commit([...images, ...urls].slice(0, MAX_IMAGES));
        }}
      />
    </section>
  );
};

export default MediaGalleryCard;
