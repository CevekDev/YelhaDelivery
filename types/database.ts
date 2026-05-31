// =====================================================================
// Types Supabase générés à la main (à régénérer avec `supabase gen types typescript`
// une fois le projet Supabase connecté en CLI).
// =====================================================================

export type UserRole = 'admin' | 'restaurateur' | 'livreur';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'assigned'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type RestaurantStatus = 'active' | 'suspended' | 'pending';

export interface Profile {
  id: string;
  role: UserRole;
  restaurant_id: string | null;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  banner_text: string | null;
  banner_image_url: string | null;
  free_delivery_above: number | null;
  is_open: boolean;
  accept_orders: boolean;
  delivery_fee: number;
  min_order: number;
  estimated_delivery_time: number;
  status: RestaurantStatus;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  is_extra: boolean;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  restaurant_id: string;
  driver_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: OrderStatus;
  payment_method: 'cash';
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  item_price: number;
  quantity: number;
  subtotal: number;
}

export interface Notification {
  id: string;
  restaurant_id: string | null;
  user_id: string | null;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  created_at: string;
}
