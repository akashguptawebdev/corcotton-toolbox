import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import MediaPicker from '@components/media/MediaPicker/MediaPicker';
import styles from './ImageUploadField.module.scss';

// Single entry point for attaching an image: opens the media gallery, where the admin
// either picks an existing asset or uploads a new one right there (MediaPicker's own
// "Upload New" button) — no separate direct-upload path and no free-text URL field, so
// there's exactly one way in rather than two competing ones.
const ImageUploadField = ({ label, value, onChange, folder, disabled = false }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={styles.field}>
      <span>{label}</span>
      <div className={styles.control}>
        <div className={styles.thumb}>
          {value ? <img src={value} alt="" /> : <ImagePlus size={18} />}
        </div>
        <div className={styles.inputs}>
          <span className={styles.fileName} title={value || ''}>
            {value ? value.split('/').pop() : 'No image selected'}
          </span>
          <div className={styles.actions}>
            <button type="button" onClick={() => setPickerOpen(true)} disabled={disabled}>
              <ImagePlus size={14} /> {value ? 'Replace' : 'Choose from Gallery'}
            </button>
            {value ? (
              <button type="button" className={styles.remove} onClick={() => onChange('')} disabled={disabled}>
                <X size={14} /> Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder={folder}
        multiple={false}
        title={`Select ${label || 'Image'}`}
        onSelect={(asset) => asset && onChange(asset.url)}
      />
    </div>
  );
};

export default ImageUploadField;
