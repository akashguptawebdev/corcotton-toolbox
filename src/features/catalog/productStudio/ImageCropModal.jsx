import { useEffect, useRef, useState } from 'react';
import { Check, X, ZoomIn } from 'lucide-react';
import styles from './ImageCropModal.module.scss';

const VIEWPORT = 300;

const ImageCropModal = ({ src, onCancel, onApply, applying }) => {
  const imgRef = useRef(null);
  const dragState = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = src;
  }, [src]);

  if (!natural) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div className={styles.modal}>
          <div className={styles.loading}>Loading image…</div>
        </div>
      </div>
    );
  }

  const baseScale = Math.max(VIEWPORT / natural.width, VIEWPORT / natural.height);
  const displayWidth = natural.width * baseScale * zoom;
  const displayHeight = natural.height * baseScale * zoom;

  const onPointerDown = (event) => {
    dragState.current = { startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  };

  const onPointerUp = () => {
    dragState.current = null;
  };

  const apply = () => {
    const canvas = document.createElement('canvas');
    canvas.width = VIEWPORT;
    canvas.height = VIEWPORT;
    const ctx = canvas.getContext('2d');
    ctx.translate(VIEWPORT / 2 + pan.x, VIEWPORT / 2 + pan.y);
    ctx.scale(baseScale * zoom, baseScale * zoom);
    ctx.drawImage(imgRef.current, -natural.width / 2, -natural.height / 2);
    try {
      canvas.toBlob((blob) => onApply(blob), 'image/png');
    } catch {
      onApply(null);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header>
          <strong>Crop image</strong>
          <button type="button" onClick={onCancel} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div
          className={styles.viewport}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            crossOrigin="anonymous"
            draggable={false}
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
            }}
          />
          <div className={styles.frame} />
        </div>

        <div className={styles.zoomRow}>
          <ZoomIn size={15} />
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </div>

        <footer>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.confirm} onClick={apply} disabled={applying}>
            <Check size={15} /> {applying ? 'Applying…' : 'Apply crop'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ImageCropModal;
