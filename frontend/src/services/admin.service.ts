import { apiClient } from "@/lib/api-client";
import type { ProductDetail } from "@/types/product.types";

export const adminService = {
  // Products
  async listProducts(params?: { q?: string; status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return apiClient.get<ProductDetail[]>(`/api/v1/admin/products${qs ? `?${qs}` : ""}`);
  },

  async createProduct(data: object) {
    return apiClient.post<ProductDetail>("/api/v1/admin/products", data);
  },

  async updateProduct(id: string, data: object) {
    return apiClient.patch<ProductDetail>(`/api/v1/admin/products/${id}`, data);
  },

  async uploadImage(productId: string, file: File, altText?: string) {
    const form = new FormData();
    form.append("file", file);
    if (altText) form.append("alt_text", altText);
    return apiClient.postForm(`/api/v1/admin/products/${productId}/images`, form);
  },

  async reorderImages(productId: string, imageIds: string[]) {
    return apiClient.patch(`/api/v1/admin/products/${productId}/images/reorder`, imageIds);
  },

  async bulkGenerateVariants(productId: string, data: object) {
    return apiClient.post(`/api/v1/admin/products/${productId}/variants/bulk-generate`, data);
  },

  async updateVariant(productId: string, variantId: string, data: object) {
    return apiClient.patch(`/api/v1/admin/products/${productId}/variants/${variantId}`, data);
  },

  async bulkAction(ids: string[], action: string) {
    return apiClient.post("/api/v1/admin/products/bulk-action", { ids, action });
  },

  async importProductsCsv(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiClient.postForm("/api/v1/admin/products/import-csv", form);
  },

  exportProductsCsvUrl() {
    return `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/products/export-csv`;
  },

  // Inventory
  async listInventory(params?: { low_stock_only?: boolean; variant_id?: string }) {
    const query = new URLSearchParams();
    if (params?.low_stock_only) query.set("low_stock_only", "true");
    if (params?.variant_id) query.set("variant_id", params.variant_id);
    const qs = query.toString();
    return apiClient.get(`/api/v1/admin/inventory${qs ? `?${qs}` : ""}`);
  },

  async adjustStock(data: {
    variant_id: string;
    warehouse_id: string;
    quantity_delta: number;
    reason: string;
    notes?: string;
  }) {
    return apiClient.post("/api/v1/admin/inventory/adjust", data);
  },

  async listWarehouses() {
    return apiClient.get("/api/v1/admin/warehouses");
  },

  async createWarehouse(data: { name: string; code: string; address?: string }) {
    return apiClient.post("/api/v1/admin/warehouses", data);
  },

  // Pricing / Shipping tiers (read-only for selects)
  async listPricingTiers() {
    return apiClient.get("/api/v1/admin/pricing-tiers");
  },

  async listShippingTiers() {
    return apiClient.get("/api/v1/admin/shipping-tiers");
  },

  // Companies
  async listCompanies(params?: { q?: string; status?: string; page?: number; page_size?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return apiClient.get(`/api/v1/admin/companies${qs ? `?${qs}` : ""}`);
  },

  async getCompany(id: string) {
    return apiClient.get(`/api/v1/admin/companies/${id}`);
  },

  async updateCompany(id: string, data: object) {
    return apiClient.patch(`/api/v1/admin/companies/${id}`, data);
  },

  async suspendCompany(id: string, reason: string) {
    return apiClient.post(`/api/v1/admin/companies/${id}/suspend`, { reason });
  },

  async reactivateCompany(id: string) {
    return apiClient.post(`/api/v1/admin/companies/${id}/reactivate`, {});
  },

  // Wholesale applications
  async listApplications(status?: string) {
    const qs = status ? `?status=${status}` : "";
    return apiClient.get(`/api/v1/admin/wholesale-applications${qs}`);
  },

  async approveApplication(
    id: string,
    data: { pricing_tier_id: string; shipping_tier_id: string; notes?: string }
  ) {
    return apiClient.post(`/api/v1/admin/wholesale-applications/${id}/approve`, data);
  },

  async rejectApplication(id: string, reason: string) {
    return apiClient.post(`/api/v1/admin/wholesale-applications/${id}/reject`, { reason });
  },

  // Orders
  async listOrders(params?: { q?: string; status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return apiClient.get(`/api/v1/admin/orders${qs ? `?${qs}` : ""}`);
  },

  async getOrder(id: string) {
    return apiClient.get(`/api/v1/admin/orders/${id}`);
  },

  async updateOrder(id: string, data: object) {
    return apiClient.patch(`/api/v1/admin/orders/${id}`, data);
  },

  async cancelOrder(id: string, reason: string) {
    return apiClient.post(`/api/v1/admin/orders/${id}/cancel`, { reason });
  },

  async syncOrderToQb(id: string) {
    return apiClient.post(`/api/v1/admin/orders/${id}/sync-quickbooks`, {});
  },

  // Email templates
  async listEmailTemplates() {
    return apiClient.get("/api/v1/admin/email-templates");
  },

  async getEmailTemplate(id: string) {
    return apiClient.get(`/api/v1/admin/email-templates/${id}`);
  },

  async updateEmailTemplate(id: string, data: object) {
    return apiClient.patch(`/api/v1/admin/email-templates/${id}`, data);
  },

  async previewEmailTemplate(id: string, variables: object) {
    return apiClient.post(`/api/v1/admin/email-templates/${id}/preview`, { variables });
  },

  // Settings
  async getSettings() {
    return apiClient.get("/api/v1/admin/settings");
  },

  async updateSettings(data: object) {
    return apiClient.patch("/api/v1/admin/settings", data);
  },

  // Reports
  async getSalesReport(params?: { from?: string; to?: string; group_by?: string }) {
    const query = new URLSearchParams(params as Record<string, string>);
    return apiClient.get(`/api/v1/admin/reports/sales?${query.toString()}`);
  },

  async getInventoryReport() {
    return apiClient.get("/api/v1/admin/reports/inventory");
  },

  async getCustomerReport(params?: { from?: string; to?: string }) {
    const query = new URLSearchParams(params as Record<string, string>);
    return apiClient.get(`/api/v1/admin/reports/customers?${query.toString()}`);
  },

  // QB
  async getQbStatus() {
    return apiClient.get("/api/v1/admin/quickbooks/status");
  },

  async retryQbSync(logId: string) {
    return apiClient.post(`/api/v1/admin/quickbooks/retry/${logId}`, {});
  },

  // Audit log
  async getAuditLog(params?: {
    entity_type?: string;
    entity_id?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
  }) {
    const query = new URLSearchParams(params as Record<string, string>);
    return apiClient.get(`/api/v1/admin/audit-log?${query.toString()}`);
  },

  // RMA
  async listRmas(status?: string) {
    const qs = status ? `?status=${status}` : "";
    return apiClient.get(`/api/v1/admin/rma${qs}`);
  },

  async updateRma(id: string, data: { status: string; notes?: string }) {
    return apiClient.patch(`/api/v1/admin/rma/${id}`, data);
  },
};
