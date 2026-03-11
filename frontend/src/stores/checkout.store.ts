import { create } from "zustand";

interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface CheckoutState {
  addressId: string | null;
  shippingAddress: ShippingAddress | null;
  poNumber: string;
  orderNotes: string;
  paymentIntentId: string | null;
  clientSecret: string | null;

  setAddressId: (id: string | null) => void;
  setShippingAddress: (address: ShippingAddress | null) => void;
  setPoNumber: (po: string) => void;
  setOrderNotes: (notes: string) => void;
  setPaymentIntent: (id: string, secret: string) => void;
  reset: () => void;
}

const initialState = {
  addressId: null,
  shippingAddress: null,
  poNumber: "",
  orderNotes: "",
  paymentIntentId: null,
  clientSecret: null,
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...initialState,
  setAddressId: (id) => set({ addressId: id }),
  setShippingAddress: (address) => set({ shippingAddress: address }),
  setPoNumber: (po) => set({ poNumber: po }),
  setOrderNotes: (notes) => set({ orderNotes: notes }),
  setPaymentIntent: (id, secret) =>
    set({ paymentIntentId: id, clientSecret: secret }),
  reset: () => set(initialState),
}));
