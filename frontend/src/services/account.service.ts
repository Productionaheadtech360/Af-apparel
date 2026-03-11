import { apiClient } from "@/lib/api-client";

export const accountService = {
  // Profile
  async getProfile() {
    return apiClient.get("/account/profile");
  },
  async updateProfile(data: { first_name?: string; last_name?: string; phone?: string }) {
    return apiClient.patch("/account/profile", data);
  },
  async changePassword(current_password: string, new_password: string) {
    return apiClient.patch("/account/change-password", { current_password, new_password });
  },

  // Users
  async getUsers() {
    return apiClient.get("/account/users");
  },
  async inviteUser(data: { email: string; first_name: string; last_name: string; role?: string }) {
    return apiClient.post("/account/users/invite", data);
  },
  async updateUserRole(userId: string, role: string) {
    return apiClient.patch(`/account/users/${userId}`, { role });
  },
  async removeUser(userId: string) {
    return apiClient.delete(`/account/users/${userId}`);
  },

  // Contacts
  async getContacts() {
    return apiClient.get("/account/contacts");
  },
  async createContact(data: object) {
    return apiClient.post("/account/contacts", data);
  },
  async updateContact(id: string, data: object) {
    return apiClient.patch(`/account/contacts/${id}`, data);
  },
  async deleteContact(id: string) {
    return apiClient.delete(`/account/contacts/${id}`);
  },

  // Addresses
  async getAddresses() {
    return apiClient.get("/account/addresses");
  },
  async createAddress(data: object) {
    return apiClient.post("/account/addresses", data);
  },
  async updateAddress(id: string, data: object) {
    return apiClient.patch(`/account/addresses/${id}`, data);
  },
  async deleteAddress(id: string) {
    return apiClient.delete(`/account/addresses/${id}`);
  },

  // Payment methods
  async getPaymentMethods() {
    return apiClient.get("/account/payment-methods");
  },
  async deletePaymentMethod(id: string) {
    return apiClient.delete(`/account/payment-methods/${id}`);
  },

  // Messages
  async getMessages() {
    return apiClient.get("/account/messages");
  },
  async sendMessage(data: { subject: string; body: string; parent_id?: string }) {
    return apiClient.post("/account/messages", data);
  },

  // Orders
  async getOrders(params?: { q?: string; status?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    const q = qs.toString();
    return apiClient.get(`/orders${q ? `?${q}` : ""}`);
  },
  async getOrder(id: string) {
    return apiClient.get(`/orders/${id}`);
  },
  async reorder(id: string) {
    return apiClient.post(`/orders/${id}/reorder`, {});
  },

  // Price list
  async requestPriceList(format: "pdf" | "excel" = "pdf") {
    return apiClient.post(`/account/price-list?format=${format}`, {});
  },
  async getPriceListStatus(requestId: string) {
    return apiClient.get(`/account/price-list/${requestId}`);
  },

  // Templates
  async getTemplates() {
    return apiClient.get("/account/templates");
  },
  async deleteTemplate(id: string) {
    return apiClient.delete(`/account/templates/${id}`);
  },
  async loadTemplate(id: string) {
    return apiClient.post(`/account/templates/${id}/load`, {});
  },

  // RMA
  async getRmas() {
    return apiClient.get("/account/rma");
  },
  async getRma(id: string) {
    return apiClient.get(`/account/rma/${id}`);
  },
  async createRma(data: {
    order_id: string;
    reason: string;
    items: { order_item_id: string; quantity: number; reason: string }[];
  }) {
    return apiClient.post("/account/rma", data);
  },

  // Inventory report
  async getInventoryReport(params?: { q?: string; stock_level?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.stock_level) qs.set("stock_level", params.stock_level);
    if (params?.page) qs.set("page", String(params.page));
    const q = qs.toString();
    return apiClient.get(`/account/inventory-report${q ? `?${q}` : ""}`);
  },
};
