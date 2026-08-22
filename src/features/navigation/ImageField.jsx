import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import MediaPicker from '@components/media/MediaPicker/MediaPicker';
import styles from './NavigationManagerPage.module.scss';

/**
 * Thumbnail + "Choose image" / "Remove" — the same media-library flow Product Studio uses
 * (browse existing assets or upload new, one entry point), instead of a raw URL text field
 * an admin has to source a link for themselves.
 */
const ImageField = ({ value, onChange, disabled, folder = 'navigation', title = 'Select Image' }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={styles.imageField}>
      {value ? (
        <div className={styles.imageThumb}>
          <img src={value} alt="" />
          {!disabled && (
            <button type="button" className={styles.imageRemove} onClick={() => onChange('')} title="Remove image">
              <X size={13} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={styles.imageEmpty}
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          <ImagePlus size={18} />
          <span>No image</span>
        </button>
      )}

      <button type="button" className={styles.imageChoose} disabled={disabled} onClick={() => setPickerOpen(true)}>
        {value ? 'Change image' : 'Choose image'}
      </button>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder={folder}
        multiple={false}
        title={title}
        onSelect={(picked) => picked && onChange(picked.url)}
      />
    </div>
  );
};

export default ImageField;
