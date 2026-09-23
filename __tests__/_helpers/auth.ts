import type { Beneficiary, BeneficiaryOrganization, Organization } from '@/types';

/** Doble del contexto de auth para las pantallas.
 *
 *  Se mockea con un getter, igual que los de UI:
 *
 *      jest.mock('@/contexts/AuthContext', () => ({
 *        useAuth: () => auth,
 *      }));
 */
export const auth = {
  session: null as unknown,
  user: null as unknown,
  beneficiary: null as Beneficiary | null,
  userOrganizations: [] as BeneficiaryOrganization[],
  allOrganizations: [] as Organization[],
  loading: false,
  organizationsLoading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  joinOrganization: jest.fn(),
  refreshOrganizations: jest.fn(),
  refreshBeneficiary: jest.fn(),
};

const initial = { ...auth };

export const beneficiary = (over: Partial<Beneficiary> = {}): Beneficiary =>
  ({
    id: '7',
    first_name: 'Ana',
    last_name: 'Diaz',
    email: 'ana@x.com',
    phone: '1155551234',
    document_id: '30111222',
    ...over,
  }) as Beneficiary;

export const organization = (over: Partial<Organization> = {}): Organization =>
  ({
    id: '9',
    name: 'Cafe Lila',
    business_name: 'Lila SRL',
    logo_url: null,
    industry: 'gastronomy',
    ...over,
  }) as Organization;

export const membership = (
  over: Partial<BeneficiaryOrganization> = {},
): BeneficiaryOrganization =>
  ({
    id: '1',
    organization_id: '9',
    beneficiary_id: '7',
    available_points: 1200,
    total_points_earned: 2000,
    total_points_redeemed: 800,
    is_active: true,
    joined_date: '2026-01-15',
    organization: organization(),
    ...over,
  }) as BeneficiaryOrganization;

/** Vuelve el doble a su estado inicial (mas lo que le pase el test). */
export const resetAuth = (over: Partial<typeof auth> = {}) => {
  Object.assign(auth, initial, {
    signIn: jest.fn().mockResolvedValue({ error: null }),
    signUp: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue(undefined),
    joinOrganization: jest.fn().mockResolvedValue({ error: null }),
    refreshOrganizations: jest.fn().mockResolvedValue(undefined),
    refreshBeneficiary: jest.fn().mockResolvedValue(undefined),
    userOrganizations: [],
    allOrganizations: [],
    ...over,
  });
};
