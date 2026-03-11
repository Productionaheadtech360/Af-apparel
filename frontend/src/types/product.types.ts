/** Product category (tree node). */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  children?: Category[];
}

/** Product image with multiple sizes. */
export interface ProductImage {
  id: string;
  url_thumbnail: string;  // 150px
  url_medium: string;     // 400px
  url_large: string;      // 800px
  url_webp_thumbnail: string | null;
  url_webp_medium: string | null;
  url_webp_large: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
}

/** Product variant (SKU, color, size). */
export interface ProductVariant {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  retail_price: number;
  effective_price: number;  // Tier-adjusted price
  status: "active" | "discontinued" | "out_of_stock";
  stock_quantity: number;   // Summed across all warehouses
  sort_order: number;
}

/** Product list item (card view). */
export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  moq: number;
  primary_image: ProductImage | null;
  min_retail_price: number;
  min_effective_price: number;
  status: "draft" | "active" | "archived";
  categories: Pick<Category, "id" | "name" | "slug">[];
  variant_count: number;
}

/** Full product detail. */
export interface ProductDetail extends ProductListItem {
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  assets: ProductAsset[];
}

/** Product asset (flyer, spec sheet). */
export interface ProductAsset {
  id: string;
  asset_type: "flyer" | "spec_sheet" | "size_chart" | "other";
  url: string;
  file_name: string;
}

/** Filters for product listing. */
export interface ProductFilters {
  q?: string;
  category?: string;
  size?: string[];
  color?: string[];
  min_price?: number;
  max_price?: number;
  page?: number;
  per_page?: number;
}
