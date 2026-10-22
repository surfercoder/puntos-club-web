import { render, screen } from '@testing-library/react';
import React from 'react';

import { auth, membership, organization, resetAuth } from '../../../_helpers/auth';

let params: { id?: string } = { id: '9' };
jest.mock('next/navigation', () => ({ useParams: () => params }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import OrganizationLayout from '@/app/(app)/organization/[id]/layout';

const root = () => document.documentElement.style;

beforeEach(() => {
  params = { id: '9' };
  resetAuth({
    userOrganizations: [
      membership({ organization: organization({ brand_color: '#D7141A' }) }),
    ],
  });
});

describe('layout de la organizacion', () => {
  it('pinta <html> con la marca y la saca al salir', () => {
    const { unmount } = render(<OrganizationLayout>ficha</OrganizationLayout>);
    expect(screen.getByText('ficha')).toBeInTheDocument();
    expect(root().getPropertyValue('--color-violet')).toBe('#D7141A');
    expect(root().getPropertyValue('--brand-header-grad')).toContain('#D7141A');
    unmount();
    expect(root().getPropertyValue('--color-violet')).toBe('');
  });

  it('sin marca, o en una org que no sigue, no pisa nada', () => {
    params = {};
    render(<OrganizationLayout>ficha</OrganizationLayout>);
    expect(root().getPropertyValue('--color-violet')).toBe('');
  });
});
