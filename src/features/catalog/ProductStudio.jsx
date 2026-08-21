import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit3,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
  ChevronDown,
} from 'lucide-react';
import ImageUploadField from '@components/forms/ImageUploadField/ImageUploadField';
import MultiImageUploadField from '@components/forms/MultiImageUploadField/MultiImageUploadField';
import AppInput from '@components/forms/AppInput/AppInput';
import RichTextEditor from '@components/forms/RichTextEditor/RichTextEditor';
import CategoryDropdown from '@components/forms/CategoryDropdown/CategoryDropdown';
import TaxCategoryDropdown from '@components/forms/TaxCategoryDropdown/TaxCategoryDropdown';
import TagsInput from '@components/forms/TagsInput/TagsInput';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import MediaGalleryCard from './productStudio/MediaGalleryCard';
import LivePreviewCard from './productStudio/LivePreviewCard';
import ReadinessCard from './productStudio/ReadinessCard';
import QuickActionsCard from './productStudio/QuickActionsCard';
import { usePermission } from '@hooks/usePermission';
import { useEditGuard } from '@hooks/useEditGuard';
import { PERMISSIONS } from '@constants/permissions';
import { catalogApi } from './catalog.api';
import styles from './ProductStudio.module.scss';

const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:3000';

const blankProduct = {
  name: '',
  productType: 'SIMPLE',
  merchandiseType: '',
  status: 'DRAFT',
  brandId: '',
  vendor: '',
  primaryImage: '',
  galleryImages: '',
  shortDescription: '',
  description: '',
  categoryIds: [],
  tags: '',
  taxCategoryId: '',
  hsnCode: '',
  countryOfOrigin: 'India',
  isFeatured: false,
  isReturnable: true,
  isCodAllowed: true,
  metaTitle: '',
  metaDescription: '',
  ogTitle: '',
  ogImage: '',
  canonicalUrl: '',
  itemHighlight: '',
  modalNo: '',
  bulletPoints: '',
  genericKeywords: '',
  material: '',
  itemType: '',
  itemNo: '',
  size: '',
  itemForm: '',
  unitCount: '',
  identificationType: '',
  variant: {
    sku: '',
    variantName: 'Default',
    mrp: '',
    sellingPrice: '',
    compareAtPrice: '',
    costPrice: '',
    stockTrackingEnabled: true,
    stockQuantity: '',
    reservedQuantity: '2',
    lowStockThreshold: '5',
    minOrderQty: '1',
    maxOrderQty: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    barcodeType: 'EAN',
    barcodeValue: '',
    imageUrls: '',
    status: 'ACTIVE',
  },
};

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const getItems = (key, data) => data?.[key] || data?.products || data?.brands || data?.categories || data?.attributes || [];

const toArray = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const money = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? currency.format(numeric) : '₹0';
};

const skuRoot = (value) =>
  String(value || 'PRODUCT')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 16) || 'PRODUCT';

const generateSku = (productName, variantName = 'Default', seed = Date.now().toString(36), index = 0) => {
  const root = skuRoot(productName);
  const variant = skuRoot(variantName).slice(0, 12) || 'DEFAULT';
  return `${root}-${variant}-${String(seed).toUpperCase()}${index}`;
};

const buildCombinations = (groups) => {
  const activeGroups = groups.filter((group) => group.values.length);
  if (!activeGroups.length) return [];

  return activeGroups.reduce(
    (combinations, group) =>
      combinations.flatMap((combo) =>
        group.values.map((value) => ({
          label: [...combo.label, value.displayValue || value.value],
          ids: [...combo.ids, value.id],
        }))
      ),
    [{ label: [], ids: [] }]
  );
};

const normalizeDraftKey = (variant, index) =>
  variant.key || (variant.attributeValueIds?.length ? variant.attributeValueIds.join('-') : `variant-${variant.id || index}`);

const BARCODE_TYPES = [
  { value: 'EAN', label: 'EAN' },
  { value: 'UPC', label: 'UPC' },
  { value: 'GTIN', label: 'GTIN' },
  { value: 'ISBN', label: 'ISBN' },
  { value: 'CODE128', label: 'Code 128' },
  { value: 'QR', label: 'QR code' },
];

const buildVariantDrafts = (form, groups, skuSeed) => {
  const combinations = buildCombinations(groups);

  return combinations.map((combo, index) => ({
    key: combo.ids.join('-'),
    variantName: combo.label.join(' / '),
    sku: generateSku(form.name, combo.label.join('-'), skuSeed, index),
    mrp: form.variant.mrp,
    sellingPrice: form.variant.sellingPrice,
    compareAtPrice: form.variant.compareAtPrice,
    costPrice: form.variant.costPrice,
    stockTrackingEnabled: form.variant.stockTrackingEnabled,
    stockQuantity: form.variant.stockQuantity,
    reservedQuantity: form.variant.reservedQuantity,
    lowStockThreshold: form.variant.lowStockThreshold,
    minOrderQty: form.variant.minOrderQty,
    maxOrderQty: form.variant.maxOrderQty,
    weight: form.variant.weight,
    length: form.variant.length,
    width: form.variant.width,
    height: form.variant.height,
    barcodeType: form.variant.barcodeType,
    barcodeValue: form.variant.barcodeValue,
    imageUrls: form.variant.imageUrls,
    status: form.variant.status || 'ACTIVE',
    attributeValueIds: combo.ids,
    isDefault: index === 0,
  }));
};

function ProductStudio() {
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.PRODUCT_CREATE);
  const { canEdit, isEditing, startEdit, stopEdit, setIsEditing } = useEditGuard(PERMISSIONS.PRODUCT_UPDATE);
  const [view, setView] = useState('list');
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [taxCategories, setTaxCategories] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [form, setForm] = useState(blankProduct);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [variantOptionMenuOpen, setVariantOptionMenuOpen] = useState(false);
  const [variantOptionQuery, setVariantOptionQuery] = useState('');
  const [openVariantKeys, setOpenVariantKeys] = useState(new Set());
  const [variantDrafts, setVariantDrafts] = useState([]);
  const [variantDraftsTouched, setVariantDraftsTouched] = useState(false);
  const [skuSeed, setSkuSeed] = useState(() => Date.now().toString(36));
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedAttributeGroups = useMemo(
    () =>
      attributes
        .map((attribute) => ({
          ...attribute,
          values: (attribute.values || []).filter((value) => selectedAttributes[attribute.id]?.includes(value.id)),
        }))
        .filter((attribute) => attribute.values.length),
    [attributes, selectedAttributes]
  );

  const generatedVariantDrafts = useMemo(
    () => buildVariantDrafts(form, selectedAttributeGroups, skuSeed),
    [form, selectedAttributeGroups, skuSeed]
  );
  const effectiveVariantDrafts = variantDraftsTouched ? variantDrafts : generatedVariantDrafts;
  const effectiveProductType = effectiveVariantDrafts.length ? 'VARIABLE' : 'SIMPLE';

  const productPreview = useMemo(() => {
    const selectedBrand = brands.find((brand) => String(brand.id) === String(form.brandId));
    const selectedCategories = categories.filter((category) => form.categoryIds.includes(category.id));
    const defaultVariant = effectiveProductType === 'SIMPLE' ? form.variant : effectiveVariantDrafts.find((variant) => variant.isDefault) || effectiveVariantDrafts[0] || {};
    return { selectedBrand, selectedCategories, defaultVariant };
  }, [brands, categories, effectiveProductType, effectiveVariantDrafts, form]);

  const readinessItems = useMemo(
    () => [
      { label: 'Product Name', done: Boolean(form.name?.trim()) },
      { label: 'Images', done: Boolean(form.primaryImage) },
      { label: 'Category', done: form.categoryIds.length > 0 },
      { label: 'Pricing', done: Number(productPreview.defaultVariant?.sellingPrice) > 0 },
      { label: 'Inventory', done: productPreview.defaultVariant?.stockQuantity !== '' && productPreview.defaultVariant?.stockQuantity != null },
      { label: 'Variants', done: effectiveProductType === 'SIMPLE' || effectiveVariantDrafts.length > 0 },
      { label: 'SEO', done: Boolean(form.metaTitle || form.metaDescription) },
      { label: 'Description', done: Boolean(form.description?.trim()) },
    ],
    [effectiveProductType, effectiveVariantDrafts, form, productPreview]
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !q || [product.name, product.slug, product.brand?.name, product.status, product.productType].filter(Boolean).join(' ').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || product.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || product.productType === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [products, query, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    const active = products.filter((product) => product.status === 'ACTIVE').length;
    const draft = products.filter((product) => product.status === 'DRAFT').length;
    const variable = products.filter((product) => product.productType === 'VARIABLE').length;
    return { total: products.length, active, draft, variable };
  }, [products]);

  const selectedAttributeIds = useMemo(
    () => Object.keys(selectedAttributes).map(Number).filter((id) => Number.isInteger(id)),
    [selectedAttributes]
  );

  const selectedOptionAttributes = useMemo(
    () => attributes.filter((attribute) => selectedAttributeIds.includes(Number(attribute.id))),
    [attributes, selectedAttributeIds]
  );

  const optionQuery = variantOptionQuery.trim().toLowerCase();
  const availableOptionAttributes = useMemo(
    () =>
      attributes
        .filter((attribute) => !selectedAttributeIds.includes(Number(attribute.id)))
        .filter((attribute) => {
          if (!optionQuery) return true;
          return [attribute.name, attribute.displayName].filter(Boolean).some((value) => String(value).toLowerCase().includes(optionQuery));
        }),
    [attributes, optionQuery, selectedAttributeIds]
  );

  const payload = useMemo(() => {
    const base = {
      name: form.name,
      productType: effectiveProductType,
      merchandiseType: form.merchandiseType || null,
      status: form.status,
      brandId: form.brandId || null,
      vendor: form.vendor || null,
      primaryImage: form.primaryImage || null,
      galleryImages: toArray(form.galleryImages),
      shortDescription: form.shortDescription || null,
      description: form.description || null,
      categoryIds: form.categoryIds,
      tags: toArray(form.tags),
      taxCategoryId: form.taxCategoryId || null,
      hsnCode: form.hsnCode || null,
      countryOfOrigin: form.countryOfOrigin || null,
      isFeatured: form.isFeatured,
      isReturnable: form.isReturnable,
      isCodAllowed: form.isCodAllowed,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      ogTitle: form.ogTitle || null,
      ogImage: form.ogImage || form.primaryImage || null,
      canonicalUrl: form.canonicalUrl || null,
      itemHighlight: toArray(form.itemHighlight),
      modalNo: form.modalNo || null,
      bulletPoints: toArray(form.bulletPoints),
      genericKeywords: form.genericKeywords || null,
      material: toArray(form.material),
      itemType: form.itemType || null,
      itemNo: form.itemNo || null,
      size: form.size || null,
      itemForm: toArray(form.itemForm),
      unitCount: form.unitCount || null,
      identificationType: form.identificationType || null,
    };

    if (effectiveProductType === 'SIMPLE') {
      return {
        ...base,
        variant: {
          ...form.variant,
          mrp: Number(form.variant.mrp) || 0,
          sellingPrice: Number(form.variant.sellingPrice) || 0,
          compareAtPrice: form.variant.compareAtPrice || null,
          costPrice: form.variant.costPrice || null,
          stockTrackingEnabled: form.variant.stockTrackingEnabled,
          stockQuantity: Number(form.variant.stockQuantity) || 0,
          reservedQuantity: Number(form.variant.reservedQuantity) || 0,
          lowStockThreshold: Number(form.variant.lowStockThreshold) || 0,
          minOrderQty: Number(form.variant.minOrderQty) || 1,
          maxOrderQty: form.variant.maxOrderQty || null,
          weight: form.variant.weight || null,
          length: form.variant.length || null,
          width: form.variant.width || null,
          height: form.variant.height || null,
          barcodeType: form.variant.barcodeType || null,
          barcodeValue: form.variant.barcodeValue || null,
          imageUrls: toArray(form.variant.imageUrls),
          status: form.variant.status || 'ACTIVE',
        },
      };
    }

    return {
      ...base,
      attributeValueIds: selectedAttributeGroups.flatMap((attribute) => attribute.values.map((value) => value.id)),
      variants: effectiveVariantDrafts.map((variant) => ({
        sku: variant.sku,
        variantName: variant.variantName,
        mrp: Number(variant.mrp) || 0,
        sellingPrice: Number(variant.sellingPrice) || 0,
        compareAtPrice: variant.compareAtPrice || null,
        costPrice: variant.costPrice || null,
        stockTrackingEnabled: variant.stockTrackingEnabled,
        stockQuantity: Number(variant.stockQuantity) || 0,
        reservedQuantity: Number(variant.reservedQuantity) || 0,
        lowStockThreshold: Number(variant.lowStockThreshold) || 0,
        minOrderQty: Number(variant.minOrderQty) || 1,
        maxOrderQty: variant.maxOrderQty || null,
        weight: variant.weight || null,
        length: variant.length || null,
        width: variant.width || null,
        height: variant.height || null,
        barcodeType: variant.barcodeType || null,
        barcodeValue: variant.barcodeValue || null,
        imageUrls: toArray(variant.imageUrls),
        status: variant.status || 'ACTIVE',
        attributeValueIds: variant.attributeValueIds,
        isDefault: variant.isDefault,
      })),
    };
  }, [effectiveProductType, effectiveVariantDrafts, form, selectedAttributeGroups]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productData, brandData, categoryData, attributeData, taxCategoryData, tagData] = await Promise.all([
        catalogApi.products.list({ limit: 100 }),
        catalogApi.brands.list({ limit: 100 }),
        catalogApi.categories.list({ flat: true }),
        catalogApi.attributes.list({ withValues: true, applicableTo: 'PRODUCT' }),
        catalogApi.taxCategories.list({ withRates: true }),
        catalogApi.tags.list(),
      ]);
      setProducts(getItems('products', productData));
      setBrands(getItems('brands', brandData));
      setCategories(getItems('categories', categoryData));
      setAttributes(getItems('attributes', attributeData));
      setTaxCategories(getItems('taxCategories', taxCategoryData));
      setTagSuggestions(getItems('tags', tagData));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load product workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing || skuManuallyEdited || effectiveProductType !== 'SIMPLE') return;
    setForm((current) => {
      const nextSku = generateSku(current.name, current.variant.variantName || 'Default', skuSeed);
      if (current.variant.sku === nextSku) return current;
      return { ...current, variant: { ...current.variant, sku: nextSku } };
    });
  }, [editing, effectiveProductType, form.name, form.variant.variantName, skuManuallyEdited, skuSeed]);

  const reset = () => {
    setForm(blankProduct);
    setSelectedAttributes({});
    setVariantDrafts([]);
    setOpenVariantKeys(new Set());
    setVariantDraftsTouched(false);
    setSkuSeed(Date.now().toString(36));
    setSkuManuallyEdited(false);
    setEditing(null);
    setError('');
  };

  const closeBuilder = () => {
    reset();
    stopEdit();
    setView('list');
  };

  const startCreate = () => {
    if (!canCreate) return;
    reset();
    setForm(blankProduct);
    setIsEditing(true); // a blank new product has nothing to "view" — always editable
    setView('builder');
    setNotice('');
  };

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateFields = (patch) => setForm((current) => ({ ...current, ...patch }));
  const updateVariant = (key, value) => setForm((current) => ({ ...current, variant: { ...current.variant, [key]: value } }));

  const selectedTaxCategory = useMemo(
    () => taxCategories.find((category) => String(category.id) === String(form.taxCategoryId)) || null,
    [taxCategories, form.taxCategoryId]
  );

  // Selecting a tax category drives both the stored taxCategoryId and the HS Code shown
  // on the product — the dropdown is the source of truth, HS Code is just its readout.
  const selectTaxCategory = (category) => updateFields({ taxCategoryId: category?.id || '', hsnCode: category?.hsnCode || '' });

  const createTagFromProduct = async (name) => {
    try {
      const data = await catalogApi.tags.create({ name });
      const tag = data.tag;
      setTagSuggestions((current) => (current.some((item) => String(item.id) === String(tag.id)) ? current : [...current, tag].sort((a, b) => a.name.localeCompare(b.name))));
      return tag;
    } catch (err) {
      const tagData = await catalogApi.tags.list({ search: name });
      const existing = getItems('tags', tagData).find((tag) => tag.name.toLowerCase() === name.trim().toLowerCase());
      if (existing) {
        setTagSuggestions((current) => (current.some((item) => String(item.id) === String(existing.id)) ? current : [...current, existing].sort((a, b) => a.name.localeCompare(b.name))));
        return existing;
      }
      throw err;
    }
  };

  const toggleAttributeValue = (attributeId, valueId) => {
    setVariantDrafts([]);
    setOpenVariantKeys(new Set());
    setVariantDraftsTouched(false);
    setSelectedAttributes((current) => {
      const values = current[attributeId] || [];
      return {
        ...current,
        [attributeId]: values.includes(valueId) ? values.filter((id) => id !== valueId) : [...values, valueId],
      };
    });
  };

  const addVariantOption = (attributeId) => {
    setSelectedAttributes((current) => ({ ...current, [attributeId]: current[attributeId] || [] }));
    setVariantOptionMenuOpen(false);
    setVariantOptionQuery('');
  };

  const removeVariantOption = (attributeId) => {
    setVariantDrafts([]);
    setOpenVariantKeys(new Set());
    setVariantDraftsTouched(false);
    setSelectedAttributes((current) => {
      const next = { ...current };
      delete next[attributeId];
      return next;
    });
  };

  const generateVariants = () => {
    setVariantDrafts(buildVariantDrafts(form, selectedAttributeGroups, skuSeed));
    setOpenVariantKeys(new Set());
    setVariantDraftsTouched(true);
  };

  const updateVariantDraft = (key, field, value) => {
    setVariantDraftsTouched(true);
    setVariantDrafts((current) => {
      const source = current.length ? current : effectiveVariantDrafts;
      return source.map((variant) => (variant.key === key ? { ...variant, [field]: value } : variant));
    });
  };

  const toggleVariantOpen = (key) => {
    setOpenVariantKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const removeVariantDraft = (key) => {
    setVariantDraftsTouched(true);
    setOpenVariantKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setVariantDrafts((current) => {
      const source = current.length ? current : effectiveVariantDrafts;
      return source.filter((variant) => variant.key !== key);
    });
  };

  const hydrateProduct = (product) => {
    const variants = product.variants || [];
    const variant = variants.find((item) => item.isDefault) || variants[0] || {};
    const nextSelectedAttributes = {};
    const productAttributeValues = product.productAttributeValues || [];

    productAttributeValues.forEach((item) => {
      if (!item.attributeId || !item.attributeValueId) return;
      nextSelectedAttributes[item.attributeId] = [...(nextSelectedAttributes[item.attributeId] || []), item.attributeValueId];
    });

    if (!productAttributeValues.length) {
      variants.forEach((item) => {
        (item.variantAttributeValues || []).forEach((variantValue) => {
          const value = variantValue.attributeValue;
          if (!value?.attributeId || !value?.id) return;
          nextSelectedAttributes[value.attributeId] = [...(nextSelectedAttributes[value.attributeId] || []), value.id];
        });
      });
    }

    setEditing(product);
    setForm({
      ...blankProduct,
      ...product,
      productType: product.productType || 'SIMPLE',
      merchandiseType: product.merchandiseType || '',
      brandId: product.brandId || '',
      vendor: product.vendor || '',
      galleryImages: Array.isArray(product.galleryImages) ? product.galleryImages.join(', ') : '',
      categoryIds: product.categories?.map((category) => category.id) || [],
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      taxCategoryId: product.taxCategoryId || '',
      hsnCode: product.hsnCode || '',
      countryOfOrigin: product.countryOfOrigin || 'India',
      metaTitle: product.metaTitle || '',
      metaDescription: product.metaDescription || '',
      ogTitle: product.ogTitle || '',
      ogImage: product.ogImage || '',
      canonicalUrl: product.canonicalUrl || '',
      itemHighlight: Array.isArray(product.itemHighlight) ? product.itemHighlight.join(', ') : '',
      modalNo: product.modalNo || '',
      bulletPoints: Array.isArray(product.bulletPoints) ? product.bulletPoints.join(', ') : '',
      genericKeywords: product.genericKeywords || '',
      material: Array.isArray(product.material) ? product.material.join(', ') : '',
      itemType: product.itemType || '',
      itemNo: product.itemNo || '',
      size: product.size || '',
      itemForm: Array.isArray(product.itemForm) ? product.itemForm.join(', ') : '',
      unitCount: product.unitCount || '',
      identificationType: product.identificationType || '',
      variant: {
        ...blankProduct.variant,
        sku: variant.sku || '',
        variantName: variant.variantName || 'Default',
        mrp: variant.mrp || '',
        sellingPrice: variant.sellingPrice || '',
        compareAtPrice: variant.compareAtPrice || '',
        costPrice: variant.costPrice || '',
        stockTrackingEnabled: variant.stockTrackingEnabled ?? true,
        stockQuantity: variant.stockQuantity || '',
        reservedQuantity: variant.reservedQuantity || '',
        lowStockThreshold: variant.lowStockThreshold || '',
        minOrderQty: variant.minOrderQty || '1',
        maxOrderQty: variant.maxOrderQty || '',
        weight: variant.weight || '',
        length: variant.length || '',
        width: variant.width || '',
        height: variant.height || '',
        barcodeType: variant.barcodeType || '',
        barcodeValue: variant.barcodeValue || '',
        imageUrls: Array.isArray(variant.imageUrls) ? variant.imageUrls.join(', ') : '',
        status: variant.status || 'ACTIVE',
      },
    });
    setSelectedAttributes(nextSelectedAttributes);
    setSkuManuallyEdited(true);
    setVariantDraftsTouched(product.productType === 'VARIABLE');
    if (product.productType === 'VARIABLE') {
      const hydratedVariants = variants.map((item, index) => {
            const attributeValueIds = (item.variantAttributeValues || []).map((variantValue) => variantValue.attributeValueId || variantValue.attributeValue?.id).filter(Boolean);
            return {
              key: normalizeDraftKey({ ...item, attributeValueIds }, index),
              id: item.id,
              variantName: item.variantName || `Variant ${index + 1}`,
              sku: item.sku || '',
              mrp: item.mrp || '',
              sellingPrice: item.sellingPrice || '',
              compareAtPrice: item.compareAtPrice || '',
              costPrice: item.costPrice || '',
              stockTrackingEnabled: item.stockTrackingEnabled ?? true,
              stockQuantity: item.stockQuantity || '',
              reservedQuantity: item.reservedQuantity || '',
              lowStockThreshold: item.lowStockThreshold || '',
              minOrderQty: item.minOrderQty || '1',
              maxOrderQty: item.maxOrderQty || '',
              weight: item.weight || '',
              length: item.length || '',
              width: item.width || '',
              height: item.height || '',
              barcodeType: item.barcodeType || '',
              barcodeValue: item.barcodeValue || '',
              imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls.join(', ') : '',
              status: item.status || 'ACTIVE',
              attributeValueIds,
              isDefault: item.isDefault || index === 0,
            };
          });
      setVariantDrafts(hydratedVariants);
      setOpenVariantKeys(new Set());
    } else {
      setVariantDrafts([]);
      setOpenVariantKeys(new Set());
    }
    stopEdit(); // opens read-only — Edit must be clicked (and permitted) to unlock fields
    setView('builder');
  };

  const openProduct = async (product) => {
    setOpening(true);
    setError('');
    try {
      const detail = await catalogApi.products.get(product.id);
      hydrateProduct(detail.product || product);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to open product');
    } finally {
      setOpening(false);
    }
  };

  // Re-fetches and re-hydrates from the server, discarding any unsaved local edits —
  // simpler and safer than hand-maintaining a snapshot of this form's large derived state.
  const cancelEdit = () => {
    if (editing) openProduct(editing);
    else closeBuilder();
  };

  const submit = async (statusOverride) => {
    const finalPayload = statusOverride ? { ...payload, status: statusOverride } : payload;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!finalPayload.name.trim()) throw new Error('Product name is required');
      if (finalPayload.productType === 'VARIABLE' && !finalPayload.variants.length) throw new Error('Generate at least one variant');
      if (editing) await catalogApi.products.update(editing.id, finalPayload);
      else await catalogApi.products.create(finalPayload);
      setNotice(editing ? 'Product updated.' : 'Product created.');
      closeBuilder();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save product');
    } finally {
      setSaving(false);
    }
  };

  const duplicateProduct = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      // SKUs are unique per variant — a copy must not reuse the source SKU(s).
      const suffix = `-COPY-${Date.now().toString(36).toUpperCase()}`;
      const duplicatePayload =
        payload.productType === 'SIMPLE'
          ? { ...payload, variant: { ...payload.variant, sku: `${payload.variant.sku || 'SKU'}${suffix}` } }
          : { ...payload, variants: payload.variants.map((variant) => ({ ...variant, sku: `${variant.sku || 'SKU'}${suffix}` })) };
      await catalogApi.products.create({ ...duplicatePayload, name: `${payload.name} (Copy)`, status: 'DRAFT' });
      setNotice('Product duplicated as a new draft.');
      closeBuilder();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to duplicate product');
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await catalogApi.products.remove(editing.id);
      setNotice('Draft deleted.');
      closeBuilder();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete draft');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (event, product) => {
    event.stopPropagation();
    setSaving(true);
    setError('');
    try {
      await catalogApi.products.remove(product.id);
      setNotice('Product deleted.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete product');
    } finally {
      setSaving(false);
    }
  };

  const renderCreateButton = () => (
    <Button type="button" onClick={startCreate} disabled={!canCreate} title={!canCreate ? "You don't have permission to create products" : undefined}>
      <Plus size={16} /> Create Product
    </Button>
  );

  const fieldsDisabled = editing ? !isEditing : false;

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="Catalog / Products"
        icon={PackagePlus}
        title={view === 'list' ? 'Products' : editing ? 'Update product' : 'Create product'}
        description={
          view === 'list'
            ? 'Manage product records, inventory signals, variants, and storefront visibility.'
            : 'Add product details, media, pricing, inventory, organization, and optional variants in one flow.'
        }
        meta={view === 'builder' ? (effectiveProductType === 'VARIABLE' ? `${effectiveVariantDrafts.length} variants` : 'Simple product') : `${filteredProducts.length} visible`}
        actions={(
          <>
          {view === 'builder' ? (
            <Button type="button" variant="secondary" onClick={closeBuilder}>
              <ArrowLeft size={16} /> Product List
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={load} title="Refresh workspace">
            <RefreshCw size={16} /> Refresh
          </Button>
          {view === 'list' ? renderCreateButton() : editing && !isEditing ? (
            <Button type="button" onClick={startEdit} disabled={!canEdit} title={!canEdit ? "You don't have permission to edit products" : undefined}>
              <Edit3 size={16} /> Edit
            </Button>
          ) : (
            <>
              {editing ? <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>Cancel</Button> : null}
              <Button type="button" onClick={() => submit()} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving' : editing ? 'Save Product' : 'Create Product'}
              </Button>
            </>
          )}
          </>
        )}
      />

      {view === 'builder' && editing && !canEdit ? <div className={styles.notice}>You have read-only access to products.</div> : null}

      {error ? <div className={styles.alert}>{error}</div> : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      {view === 'list' ? (
        <main className={styles.listShell}>
          <section className={styles.listSummary}>
            <div><span>Total products</span><strong>{metrics.total}</strong></div>
            <div><span>Active</span><strong>{metrics.active}</strong></div>
            <div><span>Draft</span><strong>{metrics.draft}</strong></div>
            <div><span>Variable</span><strong>{metrics.variable}</strong></div>
          </section>

          <div className={styles.listToolbar}>
            <select className={styles.scopeSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <div className={styles.searchBox}>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search and filter" />
            </div>
            <select className={styles.typeSelect} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="ALL">All types</option>
              <option value="SIMPLE">Simple</option>
              <option value="VARIABLE">Variable</option>
            </select>
          </div>

          <section className={styles.productTable}>
            <div className={styles.productTableHead}>
              <span className={styles.checkboxCell}><input type="checkbox" aria-label="Select all products" /></span>
              <span>Product</span>
              <span>Status</span>
              <span>Inventory</span>
              <span>Category</span>
              <span>Channels</span>
              <span>Product type</span>
              <span>Vendor</span>
            </div>
            {loading ? <div className={styles.emptyState}>Loading products...</div> : null}
            {!loading && filteredProducts.length === 0 ? <div className={styles.emptyState}>No products found.</div> : null}
            {filteredProducts.map((product) => {
              const variants = product.variants || [];
              const variantCount = variants.length || 1;
              const stockQuantity = variants.reduce((total, item) => total + (Number(item.stockQuantity) || 0), 0);
              const categoryName = product.categories?.[0]?.name || 'Uncategorized';
              const vendorName = product.vendor || product.brand?.name || 'No vendor';
              const productTypeLabel = product.merchandiseType || (product.productType === 'VARIABLE' ? 'Variable' : 'Simple');
              const inventoryLow = stockQuantity > 0 && stockQuantity < 10;
              return (
                <article
                  key={product.id}
                  className={styles.productTableRow}
                  role="button"
                  tabIndex={0}
                  aria-disabled={opening}
                  onClick={() => {
                    if (!opening) openProduct(product);
                  }}
                  onKeyDown={(event) => {
                    if (!opening && (event.key === 'Enter' || event.key === ' ')) openProduct(product);
                  }}
                >
                  <span className={styles.checkboxCell}>
                    <input type="checkbox" aria-label={`Select ${product.name}`} onClick={(event) => event.stopPropagation()} />
                  </span>
                  <span className={styles.productIdentity}>
                    <span className={styles.thumb}>
                      {product.primaryImage ? <img src={product.primaryImage} alt="" /> : <PackagePlus size={18} />}
                    </span>
                    <span>
                      <strong>{product.name}</strong>
                      <small>{product.slug || 'No handle'}</small>
                    </span>
                  </span>
                  <span><mark className={styles[`status${product.status}`] || styles.statusDRAFT}>{product.status}</mark></span>
                  <span className={inventoryLow ? styles.inventoryLow : undefined}>
                    {stockQuantity} in stock <small>for {variantCount} {variantCount === 1 ? 'variant' : 'variants'}</small>
                  </span>
                  <span>{categoryName}</span>
                  <span className={styles.numberCell}>{variantCount}</span>
                  <span>{productTypeLabel}</span>
                  <span className={styles.vendorCell}>
                    <span>{vendorName}</span>
                    <span className={styles.rowActions}>
                      <Edit3 size={15} />
                      <button type="button" onClick={(event) => removeProduct(event, product)} title="Delete product">
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </span>
                </article>
              );
            })}
          </section>
        </main>
      ) : (
        <>
        <div className={styles.builderTop}>
          <div className={styles.formContext}>
            <span>{editing ? 'Editing product' : 'New product'}</span>
            <strong>{form.name || 'Untitled product'}</strong>
            <small>{effectiveProductType === 'VARIABLE' ? `${effectiveVariantDrafts.length} variants` : 'Simple product'} · {form.status}</small>
          </div>
        </div>

        <div className={styles.workspace}>
          <main className={styles.builder}>
          <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
            <div className={styles.panel}>
              <AppInput label="Title" required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Short sleeve t-shirt" />
            </div>

            <div className={styles.panel}>
              <AppInput label="Short Description" type="textarea" rows={2} maxLength={160} value={form.shortDescription} onChange={(event) => updateField('shortDescription', event.target.value)} placeholder="A concise storefront summary" />
              <RichTextEditor label="Description" value={form.description} onChange={(html) => updateField('description', html)} disabled={fieldsDisabled} />
            </div>

            <MediaGalleryCard
              primaryImage={form.primaryImage}
              galleryImages={form.galleryImages}
              onChange={({ primaryImage, galleryImages }) => updateFields({ primaryImage, galleryImages })}
              folder="products"
            />

            <div className={styles.panel}>
              <h2>Category</h2>
              <CategoryDropdown categories={categories} value={form.categoryIds} onChange={(ids) => updateField('categoryIds', ids)} disabled={fieldsDisabled} />
              <p className={styles.hint}>Determines where this product appears in storefront navigation and search filters.</p>
            </div>

            <div className={styles.panel}>
              <h2>{effectiveProductType === 'SIMPLE' ? 'Pricing' : 'Variant defaults - pricing'}</h2>
              <div className={styles.threeCol}>
                <AppInput label="MRP" value={form.variant.mrp} onChange={(event) => updateVariant('mrp', event.target.value)} />
                <AppInput label="Price" value={form.variant.sellingPrice} onChange={(event) => updateVariant('sellingPrice', event.target.value)} />
                <AppInput label="Compare-at price" value={form.variant.compareAtPrice} onChange={(event) => updateVariant('compareAtPrice', event.target.value)} />
              </div>
              <div className={styles.twoCol}>
                <AppInput label="Cost per item" value={form.variant.costPrice} onChange={(event) => updateVariant('costPrice', event.target.value)} />
                <div className={styles.metricInline}>
                  <span>Margin</span>
                  <strong>{money((Number(form.variant.sellingPrice) || 0) - (Number(form.variant.costPrice) || 0))}</strong>
                </div>
              </div>
            </div>

            <div className={styles.panel}>
              <h2>Inventory</h2>
              <div className={styles.switchRow}>
                <label><input type="checkbox" checked={form.variant.stockTrackingEnabled} onChange={(event) => updateVariant('stockTrackingEnabled', event.target.checked)} /> Track quantity</label>
              </div>
              <div className={styles.inventoryTable}>
                <div className={styles.inventoryHead}><span>Location</span><span>Quantity</span></div>
                <div className={styles.inventoryRow}>
                  <span>Default Location</span>
                  <AppInput value={form.variant.stockQuantity} onChange={(event) => updateVariant('stockQuantity', event.target.value)} disabled={!form.variant.stockTrackingEnabled} />
                </div>
              </div>
              <div className={styles.threeCol}>
                <AppInput label="Reserved" value={form.variant.reservedQuantity} onChange={(event) => updateVariant('reservedQuantity', event.target.value)} />
                <AppInput label="Low stock threshold" value={form.variant.lowStockThreshold} onChange={(event) => updateVariant('lowStockThreshold', event.target.value)} />
                <AppInput label="Min order qty" value={form.variant.minOrderQty} onChange={(event) => updateVariant('minOrderQty', event.target.value)} />
              </div>
              {effectiveProductType === 'SIMPLE' ? (
                <div className={styles.threeCol}>
                  <AppInput
                    label="SKU"
                    value={form.variant.sku}
                    onChange={(event) => {
                      setSkuManuallyEdited(true);
                      updateVariant('sku', event.target.value);
                    }}
                    helperText="Auto-generated from product title. Edit only if you need a custom SKU."
                  />
                  <label>
                    Barcode Type
                    <select value={form.variant.barcodeType} onChange={(event) => updateVariant('barcodeType', event.target.value)}>
                      {BARCODE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </label>
                  <AppInput label="Barcode Value" value={form.variant.barcodeValue} onChange={(event) => updateVariant('barcodeValue', event.target.value)} />
                </div>
              ) : null}
            </div>

            <div className={styles.panel}>
              <h2>Shipping</h2>
              {effectiveProductType === 'SIMPLE' ? (
                <div className={styles.fourCol}>
                  <AppInput label="Weight (kg)" value={form.variant.weight} onChange={(event) => updateVariant('weight', event.target.value)} />
                  <AppInput label="Length (cm)" value={form.variant.length} onChange={(event) => updateVariant('length', event.target.value)} />
                  <AppInput label="Width (cm)" value={form.variant.width} onChange={(event) => updateVariant('width', event.target.value)} />
                  <AppInput label="Height (cm)" value={form.variant.height} onChange={(event) => updateVariant('height', event.target.value)} />
                </div>
              ) : (
                <p className={styles.placeholderNote}>Weight and dimensions are set per variant — open a variant below and expand its Shipping section.</p>
              )}
              <div className={styles.twoCol}>
                <AppInput label="Country of Origin" value={form.countryOfOrigin} onChange={(event) => updateField('countryOfOrigin', event.target.value)} placeholder="India" />
                <TaxCategoryDropdown categories={taxCategories} value={form.taxCategoryId} onChange={selectTaxCategory} disabled={fieldsDisabled} />
              </div>
              {selectedTaxCategory ? (
                <div className={styles.taxPreview}>
                  <span className={styles.taxPreviewChip}>HS Code: <strong>{selectedTaxCategory.hsnCode}</strong></span>
                  <span className={styles.taxPreviewChip}>{selectedTaxCategory.isTaxable ? <><strong>{selectedTaxCategory.gstRate}%</strong>&nbsp;GST</> : 'Exempt'}</span>
                  {(selectedTaxCategory.rates || []).map((rate) => (
                    <span key={rate.id} className={styles.taxPreviewChip}>{rate.taxComponent} <strong>{rate.ratePercent}%</strong></span>
                  ))}
                </div>
              ) : (
                <p className={styles.taxPreviewEmpty}>No tax category selected — this product will be treated as untaxed until one is chosen.</p>
              )}
            </div>

            <div className={styles.panel}>
              <div className={styles.sectionTitleRow}>
                <div>
                  <h2>Variants</h2>
                  <p>Add product options from your attribute list. Selecting values generates every variant combination automatically.</p>
                </div>
                <div className={styles.variantActions}>
                  <div className={styles.optionPicker}>
                    <button type="button" className={styles.addOptionButton} onClick={() => setVariantOptionMenuOpen((current) => !current)}>
                      <Plus size={15} /> Add option
                    </button>
                    {variantOptionMenuOpen ? (
                      <div className={styles.optionMenu}>
                        <div className={styles.optionSearch}>
                          <Search size={14} />
                          <input
                            value={variantOptionQuery}
                            onChange={(event) => setVariantOptionQuery(event.target.value)}
                            placeholder="Search attributes"
                            autoFocus
                          />
                        </div>
                        <div className={styles.optionMenuList}>
                          {loading && !attributes.length ? <div className={styles.optionEmpty}>Loading attributes...</div> : null}
                          {!loading && availableOptionAttributes.length ? availableOptionAttributes.map((attribute) => (
                            <button key={attribute.id} type="button" onClick={() => addVariantOption(attribute.id)}>
                              <strong>{attribute.displayName || attribute.name}</strong>
                              <span>{(attribute.values || []).length} values</span>
                            </button>
                          )) : null}
                          {!loading && !availableOptionAttributes.length ? <div className={styles.optionEmpty}>No attributes available.</div> : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={generateVariants} disabled={!selectedAttributeGroups.length}>
                    <Sparkles size={15} /> Refresh variants
                  </Button>
                </div>
              </div>

              <div className={styles.variantOptionList}>
                {selectedOptionAttributes.length ? selectedOptionAttributes.map((attribute) => (
                  <div key={attribute.id} className={styles.variantOptionCard}>
                    <div className={styles.variantOptionHeader}>
                      <div>
                        <strong>{attribute.displayName || attribute.name}</strong>
                        <span>{selectedAttributes[attribute.id]?.length || 0} selected</span>
                      </div>
                      <button type="button" onClick={() => removeVariantOption(attribute.id)} title={`Remove ${attribute.displayName || attribute.name}`}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className={styles.variantValueGrid}>
                      {(attribute.values || []).length ? (attribute.values || []).map((value) => (
                        <button key={value.id} type="button" className={selectedAttributes[attribute.id]?.includes(value.id) ? styles.chipActive : styles.chip} onClick={() => toggleAttributeValue(attribute.id, value.id)}>
                          {value.displayValue || value.value}
                        </button>
                      )) : <span className={styles.optionEmpty}>No values found for this attribute.</span>}
                    </div>
                  </div>
                )) : (
                  <div className={styles.variantEmptyState}>
                    <strong>No variant options yet</strong>
                    <span>Click Add option and choose attributes like size, color, or material.</span>
                  </div>
                )}
              </div>

              {effectiveProductType === 'SIMPLE' ? (
                <div className={styles.defaultVariantCard}>
                  <div>
                    <strong>Default variant media & status</strong>
                    <span>This product stays simple until option values are selected.</span>
                  </div>
                  <div className={styles.twoCol}>
                    <MultiImageUploadField label="Variant Images" value={form.variant.imageUrls} onChange={(list) => updateVariant('imageUrls', list)} folder="products" />
                    <label>
                      Variant Status
                      <select value={form.variant.status} onChange={(event) => updateVariant('status', event.target.value)}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="DRAFT">Draft</option>
                      </select>
                    </label>
                  </div>
                </div>
              ) : null}

              <div className={styles.variantTable}>
                {effectiveVariantDrafts.length ? effectiveVariantDrafts.map((variant) => {
                  const isVariantOpen = openVariantKeys.has(variant.key);
                  return (
                  <div key={variant.key} className={styles.variantEditor}>
                    <div className={styles.variantCardHeader}>
                      <div className={styles.variantTitleGroup}>
                        <input value={variant.variantName} onChange={(event) => updateVariantDraft(variant.key, 'variantName', event.target.value)} aria-label="Variant name" />
                        <span>{variant.attributeValueIds?.length ? `${variant.attributeValueIds.length} option values` : 'Custom variant'}</span>
                      </div>
                      <label className={styles.variantStatusControl}>
                        <span>Status</span>
                        <select value={variant.status || 'ACTIVE'} onChange={(event) => updateVariantDraft(variant.key, 'status', event.target.value)}>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="DRAFT">Draft</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className={styles.variantToggleBtn}
                        onClick={() => toggleVariantOpen(variant.key)}
                        aria-expanded={isVariantOpen}
                        aria-label={isVariantOpen ? 'Collapse variant' : 'Open variant'}
                        title={isVariantOpen ? 'Collapse variant' : 'Open variant'}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button type="button" className={styles.variantRemoveBtn} onClick={() => removeVariantDraft(variant.key)} title="Remove variant"><X size={15} /></button>
                    </div>

                    <div className={styles.variantQuickGrid}>
                      <AppInput label="SKU" value={variant.sku} onChange={(event) => updateVariantDraft(variant.key, 'sku', event.target.value)} />
                      <AppInput label="MRP" value={variant.mrp} onChange={(event) => updateVariantDraft(variant.key, 'mrp', event.target.value)} />
                      <AppInput label="Selling price" value={variant.sellingPrice} onChange={(event) => updateVariantDraft(variant.key, 'sellingPrice', event.target.value)} />
                      <AppInput label="Stock" value={variant.stockQuantity} onChange={(event) => updateVariantDraft(variant.key, 'stockQuantity', event.target.value)} />
                    </div>

                    {isVariantOpen ? (
                    <div className={styles.variantDetails}>
                      <section className={`${styles.variantMetaSection} ${styles.variantMediaSection}`}>
                        <h3>Media & barcode</h3>
                        <MultiImageUploadField label="Variant Images" value={variant.imageUrls || ''} onChange={(list) => updateVariantDraft(variant.key, 'imageUrls', list)} folder="products" />
                        <div className={styles.variantSectionGrid}>
                          <label>
                            Barcode Type
                            <select value={variant.barcodeType || 'EAN'} onChange={(event) => updateVariantDraft(variant.key, 'barcodeType', event.target.value)}>
                              {BARCODE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                          </label>
                          <AppInput label="Barcode Value" value={variant.barcodeValue || ''} onChange={(event) => updateVariantDraft(variant.key, 'barcodeValue', event.target.value)} />
                        </div>
                      </section>

                      <section className={`${styles.variantMetaSection} ${styles.variantPricingSection}`}>
                        <h3>Pricing</h3>
                        <div className={styles.variantSectionGrid}>
                          <AppInput label="Cost" value={variant.costPrice || ''} onChange={(event) => updateVariantDraft(variant.key, 'costPrice', event.target.value)} />
                          <AppInput label="Compare at" value={variant.compareAtPrice || ''} onChange={(event) => updateVariantDraft(variant.key, 'compareAtPrice', event.target.value)} />
                        </div>
                      </section>

                      <section className={`${styles.variantMetaSection} ${styles.variantInventorySection}`}>
                        <h3>Inventory</h3>
                        <div className={styles.variantSectionGrid}>
                          <AppInput label="Reserved" value={variant.reservedQuantity || ''} onChange={(event) => updateVariantDraft(variant.key, 'reservedQuantity', event.target.value)} />
                          <AppInput label="Low stock" value={variant.lowStockThreshold || ''} onChange={(event) => updateVariantDraft(variant.key, 'lowStockThreshold', event.target.value)} />
                          <AppInput label="Min qty" value={variant.minOrderQty || ''} onChange={(event) => updateVariantDraft(variant.key, 'minOrderQty', event.target.value)} />
                          <AppInput label="Max qty" value={variant.maxOrderQty || ''} onChange={(event) => updateVariantDraft(variant.key, 'maxOrderQty', event.target.value)} />
                        </div>
                        <div className={styles.variantChecks}>
                          <label className={styles.inlineCheck}><input type="checkbox" checked={variant.stockTrackingEnabled ?? true} onChange={(event) => updateVariantDraft(variant.key, 'stockTrackingEnabled', event.target.checked)} /> Track inventory</label>
                          <label className={styles.inlineCheck}><input type="checkbox" checked={Boolean(variant.isDefault)} onChange={() => {
                            setVariantDraftsTouched(true);
                            setVariantDrafts((current) => {
                              const source = current.length ? current : effectiveVariantDrafts;
                              return source.map((item) => ({ ...item, isDefault: item.key === variant.key }));
                            });
                          }} /> Default SKU</label>
                        </div>
                      </section>

                      <section className={`${styles.variantMetaSection} ${styles.variantShippingSection}`}>
                        <h3>Shipping</h3>
                        <div className={styles.variantSectionGrid}>
                          <AppInput label="Weight" value={variant.weight || ''} onChange={(event) => updateVariantDraft(variant.key, 'weight', event.target.value)} />
                          <AppInput label="Length" value={variant.length || ''} onChange={(event) => updateVariantDraft(variant.key, 'length', event.target.value)} />
                          <AppInput label="Width" value={variant.width || ''} onChange={(event) => updateVariantDraft(variant.key, 'width', event.target.value)} />
                          <AppInput label="Height" value={variant.height || ''} onChange={(event) => updateVariantDraft(variant.key, 'height', event.target.value)} />
                        </div>
                      </section>
                    </div>
                    ) : null}
                  </div>
                  );
                }) : <div className={styles.emptyState}>{selectedOptionAttributes.length ? 'Select values above to generate variants.' : 'No options selected. This will stay a simple product.'}</div>}
              </div>
            </div>

            <div className={styles.panel}>
              <h2>Marketplace Details</h2>
              <div className={styles.threeCol}>
                <AppInput label="Model No" value={form.modalNo} onChange={(event) => updateField('modalNo', event.target.value)} />
                <AppInput label="Item Type" value={form.itemType} onChange={(event) => updateField('itemType', event.target.value)} placeholder="T-shirt" />
                <AppInput label="Item No" value={form.itemNo} onChange={(event) => updateField('itemNo', event.target.value)} />
              </div>
              <div className={styles.threeCol}>
                <AppInput label="Size" value={form.size} onChange={(event) => updateField('size', event.target.value)} />
                <AppInput label="Unit Count" value={form.unitCount} onChange={(event) => updateField('unitCount', event.target.value)} />
                <AppInput label="Identification Type" value={form.identificationType} onChange={(event) => updateField('identificationType', event.target.value)} />
              </div>
              <div className={styles.twoCol}>
                <AppInput label="Highlights" value={form.itemHighlight} onChange={(event) => updateField('itemHighlight', event.target.value)} placeholder="Comma separated highlights" />
                <AppInput label="Bullet Points" value={form.bulletPoints} onChange={(event) => updateField('bulletPoints', event.target.value)} placeholder="Comma separated bullet points" />
              </div>
              <div className={styles.twoCol}>
                <AppInput label="Material" value={form.material} onChange={(event) => updateField('material', event.target.value)} placeholder="Cotton, denim, polyester" />
                <AppInput label="Item Form" value={form.itemForm} onChange={(event) => updateField('itemForm', event.target.value)} placeholder="Regular fit, slim fit" />
              </div>
              <AppInput label="Generic Keywords" value={form.genericKeywords} onChange={(event) => updateField('genericKeywords', event.target.value)} placeholder="Search keyword pack for marketplace discovery" />
              <div className={styles.switchRow}>
                <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => updateField('isFeatured', event.target.checked)} /> Featured</label>
                <label><input type="checkbox" checked={form.isReturnable} onChange={(event) => updateField('isReturnable', event.target.checked)} /> Returnable</label>
                <label><input type="checkbox" checked={form.isCodAllowed} onChange={(event) => updateField('isCodAllowed', event.target.checked)} /> COD</label>
              </div>
            </div>

            <div className={styles.panel}>
              <h2>SEO & Sharing</h2>
              <div className={styles.twoCol}>
                <AppInput label="Meta Title" value={form.metaTitle} onChange={(event) => updateField('metaTitle', event.target.value)} placeholder="Search title" />
                <AppInput label="OG Title" value={form.ogTitle} onChange={(event) => updateField('ogTitle', event.target.value)} placeholder="Social share title" />
              </div>
              <AppInput label="Meta Description" type="textarea" rows={3} maxLength={160} value={form.metaDescription} onChange={(event) => updateField('metaDescription', event.target.value)} placeholder="Search result description" />
              <div className={styles.twoCol}>
                <ImageUploadField label="OG Image" value={form.ogImage} onChange={(url) => updateField('ogImage', url)} folder="products" placeholder="Defaults to primary image" />
                <AppInput label="Canonical URL" value={form.canonicalUrl} onChange={(event) => updateField('canonicalUrl', event.target.value)} placeholder="https://..." />
              </div>
            </div>
          </fieldset>
          </main>

          <aside className={styles.preview}>
            <section className={styles.sideCard}>
              <h2>Status</h2>
              <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </fieldset>
            </section>

            <section className={styles.sideCard}>
              <h2>Publishing</h2>
              <p className={styles.placeholderNote}>Not applicable for a headless storefront — this product is available via the storefront API as soon as it's Active.</p>
            </section>

            <section className={styles.sideCard}>
              <h2>Product organization</h2>
              <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
                <AppInput label="Type" value={form.merchandiseType} onChange={(event) => updateField('merchandiseType', event.target.value)} placeholder="e.g. T-Shirt" />
                <AppInput label="Vendor" value={form.vendor} onChange={(event) => updateField('vendor', event.target.value)} placeholder="e.g. Corcotton" />
                <label>
                  Brand
                  <select value={form.brandId} onChange={(event) => updateField('brandId', event.target.value)}>
                    <option value="">No brand</option>
                    {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                </label>
                <div className={styles.placeholderRow}>
                  <span>Collections</span>
                  <button type="button" disabled title="Manage collection membership from the Collections page for now">+ Add collections</button>
                </div>
                <TagsInput
                  label="Tags"
                  value={form.tags}
                  onChange={(value) => updateField('tags', value)}
                  suggestions={tagSuggestions}
                  disabled={fieldsDisabled}
                  onCreateTag={createTagFromProduct}
                />
              </fieldset>
            </section>

            <LivePreviewCard
              name={form.name}
              brandName={productPreview.selectedBrand?.name}
              categoryName={productPreview.selectedCategories?.[0]?.name}
              shortDescription={form.shortDescription}
              primaryImage={form.primaryImage}
              status={form.status}
              productType={effectiveProductType}
              sellingPrice={productPreview.defaultVariant?.sellingPrice}
              compareAtPrice={productPreview.defaultVariant?.compareAtPrice}
              stockQuantity={productPreview.defaultVariant?.stockQuantity}
              variantCount={effectiveProductType === 'VARIABLE' ? effectiveVariantDrafts.length : 1}
            />

            <ReadinessCard items={readinessItems} />

            <QuickActionsCard
              saving={saving}
              canPreview={Boolean(editing?.slug)}
              canDuplicate={Boolean(editing)}
              canDelete={Boolean(editing) && form.status === 'DRAFT'}
              onSaveDraft={() => submit('DRAFT')}
              onPreviewStore={() => editing?.slug && window.open(`${storefrontUrl}/products/${editing.slug}`, '_blank', 'noopener')}
              onDuplicate={duplicateProduct}
              onDeleteDraft={deleteDraft}
            />

            <details className={styles.payloadPreview}>
              <summary><Copy size={15} /> Payload</summary>
              <pre>{JSON.stringify(payload, null, 2)}</pre>
            </details>
          </aside>
        </div>
        </>
      )}
    </section>
  );
}

export default ProductStudio;
