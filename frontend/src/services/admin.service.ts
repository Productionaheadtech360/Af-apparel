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
    return apiClient.get<ProductDetail[]>(`/admin/products${qs ? `?${qs}` : ""}`);
  },

  async createProduct(data: object) {
    return apiClient.post<ProductDetail>("/admin/products", data);
  },

  async updateProduct(id: string, data: object) {
    return apiClient.patch<ProductDetail>(`/admin/products/${id}`, data);
  },

  async uploadImage(productId: string, file: File, altText?: string) {
    const form = new FormData();
    form.append("file", file);
    if (altText) form.append("alt_text", altText);
    return apiClient.postForm(`/admin/products/${productId}/images`, form);
  },

  async reorderImages(productId: string, imageIds: string[]) {
    return apiClient.patch(`/admin/products/${productId}/images/reorder`, imageIds);
  },

  async bulkGenerateVariants(productId: string, data: object) {
    return apiClient.post(`/admin/products/${productId}/variants/bulk-generate`, data);
  },

  async updateVariant(productId: string, variantId: string, data: object) {
    return apiClient.patch(`/admin/products/${productId}/variants/${variantId}`, data);
  },

  async bulkAction(ids: string[], action: string) {
    return apiClient.post("/admin/products/bulk-action", { ids, action });
  },

  async importProductsCsv(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiClient.postForm("/admin/products/import-csv", form);
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
    return apiClient.get(`/admin/inventory${qs ? `?${qs}` : ""}`);
  },

  async adjustStock(data: {
    variant_id: string;
    warehouse_id: string;
    quantity_delta: number;
    reason: string;
    notes?: string;
  }) {
    return apiClient.post("/admin/inventory/adjust", data);
  },

  async listWarehouses() {
    return apiClient.get("/admin/warehouses");
  },

  async createWarehouse(data: { name: string; code: string; address?: string }) {
    return apiClient.post("/admin/warehouses", data);
  },

  // Pricing / Shipping tiers (read-only for selects)
  async listPricingTiers() {
    return apiClient.get("/admin/pricing-tiers");
  },

  async listShippingTiers() {
    return apiClient.get("/admin/shipping-tiers");
  },

  // Companies
  async listCompanies(params?: { q?: string; status?: string; page?: number; page_size?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return apiClient.get(`/admin/companies${qs ? `?${qs}` : ""}`);
  },

  async getCompany(id: string) {
    return apiClient.get(`/admin/companies/${id}`);
  },

  async updateCompany(id: string, data: object) {
    return apiClient.patch(`/admin/companies/${id}`, data);
  },

  async suspendCompany(id: string, reason: string) {
    return apiClient.post(`/admin/companies/${id}/suspend`, { reason });
  },

  async reactivateCompany(id: string) {
    return apiClient.post(`/admin/companies/${id}/reactivate`, {});
  },

  // Wholesale applications
  async listApplications(status?: string) {
    const qs = status ? `?status=${status}` : "";
    return apiClient.get(`/admin/wholesale-applications${qs}`);
  },

  async approveApplication(
    id: string,
    data: { pricing_tier_id: string; shipping_tier_id: string; notes?: string }
  ) {
    return apiClient.post(`/admin/wholesale-applications/${id}/approve`, data);
  },

  async rejectApplication(id: string, reason: string) {
    return apiClient.post(`/admin/wholesale-applications/${id}/reject`, { reason });
  },

  // Orders
  async listOrders(params?: { q?: string; status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return apiClient.get(`/admin/orders${qs ? `?${qs}` : ""}`);
  },

  async getOrder(id: string) {
    return apiClient.get(`/admin/orders/${id}`);
  },

  async updateOrder(id: string, data: object) {
    return apiClient.patch(`/admin/orders/${id}`, data);
  },

  async cancelOrder(id: string, reason: string) {
    return apiClient.post(`/admin/orders/${id}/cancel`, { reason });
  },

  async syncOrderToQb(id: string) {
    return apiClient.post(`/admin/orders/${id}/sync-quickbooks`, {});
  },

  // Email templates
  async listEmailTemplates() {
    return apiClient.get("/admin/email-templates");
  },

  async getEmailTemplate(id: string) {
    return apiClient.get(`/admin/email-templates/${id}`);
  },

  async updateEmailTemplate(id: string, data: object) {
    return apiClient.patch(`/admin/email-templates/${id}`, data);
  },

  async previewEmailTemplate(id: string, variables: object) {
    return apiClient.post(`/admin/email-templates/${id}/preview`, { variables });
  },

  // Settings
  async getSettings() {
    return apiClient.get("/admin/settings");
  },

  async updateSettings(data: object) {
    return apiClient.patch("/admin/settings", data);
  },

  // Reports
  async getSalesReport(params?: { from?: string; to?: string; group_by?: string }) {
    const query = new URLSearchParams(params as Record<string, string>);
    return apiClient.get(`/admin/reports/sales?${query.toString()}`);
  },

  async getInventoryReport() {
    return apiClient.get("/admin/reports/inventory");
  },

  async getCustomerReport(params?: { from?: string; to?: string }) {
    const query = new URLSearchParams(params as Record<string, string>);
    return apiClient.get(`/admin/reports/customers?${query.toString()}`);
  },

  // QB
  async getQbStatus() {
    return apiClient.get("/admin/quickbooks/status");
  },

  async retryQbSync(logId: string) {
    return apiClient.post(`/admin/quickbooks/retry/${logId}`, {});
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
    return apiClient.get(`/admin/audit-log?${query.toString()}`);
  },

  // RMA
  async listRmas(status?: string) {
    const qs = status ? `?status=${status}` : "";
    return apiClient.get(`/admin/rma${qs}`);
  },

  async updateRma(id: string, data: { status: string; notes?: string }) {
    return apiClient.patch(`/admin/rma/${id}`, data);
  },
};
