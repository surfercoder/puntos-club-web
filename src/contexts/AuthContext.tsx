'use client';

import type {
  RealtimeChannel,
  Session,
  User,
} from '@supabase/supabase-js';
import React, { createContext, use, useEffect, useReducer, useRef } from 'react';

import type { MessageKey } from '@/i18n';
import { env } from '@/lib/env';
import { errorDescriptor } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import type {
  Beneficiary,
  BeneficiaryOrganization,
  Organization,
} from '@/types';

// Los helpers de auth no pueden traducir: no son componentes y el idioma vive
// en el contexto de i18n. Devuelven un Error cuyo `message` es la CLAVE de
// i18n, y la pantalla que lo muestra la traduce con errorMessage(t, error).
// Asi ningun texto de GoTrue/PostgREST llega crudo a un toast.
const keyError = (key: MessageKey, params?: Record<string, string | number>) => {
  const error = new Error(key);
  // Un Error solo lleva un string, asi que los parametros de interpolacion
  // (los segundos del rate limit) viajan como propiedad; errorDescriptor los
  // vuelve a leer de ahi.
  if (params) Object.assign(error, { i18nParams: params });
  return error;
};
const mapped = (error: unknown) => {
  const { key, params } = errorDescriptor(error);
  return keyError(key, params);
};

// terms_version / privacy_version / marketing_opt_in salen de las casillas del
// alta. Las versiones se guardan junto al timestamp porque los T&C exigen dejar
// constancia de que version acepto cada beneficiario, no solo de que acepto.
// address viaja en el metadata (y no por save_my_address) porque el alta no
// deja sesion abierta: el trigger la inserta y la linkea del lado del servidor.
export type SignUpAddress = {
  street: string;
  number: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
  place_id?: string;
  latitude?: number;
  longitude?: number;
};

export type SignUpData = {
  first_name: string;
  last_name: string;
  phone?: string;
  document_id?: string;
  terms_version: string;
  privacy_version: string;
  marketing_opt_in: boolean;
  address: SignUpAddress;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  beneficiary: Beneficiary | null;
  userOrganizations: BeneficiaryOrganization[];
  allOrganizations: Organization[];
  loading: boolean;
  organizationsLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    userData: SignUpData,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  joinOrganization: (organizationId: string) => Promise<{ error: Error | null }>;
  refreshOrganizations: () => Promise<void>;
  refreshBeneficiary: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function signInImpl(
  email: string,
  password: string,
): Promise<{ error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: mapped(error) };

    if (data.user) {
      // El email de un admin puede autenticarse contra el mismo GoTrue: lo que
      // define que sea beneficiario es la fila de `beneficiary` con rol
      // final_user, no la sesion.
      const { data: beneficiaryData, error: beneficiaryError } = await supabase
        .from('beneficiary')
        .select('*, user_role:role_id(name)')
        .eq('auth_user_id', data.user.id)
        .single();

      if (beneficiaryError || !beneficiaryData) {
        await supabase.auth.signOut();
        return { error: keyError('error.auth.notBeneficiary') };
      }

      const roleName = (beneficiaryData.user_role as { name?: string } | null)
        ?.name;
      if (roleName !== 'final_user') {
        await supabase.auth.signOut();
        return { error: keyError('error.auth.noPermission') };
      }
    }

    return { error: null };
  } catch (error) {
    return { error: mapped(error) };
  }
}

// El link de confirmacion del mail cae en el admin, que es quien tiene la
// pantalla /auth/email-confirmed. La constante es el fallback historico por si
// no hay NEXT_PUBLIC_SITE_URL configurada.
const EMAIL_CONFIRMED_URL = `${env.NEXT_PUBLIC_SITE_URL}/auth/email-confirmed`;

async function signUpImpl(
  email: string,
  password: string,
  userData: SignUpData,
): Promise<{ error: Error | null }> {
  try {
    // beneficiary tiene UNIQUE en email y document_id, asi que el duplicado
    // ya no entra: esto solo lo detecta antes para poder decir cual de los
    // dos es.
    const { data: conflict } = await supabase.rpc(
      'beneficiary_signup_conflict',
      {
        p_email: email,
        p_document_id: userData.document_id ?? null,
      },
    );
    if (conflict === 'email') {
      return { error: keyError('error.auth.emailExists') };
    }
    if (conflict === 'document_id') {
      return { error: keyError('error.auth.documentExists') };
    }

    // El trigger de la base crea la fila de beneficiary con este metadata.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: EMAIL_CONFIRMED_URL,
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone || null,
          document_id: userData.document_id || null,
          terms_version: userData.terms_version,
          privacy_version: userData.privacy_version,
          marketing_opt_in: userData.marketing_opt_in,
          address: userData.address,
        },
      },
    });

    if (authError) {
      // El duplicado que se cuela entre el chequeo y el INSERT rompe adentro
      // del trigger, y GoTrue lo tapa con un "Database error saving new user".
      if (authError.code === 'unexpected_failure') {
        return { error: keyError('error.auth.emailOrDocumentExists') };
      }
      return { error: mapped(authError) };
    }

    if (!authData.user) {
      return { error: keyError('error.auth.signUpFailed') };
    }

    // GoTrue no delata que un email ya esta registrado: con "Confirm email"
    // prendido devuelve 200 y un usuario de mentira con identities vacio, sin
    // crear nada ni mandar mail. Sin este chequeo el alta cantaba "Cuenta
    // creada" para un email que ya existe (p.ej. una cuenta del admin web,
    // que beneficiary_signup_conflict no ve porque solo mira beneficiary).
    if (authData.user.identities?.length === 0) {
      return { error: keyError('error.auth.emailExists') };
    }

    return { error: null };
  } catch (error) {
    return { error: mapped(error) };
  }
}

// Trae el beneficiario por auth_user_id, con corte a los 8s.
async function fetchBeneficiaryByAuthUserId(
  authUserId: string,
): Promise<{ beneficiary: Beneficiary | null; signedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('fetchBeneficiary timeout'));
      }, 8000);
    });

    const queryPromise = supabase
      .from('beneficiary')
      .select('*, user_role:role_id(name)')
      .eq('auth_user_id', authUserId)
      .single();

    // El timer del race hay que apagarlo cuando gana la query: si no, a los 8s
    // rechaza una promesa que ya no tiene a nadie escuchando. Va en un
    // `.finally` de la promesa y no en uno del try, que corre igual pero deja
    // una rama que ningun test puede alcanzar.
    const { data, error } = await Promise.race([
      queryPromise,
      timeoutPromise,
    ]).finally(() => clearTimeout(timer));

    if (error || !data) {
      await supabase.auth.signOut();
      return { beneficiary: null, signedOut: true };
    }
    const roleName = (data.user_role as { name?: string } | null)?.name;
    if (roleName !== 'final_user') {
      await supabase.auth.signOut();
      return { beneficiary: null, signedOut: true };
    }
    return { beneficiary: data as Beneficiary, signedOut: false };
  } catch {
    return { beneficiary: null, signedOut: false };
  }
}

// ---------------------------------------------------------------------------
// Estado de auth — un solo reducer para que una actualizacion logica ("sesion
// cargada") no se abra en varios renders.
// ---------------------------------------------------------------------------

type AuthState = {
  session: Session | null;
  user: User | null;
  beneficiary: Beneficiary | null;
  loading: boolean;
};

type AuthAction =
  | { type: 'session/loaded'; session: Session | null }
  | { type: 'beneficiary/set'; beneficiary: Beneficiary | null }
  | { type: 'session/cleared' }
  | { type: 'loading/done' };

const initialAuthState: AuthState = {
  session: null,
  user: null,
  beneficiary: null,
  loading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'session/loaded':
      return {
        ...state,
        session: action.session,
        user: action.session?.user ?? null,
      };
    case 'beneficiary/set':
      return { ...state, beneficiary: action.beneficiary, loading: false };
    case 'session/cleared':
      return {
        ...state,
        session: null,
        user: null,
        beneficiary: null,
        loading: false,
      };
    case 'loading/done':
      return { ...state, loading: false };
  }
}

// ---------------------------------------------------------------------------
// Listas de organizaciones — hook propio para que AuthProvider quede corto.
// ---------------------------------------------------------------------------

// `userOrganizations: null` es "todavia no cargo": de ahi sale
// organizationsLoading, en vez de un flag propio que habia que acordarse de
// prender (arrancaba en false, asi que el spinner de la home y de Explorar no
// se mostraba nunca y en su lugar parpadeaba el vacio).
type OrgsState = {
  userOrganizations: BeneficiaryOrganization[] | null;
  allOrganizations: Organization[];
};

type OrgsAction =
  | { type: 'user/loaded'; orgs: BeneficiaryOrganization[] }
  | { type: 'user/error' }
  | { type: 'user/clear' }
  | { type: 'all/loaded'; orgs: Organization[] }
  | {
      type: 'user/replace';
      mapper: (prev: BeneficiaryOrganization[]) => BeneficiaryOrganization[];
    };

const initialOrgsState: OrgsState = {
  userOrganizations: null,
  allOrganizations: [],
};

function orgsReducer(state: OrgsState, action: OrgsAction): OrgsState {
  switch (action.type) {
    case 'user/loaded':
      return { ...state, userOrganizations: action.orgs };
    // Se conserva lo que ya habia (puede ser un refresh que fallo), pero deja
    // de estar cargando: el error es silencioso, la lista vacia no.
    case 'user/error':
      return { ...state, userOrganizations: state.userOrganizations ?? [] };
    case 'user/clear':
      return { ...state, userOrganizations: [] };
    case 'all/loaded':
      return { ...state, allOrganizations: action.orgs };
    case 'user/replace':
      return {
        ...state,
        userOrganizations: action.mapper(state.userOrganizations ?? []),
      };
  }
}

async function loadUserOrganizations(
  beneficiaryId: string,
): Promise<BeneficiaryOrganization[] | null> {
  const { data, error } = await supabase
    .from('beneficiary_organization')
    .select(
      `
      *,
      organization:organization_id (
        id,
        name,
        business_name,
        tax_id,
        public_info,
        description,
        contact_email,
        contact_phone,
        website,
        industry,
        logo_url,
        creation_date
      )
    `,
    )
    .eq('beneficiary_id', beneficiaryId)
    .eq('is_active', true);

  if (error) return null;
  return (data || []) as BeneficiaryOrganization[];
}

async function loadAllOrganizations(
  beneficiaryId: string,
): Promise<Organization[] | null> {
  try {
    const { data, error } = await supabase
      .from('organization')
      .select('*')
      .eq('is_public', true)
      .order('name');

    if (error) return null;

    let orgs = (data || []) as Organization[];

    const { data: hiddenRecords } = await supabase
      .from('beneficiary_organization')
      .select('organization_id')
      .eq('beneficiary_id', beneficiaryId)
      .eq('is_hidden', true);

    if (hiddenRecords && hiddenRecords.length > 0) {
      const hiddenOrgIds = new Set(
        hiddenRecords.map((r) => r.organization_id.toString()),
      );
      orgs = orgs.filter((org) => !hiddenOrgIds.has(org.id.toString()));
    }

    return orgs;
  } catch {
    return null;
  }
}

function useOrganizationsLoader(beneficiaryId: string | undefined) {
  const [state, dispatch] = useReducer(orgsReducer, initialOrgsState);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!beneficiaryId) return;

    let cancelled = false;

    const fetchUserOrgs = async () => {
      const next = await loadUserOrganizations(beneficiaryId);
      const action: OrgsAction =
        next === null
          ? { type: 'user/error' }
          : { type: 'user/loaded', orgs: next };
      if (!cancelled) dispatch(action);
    };

    const fetchAllOrgs = async () => {
      const next = await loadAllOrganizations(beneficiaryId);
      if (next === null) return;
      if (!cancelled) dispatch({ type: 'all/loaded', orgs: next });
    };

    void fetchUserOrgs();
    void fetchAllOrgs();

    const channel = supabase.channel(`beneficiary-orgs-${beneficiaryId}`);
    const boundOrgRow = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'beneficiary_organization',
        filter: `beneficiary_id=eq.${beneficiaryId}`,
      },
      async (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          const isNowHiddenOrInactive =
            payload.new.is_hidden || !payload.new.is_active;
          const wasHiddenOrInactive =
            payload.old && (payload.old.is_hidden || !payload.old.is_active);

          if (isNowHiddenOrInactive) {
            dispatch({
              type: 'user/replace',
              mapper: (prev) => prev.filter((org) => org.id !== payload.new.id),
            });
            await fetchAllOrgs();
          } else if (wasHiddenOrInactive && !isNowHiddenOrInactive) {
            await fetchUserOrgs();
            await fetchAllOrgs();
          } else {
            dispatch({
              type: 'user/replace',
              mapper: (prev) =>
                prev.map((org) =>
                  org.id === payload.new.id
                    ? {
                        ...org,
                        available_points: payload.new.available_points,
                        total_points_earned: payload.new.total_points_earned,
                        total_points_redeemed: payload.new.total_points_redeemed,
                        updated_at: payload.new.updated_at,
                      }
                    : org,
                ),
            });
          }
        } else {
          await fetchUserOrgs();
          await fetchAllOrgs();
        }
      },
    );
    const boundOrgTable = boundOrgRow.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'organization' },
      async () => {
        // Recarga la lista de Explorar cuando cambia cualquier organizacion,
        // para que un cambio de is_public se vea al instante.
        await fetchAllOrgs();
      },
    );
    boundOrgTable.subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      boundOrgTable.unsubscribe();
      boundOrgRow.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [beneficiaryId]);

  const refreshOrganizations = async () => {
    if (!beneficiaryId) return;
    const [userOrgs, allOrgs] = await Promise.all([
      loadUserOrganizations(beneficiaryId),
      loadAllOrganizations(beneficiaryId),
    ]);
    if (userOrgs !== null) dispatch({ type: 'user/loaded', orgs: userOrgs });
    if (allOrgs !== null) dispatch({ type: 'all/loaded', orgs: allOrgs });
  };

  const joinOrganization = async (
    organizationId: string,
  ): Promise<{ error: Error | null }> => {
    if (!beneficiaryId) {
      return { error: keyError('error.noSession') };
    }
    try {
      const { data: existing } = await supabase
        .from('beneficiary_organization')
        .select('id, is_active, is_hidden')
        .eq('beneficiary_id', beneficiaryId)
        .eq('organization_id', organizationId)
        .single();

      if (existing) {
        if (existing.is_hidden) {
          return { error: keyError('error.join.notAvailable') };
        }
        if (existing.is_active) {
          return { error: keyError('error.join.alreadyMember') };
        }
        const { error: updateError } = await supabase
          .from('beneficiary_organization')
          .update({ is_active: true })
          .eq('id', existing.id);

        if (updateError) {
          return { error: keyError('error.join.reactivateFailed') };
        }
      } else {
        const { error: insertError } = await supabase
          .from('beneficiary_organization')
          .insert({
            beneficiary_id: beneficiaryId,
            organization_id: organizationId,
            available_points: 0,
            total_points_earned: 0,
            total_points_redeemed: 0,
            is_active: true,
          });

        if (insertError) {
          return { error: keyError('error.join.failed') };
        }
      }

      const refreshed = await loadUserOrganizations(beneficiaryId);
      if (refreshed !== null) dispatch({ type: 'user/loaded', orgs: refreshed });
      return { error: null };
    } catch (error) {
      return { error: mapped(error) };
    }
  };

  const clearUserOrganizations = () => {
    dispatch({ type: 'user/clear' });
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  return {
    userOrganizations: state.userOrganizations ?? [],
    allOrganizations: state.allOrganizations,
    organizationsLoading: state.userOrganizations === null,
    refreshOrganizations,
    joinOrganization,
    clearUserOrganizations,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const { session, user, beneficiary, loading } = state;

  const orgs = useOrganizationsLoader(beneficiary?.id);

  const refreshBeneficiary = async () => {
    if (!user?.id) return;
    const { beneficiary: next } = await fetchBeneficiaryByAuthUserId(user.id);
    dispatch({ type: 'beneficiary/set', beneficiary: next });
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const refreshForAuthUser = async (authUserId: string) => {
      const { beneficiary: next } =
        await fetchBeneficiaryByAuthUserId(authUserId);
      if (!mounted) return;
      dispatch({ type: 'beneficiary/set', beneficiary: next });
    };

    (async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Auth initialization timeout'));
          }, 10000);
        });

        const sessionPromise = supabase.auth.getSession();

        const {
          data: { session: initialSession },
          error: sessionError,
        } = await Promise.race([sessionPromise, timeoutPromise]);

        clearTimeout(timeoutId);

        if (!mounted) return;

        if (sessionError) {
          await supabase.auth.signOut().catch(() => {});
          dispatch({ type: 'session/cleared' });
          return;
        }

        dispatch({ type: 'session/loaded', session: initialSession });

        if (initialSession?.user) {
          await refreshForAuthUser(initialSession.user.id);
        } else {
          dispatch({ type: 'loading/done' });
        }
      } catch {
        if (mounted) {
          dispatch({ type: 'session/cleared' });
        }
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      // TOKEN_REFRESHED llega cada hora: el beneficiario no cambia, y volver a
      // pedirlo pondria `loading` en true y parpadearia la pantalla entera.
      if (event === 'TOKEN_REFRESHED') {
        dispatch({ type: 'session/loaded', session: nextSession });
        return;
      }

      dispatch({ type: 'session/loaded', session: nextSession });
      if (nextSession?.user) {
        await refreshForAuthUser(nextSession.user.id);
      } else {
        dispatch({ type: 'beneficiary/set', beneficiary: null });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    orgs.clearUserOrganizations();
    await supabase.auth.signOut();
    dispatch({ type: 'beneficiary/set', beneficiary: null });
  };

  return (
    <AuthContext
      value={{
        session,
        user,
        beneficiary,
        userOrganizations: orgs.userOrganizations,
        allOrganizations: orgs.allOrganizations,
        loading,
        organizationsLoading: orgs.organizationsLoading,
        signIn: signInImpl,
        signUp: signUpImpl,
        signOut,
        joinOrganization: orgs.joinOrganization,
        refreshOrganizations: orgs.refreshOrganizations,
        refreshBeneficiary,
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
