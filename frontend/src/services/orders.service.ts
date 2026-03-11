import { apiClient } from "@/lib/api-client";
import type { OrderDetail, OrderListItem } from "@/types/order.types";
import type { PaginatedResponse } from "@/types/api.types";

export interface CreatePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
}

export interface ConfirmOrderPayload {
  payment_intent_id: string;
  address_id?: string;
  shipping_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  po_number?: string;
  order_notes?: string;
}

export const ordersService = {
  async createPaymentIntent(): Promise<CreatePaymentIntentResponse> {
    return apiClient.post<CreatePaymentIntentResponse>("/checkout/intent", {
      cart_validated: true,
    });
  },

  async confirmOrder(payload: ConfirmOrderPayload): Promise<OrderDetail> {
    return apiClient.post<OrderDetail>("/checkout/confirm", payload);
  },

  async getOrders(page = 1): Promise<PaginatedResponse<OrderListItem>> {
    return apiClient.get<PaginatedResponse<OrderListItem>>(
      `/orders?page=${page}`
    );
  },

  async getOrder(id: string): Promise<OrderDetail> {
    return apiClient.get<OrderDetail>(`/orders/${id}`);
  },

  async reorder(orderId: string): Promise<{ added: unknown[]; skipped: unknown[] }> {
    return apiClient.post(`/orders/${orderId}/reorder`, {});
  },
};
