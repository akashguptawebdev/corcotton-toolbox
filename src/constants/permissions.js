// Mirrors backend/src/constants/permissions.constants.js — the `resource.action`
// registry seeded into the `permissions` table. Keep in sync manually; these keys
// are what usePermission() checks against the access token's permission set.
export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: 'dashboard.view',

  ORDER_VIEW: 'order.view',
  ORDER_UPDATE: 'order.update',
  ORDER_CANCEL: 'order.cancel',
  ORDER_REFUND: 'order.refund',
  RETURN_VIEW: 'return.view',
  CART_VIEW: 'cart.view',

  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  CATEGORY_VIEW: 'category.view',
  COLLECTION_VIEW: 'collection.view',
  BRAND_VIEW: 'brand.view',
  ATTRIBUTE_VIEW: 'attribute.view',
  TAG_VIEW: 'tag.view',
  TAX_VIEW: 'tax.view',
  REVIEW_MODERATE: 'review.moderate',

  CUSTOMER_VIEW: 'customer.view',
  CUSTOMER_BLOCK: 'customer.block',

  COUPON_VIEW: 'coupon.view',
  COUPON_CREATE: 'coupon.create',
  GIFTCARD_VIEW: 'giftcard.view',
  FLASHSALE_VIEW: 'flashsale.view',
  BANNER_VIEW: 'banner.view',
  NEWSLETTER_VIEW: 'newsletter.view',

  CMS_VIEW: 'cms.view',
  CMS_PUBLISH: 'cms.publish',
  BLOG_VIEW: 'blog.view',
  MEDIA_VIEW: 'media.view',
  MEDIA_UPLOAD: 'media.upload',
  SEO_VIEW: 'seo.view',
  NAVIGATION_VIEW: 'navigation.view',
  NAVIGATION_MANAGE: 'navigation.manage',
  MEGA_MENU_CONFIG_VIEW: 'mega_menu_config.view',
  MEGA_MENU_CONFIG_MANAGE: 'mega_menu_config.manage',

  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',

  USER_VIEW: 'user.view',
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',

  REPORT_VIEW: 'report.view',
  ANALYTICS_VIEW: 'analytics.view',
});

export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS);
