import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import MediaPicker from '@components/media/MediaPicker/MediaPicker';
import styles from './MultiImageUploadField.module.scss';

const toList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// Single entry point for attaching images: opens the media gallery, where the admin
// either picks existing assets or uploads new ones right there (MediaPicker's own
// "Upload New" button) — no separate direct-upload path and no free-text URL list, so
// there's exactly one way in rather than two competing ones.
const MultiImageUploadField = ({ label, value, onChange, folder }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const urls = toList(value);

  const removeAt = (index) => onChange(urls.filter((_, i) => i !== index).join(', '));

  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <span>{label}</span>
        <button type="button" onClick={() => setPickerOpen(true)}>
          <ImagePlus size={14} /> Choose from Gallery
        </button>
      </div>
      {urls.length ? (
        <div className={styles.grid}>
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className={styles.thumb}>
              <img src={url} alt="" />
              <button type="button" onClick={() => removeAt(index)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>No images yet — choose from the gallery.</div>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder={folder}
        title={`Select ${label || 'Images'}`}
        onSelect={(picked) => {
          const newUrls = picked.map((asset) => asset.url).filter((url) => !urls.includes(url));
          if (newUrls.length) onChange([...urls, ...newUrls].join(', '));
        }}
      />
    </div>
  );
};

export default MultiImageUploadField;
