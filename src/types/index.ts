export type Organization = {
  id: string;
  name: string;
  business_name?: string | null;
  tax_id?: string | null;
  public_info?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  industry?: string | null;
  logo_url?: string | null;
  creation_date: string;
};

export type BeneficiaryOrganization = {
  id: string;
  beneficiary_id: string;
  organization_id: string;
  available_points: number;
  total_points_earned: number;
  total_points_redeemed: number;
  joined_date: string;
  is_active: boolean;
  is_hidden: boolean;
  organization?: Organization;
};

export type Beneficiary = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document_id: string | null;
  available_points: number;
  role_id: string | null;
  auth_user_id: string | null;
  address_id: string | null;
};

export type Address = {
  id: string;
  street: string;
  number: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string | null;
  place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  required_points: number;
  creation_date: string;
  image_urls?: string[] | null;
  stock: number;
  category?: Category;
};

export type RedemptionStatus = 'pending' | 'delivered' | 'cancelled';

export type Redemption = {
  id: string;
  beneficiary_id: string;
  product_id: string | null;
  organization_id: string;
  points_redeemed: number;
  status: RedemptionStatus;
  redeemed_by: string | null;
  redeemed_at: string;
  product?: Product;
};
