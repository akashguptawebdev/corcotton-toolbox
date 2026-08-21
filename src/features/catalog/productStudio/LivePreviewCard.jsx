import { ImagePlus, Star } from 'lucide-react';
import styles from './LivePreviewCard.module.scss';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const money = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? currency.format(numeric) : '₹0';
};

const STATUS_LABEL = { ACTIVE: 'Active', DRAFT: 'Draft', INACTIVE: 'Inactive' };

const LivePreviewCard = ({
  name,
  brandName,
  categoryName,
  shortDescription,
  primaryImage,
  status,
  productType,
  sellingPrice,
  compareAtPrice,
  stockQuantity,
  variantCount,
}) => {
  const compare = Number(compareAtPrice) || 0;
  const selling = Number(sellingPrice) || 0;
  const discountPct = compare > selling && selling > 0 ? Math.round(((compare - selling) / compare) * 100) : 0;
  const inStock = Number(stockQuantity) > 0;

  return (
    <section className={styles.card}>
      <header>
        <h2>Live Product Preview</h2>
      </header>

      <div className={styles.productCard}>
        <div className={styles.imageWrap}>
          {primaryImage ? <img src={primaryImage} alt="" /> : <ImagePlus size={30} />}
          <span className={styles[`status_${status || 'DRAFT'}`]}>{STATUS_LABEL[status] || 'Draft'}</span>
          {discountPct > 0 ? <span className={styles.discountBadge}>{discountPct}% OFF</span> : null}
        </div>

        <div className={styles.body}>
          <span className={styles.brand}>{brandName || 'No brand'}</span>
          <strong className={styles.name}>{name || 'Untitled product'}</strong>

          <div className={styles.rating}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} />
            ))}
            <small>No ratings yet</small>
          </div>

          <div className={styles.priceRow}>
            <b>{money(selling)}</b>
            {compare > selling ? <s>{money(compare)}</s> : null}
          </div>

          <div className={styles.metaRow}>
            <span className={inStock ? styles.inStock : styles.outStock}>{inStock ? 'In stock' : 'Out of stock'}</span>
            <span className={styles.category}>{categoryName || 'Uncategorized'}</span>
          </div>

          <p className={styles.description}>{shortDescription || 'Short product summary appears here.'}</p>

          <div className={styles.footer}>
            <span>{variantCount > 1 ? `${variantCount} variants` : 'Single SKU'}</span>
            <span>{productType === 'VARIABLE' ? 'Variable' : 'Simple'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LivePreviewCard;
