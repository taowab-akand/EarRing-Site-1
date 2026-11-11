export type Category = { id: number; name: string; display_order: number };
export type Product = {
  id: string;
  category_id: number;
  name: string;
  sku: string;
  description: string;
  price: number;
  sale_price: number | null;
  material: string;
  color: string;
  dimensions: string;
  stock: number;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  bestseller: boolean;
  images: string[];
  created_at: string;
};
export type Settings = Record<string, string>;
export const defaults: Settings = {
  store_name: "EarRing",
  hero_headline: "Little details. Beautiful moments.",
  hero_description:
    "Thoughtfully chosen earrings, for the everyday and the unforgettable.",
  announcement: "A little something, just for you.",
  inside_dhaka: "80",
  outside_dhaka: "130",
  shipping_policy: "Delivery times are confirmed after your order is reviewed.",
  return_policy:
    "Please contact us about returns or exchanges before sending an item back.",
};
export const price = (p: Product) => p.sale_price ?? p.price;
export const money = (n: number) => `৳${Number(n).toLocaleString("en-BD")}`;
