import { apiClient } from "@/lib/api-client";
import type { Category, ProductDetail, ProductListItem } from "@/types/product.types";
import type { PaginatedResponse } from "@/types/api.types";

export interface ProductFilters {
  category?: string;
  size?: string;
  color?: string;
  price_min?: number;
  price_max?: number;
  q?: string;
  page?: number;
  page_size?: number;
}

export const productsService = {
  async listProducts(
    filters: ProductFilters = {}
  ): Promise<PaginatedResponse<ProductListItem>> {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.size) params.set("size", filters.size);
    if (filters.color) params.set("color", filters.color);
    if (filters.price_min !== undefined)
      params.set("price_min", String(filters.price_min));
    if (filters.price_max !== undefined)
      params.set("price_max", String(filters.price_max));
    if (filters.q) params.set("q", filters.q);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));

    const query = params.toString();
    return apiClient.get<PaginatedResponse<ProductListItem>>(
      `/products${query ? `?${query}` : ""}`
    );
  },

  async getProductBySlug(slug: string): Promise<ProductDetail> {
    return apiClient.get<ProductDetail>(`/products/${slug}`);
  },

  async getCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>("/products/categories");
  },
};
