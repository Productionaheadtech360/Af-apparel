import { apiClient } from "@/lib/api-client";
import type { Cart } from "@/types/order.types";

export interface MatrixItem {
  variant_id: string;
  quantity: number;
}

export const cartService = {
  async getCart(): Promise<Cart> {
    return apiClient.get<Cart>("/cart");
  },

  async addMatrix(product_id: string, items: MatrixItem[]): Promise<Cart> {
    return apiClient.post<Cart>("/cart/add-matrix", { product_id, items });
  },

  async updateItem(item_id: string, quantity: number): Promise<Cart> {
    return apiClient.patch<Cart>(`/cart/items/${item_id}`, { quantity });
  },

  async removeItem(item_id: string): Promise<Cart> {
    return apiClient.delete<Cart>(`/cart/items/${item_id}`);
  },

  async saveTemplate(name: string): Promise<{ id: string; name: string }> {
    return apiClient.post("/cart/save-template", { name });
  },

  async quickOrder(items: { sku: string; quantity: number }[]) {
    return apiClient.post("/cart/quick-order", { items });
  },
};
