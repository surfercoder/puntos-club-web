'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { FiLogOut, FiSave } from 'react-icons/fi';
import {
  IoCall,
  IoCard,
  IoLanguage,
  IoLocation,
  IoMail,
  IoPerson,
} from 'react-icons/io5';

import AddressInput, { type AddressData } from '@/components/AddressInput';
import FormField from '@/components/FormField';
import ScreenHeader from '@/components/ScreenHeader';
import TabBar from '@/components/TabBar';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { LANGS } from '@/i18n';
import { APP_VERSION } from '@/lib/app-version';
import { confirm } from '@/lib/confirm';
import { env } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { FORM_INPUT } from '@/lib/form';
import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Address, Beneficiary } from '@/types';

const EMPTY_ADDRESS: Partial<AddressData> = {
  street: '',
  number: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
};

function deriveFormData(beneficiary: Beneficiary | null) {
  return {
    first_name: beneficiary?.first_name || '',
    last_name: beneficiary?.last_name || '',
    email: beneficiary?.email || '',
    phone: beneficiary?.phone || '',
    document_id: beneficiary?.document_id || '',
  };
}

function addressToFormData(address: Address): Partial<AddressData> {
  return {
    street: address.street || '',
    number: address.number || '',
    city: address.city || '',
    state: address.state || '',
    zip_code: address.zip_code || '',
    country: address.country || '',
    place_id: address.place_id || undefined,
    // ?? y no ||: 0 es una coordenada valida (golfo de Guinea, pero valida) y
    // con || volveria al form como undefined y se guardaria borrada.
    latitude: address.latitude ?? undefined,
    longitude: address.longitude ?? undefined,
  };
}

// Carga la direccion existente por id. El valor cargado se etiqueta con su id
// para poder derivar "¿es la direccion actual?" durante el render, en vez de
// resetearlo con un setState dentro de un efecto.
function useExistingAddress(addressId: string | null | undefined): Address | null {
  const [loaded, setLoaded] = useState<{
    addressId: string;
    address: Address;
  } | null>(null);

  useEffect(() => {
    if (!addressId) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('address')
        .select('*')
        .eq('id', addressId)
        .single();

      if (error || !data) return;
      if (!cancelled) setLoaded({ addressId, address: data });
    })();

    return () => {
      cancelled = true;
    };
  }, [addressId]);

  if (!addressId || !loaded || loaded.addressId !== addressId) return null;
  return loaded.address;
}

export default function ProfilePage() {
  const { beneficiary, signOut, refreshBeneficiary } = useAuth();
  const existingAddress = useExistingAddress(beneficiary?.address_id);

  // Se remonta el formulario cuando cambia el beneficiario o llega una
  // direccion nueva: los `useState` vuelven a derivar sus valores de las props
  // y no hace falta ningun setState en un efecto.
  const formKey = `${beneficiary?.id ?? 'no-beneficiary'}|${existingAddress?.id ?? 'no-addr'}`;

  return (
    <ProfileForm
      key={formKey}
      beneficiary={beneficiary}
      existingAddress={existingAddress}
      signOut={signOut}
      refreshBeneficiary={refreshBeneficiary}
    />
  );
}

// Los campos del perfil: sacarlos deja el formulario con la carga, el guardado
// y el cierre de sesion, que es lo que hay que leer para entender la pantalla.
function ProfileFields({
  formData,
  onField,
  addressData,
  onAddress,
  googleApiKey,
}: {
  formData: ReturnType<typeof deriveFormData>;
  onField: (
    field: keyof ReturnType<typeof deriveFormData>,
    value: string,
  ) => void;
  addressData: Partial<AddressData>;
  onAddress: (next: Partial<AddressData>) => void;
  googleApiKey: string;
}) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="mt-4 rounded-[20px] bg-card p-4 shadow-[0px_4px_14px_rgba(23,10,60,0.05)]">
      <FormField
        htmlFor="first_name"
        icon={<IoPerson size={18} />}
        label={t('profile.firstName')}
      >
        <input
          id="first_name"
          autoComplete="given-name"
          className={FORM_INPUT}
          value={formData.first_name}
          onChange={(e) => onField('first_name', e.target.value)}
          placeholder={t('profile.firstName')}
        />
      </FormField>

      <FormField
        htmlFor="last_name"
        icon={<IoPerson size={18} />}
        label={t('profile.lastName')}
      >
        <input
          id="last_name"
          autoComplete="family-name"
          className={FORM_INPUT}
          value={formData.last_name}
          onChange={(e) => onField('last_name', e.target.value)}
          placeholder={t('profile.lastName')}
        />
      </FormField>

      <FormField
        htmlFor="email"
        icon={<IoMail size={18} />}
        label={t('profile.email')}
      >
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={FORM_INPUT}
          value={formData.email}
          // El email siempre en minuscula: se puede tipear o pegar en
          // mayusculas.
          onChange={(e) =>
            onField('email', e.target.value.trim().toLowerCase())
          }
          placeholder={t('profile.email')}
        />
      </FormField>

      <FormField
        htmlFor="phone"
        icon={<IoCall size={18} />}
        label={t('profile.phone')}
      >
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          className={FORM_INPUT}
          value={formData.phone}
          onChange={(e) => onField('phone', e.target.value)}
          placeholder={t('profile.phone')}
        />
      </FormField>

      <FormField
        htmlFor="document_id"
        icon={<IoCard size={18} />}
        label={t('profile.document')}
      >
        <input
          id="document_id"
          inputMode="numeric"
          className={FORM_INPUT}
          value={formData.document_id}
          onChange={(e) => onField('document_id', e.target.value)}
          placeholder={t('profile.document')}
        />
      </FormField>

      <FormField icon={<IoLocation size={18} />} label={t('profile.address')}>
        <AddressInput
          value={addressData}
          onChange={onAddress}
          googleApiKey={googleApiKey}
        />
      </FormField>

      {/* Selector de idioma: arranca en el del navegador y queda guardado
          en este equipo (cookie), no en el perfil. */}
      <FormField
        icon={<IoLanguage size={18} />}
        label={t('profile.language')}
        last
      >
        <div role="radiogroup" className="flex gap-2.5">
          {LANGS.map((code) => {
            const on = lang === code;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={on}
                className={cn(
                  'pressable flex h-[46px] flex-1 items-center justify-center rounded-xl border text-[14px]',
                  on
                    ? 'border-violet bg-violet-soft font-bold text-violet'
                    : 'border-[#E6E8EF] bg-card font-semibold text-slate',
                )}
                onClick={() => setLang(code)}
              >
                {t(
                  code === 'es' ? 'profile.languageEs' : 'profile.languageEn',
                )}
              </button>
            );
          })}
        </div>
      </FormField>
    </div>
  );
}

function ProfileForm({
  beneficiary,
  existingAddress,
  signOut,
  refreshBeneficiary,
}: {
  beneficiary: Beneficiary | null;
  existingAddress: Address | null;
  signOut: () => Promise<void>;
  refreshBeneficiary: () => Promise<void>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(() => deriveFormData(beneficiary));
  const [addressData, setAddressData] = useState<Partial<AddressData>>(() =>
    existingAddress ? addressToFormData(existingAddress) : EMPTY_ADDRESS,
  );

  const googleApiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!beneficiary?.id) return;

    setIsLoading(true);

    await (async () => {
      const hasAddressData =
        addressData.street &&
        addressData.number &&
        addressData.city &&
        addressData.state &&
        addressData.zip_code;

      if (hasAddressData) {
        // save_my_address crea-y-linkea o actualiza en una sola llamada
        // definer. RLS no puede expresar "lee la fila que acabas de insertar
        // pero todavia no linkeaste al beneficiario", asi que las dos
        // escrituras viven del lado del servidor.
        const { error: addressError } = await supabase.rpc('save_my_address', {
          p_street: addressData.street,
          p_number: addressData.number,
          p_city: addressData.city,
          p_state: addressData.state,
          p_zip_code: addressData.zip_code,
          p_country: addressData.country || null,
          p_place_id: addressData.place_id || null,
          p_latitude: addressData.latitude ?? null,
          p_longitude: addressData.longitude ?? null,
        });

        if (addressError) {
          notify.error(t('common.error'), {
            description: errorMessage(t, addressError),
          });
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('beneficiary')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          // Igual que el alta: vacio va como null. `document_id` tiene UNIQUE,
          // y dos beneficiarios que lo borran chocarian guardando ''.
          phone: formData.phone.trim() || null,
          document_id: formData.document_id.trim() || null,
        })
        .eq('id', beneficiary.id);

      if (updateError) {
        notify.error(t('common.error'), {
          description: errorMessage(t, updateError),
        });
        return;
      }

      if (formData.email !== beneficiary.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (emailError) {
          notify.error(t('common.error'), {
            description: errorMessage(t, emailError),
          });
          return;
        }

        notify.info(t('profile.emailChangedTitle'), {
          description: t('profile.emailChangedBody'),
        });
      }

      await refreshBeneficiary();

      notify.success(t('profile.savedTitle'), {
        description: t('profile.savedBody'),
      });
      router.back();
    })().finally(() => setIsLoading(false));
  };

  const handleSignOut = async () => {
    const ok = await confirm({
      title: t('signOut.confirmTitle'),
      message: t('signOut.confirmBody'),
      confirmText: t('signOut.action'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await signOut();
    router.replace('/sign-in');
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader width="form" title={t('profile.header')} />
      <form
        onSubmit={handleSave}
        className="page-column page-form no-scrollbar flex-1 overflow-y-auto px-4 pb-[100px]"
      >
        <h1 className="mt-[18px] text-[24px] font-extrabold text-ink">
          {t('profile.title')}
        </h1>
        <p className="mt-1 text-[13px] text-slate">{t('profile.subtitle')}</p>

        <ProfileFields
          formData={formData}
          onField={(field, value) => setFormData({ ...formData, [field]: value })}
          addressData={addressData}
          onAddress={setAddressData}
          googleApiKey={googleApiKey}
        />

        <button
          type="submit"
          className={cn(
            'pressable mt-4 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#7437E7]',
            isLoading && 'opacity-60',
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner size={20} color="#FFFFFF" />
          ) : (
            <>
              <FiSave size={18} color="#FFFFFF" />
              <span className="ml-2.5 text-[15.5px] font-bold text-white">
                {t('profile.save')}
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          className="pressable mt-2.5 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#FDE7E4]"
          onClick={handleSignOut}
        >
          <FiLogOut size={18} color="#D41E1F" />
          <span className="ml-2.5 text-[15.5px] font-bold text-[#D41E1F]">
            {t('signOut.action')}
          </span>
        </button>

        <p className="mt-[18px] text-center text-[12px] text-subtle">
          PuntosClub {APP_VERSION}
        </p>
      </form>

      <TabBar active="none" />
    </div>
  );
}
