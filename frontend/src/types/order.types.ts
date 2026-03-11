import type { Address, UserProfile } from "./user.types";
import type { ProductVariant } from "./product.types";

/** Cart item. */
export interface CartItem {
  id: string;
  variant_id: string;
  quantity: number;
  price_at_add: number | null;
  variant: Pick<ProductVariant, "id" | "sku" | "color" | "size" | "effective_price" | "stock_quantity">;
  product_name: string;
  product_slug: string;
  primary_image_url: string | null;
  line_total: number;
  moq: number;
  moq_satisfied: boolean;
}

/** Cart with validation summary. */
export interface Cart {
  items: CartItem[];
  subtotal: number;
  estimated_shipping: number | null;
  estimated_tax: number | null;
  estimated_total: number | null;
  validation: CartValidation;
}

/** Cart validation result. */
export interface CartValidation {
  is_valid: boolean;
  moq_violations: { variant_id: string; product_name: string; required: number; actual: number }[];
  mov_violation: { required: number; actual: number } | null;
  out_of_stock: string[];
}

/** Matrix add request (variant_id → quantity). */
export interface MatrixAddRequest {
  items: { variant_id: string; quantity: number }[];
}

/** Order status values. */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

/** Payment status values. */
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded" | "failed";

/** Order list item (dashboard). */
export interface OrderListItem {
  id: string;
  order_number: string;
  po_number: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: number;
  item_count: number;
  created_at: string;
  company_name: string;
}

/** Full order detail. */
export interface OrderDetail extends OrderListItem {
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  shipping_address: Address | null;
  shipping_address_snapshot: Record<string, unknown> | null;
  tracking_number: string | null;
  carrier: string | null;
  notes: string | null;
  items: OrderItemDetail[];
  qb_sync_status: "pending" | "synced" | "failed" | "skipped";
}

/** Order line item. */
export interface OrderItemDetail {
  id: string;
  variant_id: string;
  product_name: string;
  sku: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

/** Order template. */
export interface OrderTemplate {
  id: string;
  name: string;
  item_count: number;
  created_at: string;
  items: { sku: string; quantity: number }[];
}

/** Checkout state steps. */
export type CheckoutStep = "address" | "details" | "payment" | "review";
