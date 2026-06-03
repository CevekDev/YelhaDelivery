// =====================================================================
// Types Supabase — mis à jour manuellement
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

export type MenuItemType = 'dish' | 'sauce' | 'supplement' | 'offer';

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  item_type: MenuItemType;
  is_extra: boolean;
  offer_badge: string | null;
  offer_description: string | null;
  image_url: string | null;
  image_urls: string[];
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export interface MenuItemExtra {
  id: string;
  menu_item_id: string;
  extra_item_id: string;
  sort_order: number;
  is_free: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  promo_code: string | null;
  discount_amount: number;
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
  cancellation_reason: string | null;
  estimated_delivery_time: number;
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

export type PromoDiscountType = 'percent' | 'fixed_amount';

export interface PromoCode {
  id: string;
  restaurant_id: string;
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OpeningHour {
  id: string;
  restaurant_id: string;
  day_of_week: number; // 1=Lun .. 7=Dim (ISO)
  opens_at: string;   // 'HH:MM:SS'
  closes_at: string;
  is_closed: boolean;
  created_at: string;
}

export interface OrderReview {
  id: string;
  order_id: string;
  restaurant_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
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
