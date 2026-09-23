'use client';

import { useRouter } from 'next/navigation';
import React, { useReducer } from 'react';
import { FiCheck } from 'react-icons/fi';
import {
  IoCall,
  IoCard,
  IoEyeOffOutline,
  IoEyeOutline,
  IoLocation,
  IoLockClosed,
  IoMail,
  IoPerson,
  IoShieldCheckmark,
} from 'react-icons/io5';

import AddressInput, { type AddressData } from '@/components/AddressInput';
import FormField from '@/components/FormField';
import GradientSubmitButton from '@/components/GradientSubmitButton';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { MessageKey } from '@/i18n';
import { env } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { FORM_INPUT, FORM_LABEL } from '@/lib/form';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';
import { notify } from '@/lib/notify';
import { colors, gradient } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Todo el estado del alta vive en un reducer para que una actualizacion logica
// (tipear en un campo) no se abra en varios renders.
type SignUpState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentId: string;
  password: string;
  confirmPassword: string;
  address: Partial<AddressData>;
  showPassword: boolean;
  showConfirmPassword: boolean;
  acceptedTerms: boolean;
  readPrivacy: boolean;
  marketingOptIn: boolean;
  loading: boolean;
};

type SignUpCheck = 'acceptedTerms' | 'readPrivacy' | 'marketingOptIn';

type SignUpField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'documentId'
  | 'password'
  | 'confirmPassword';

type SignUpAction =
  | { type: 'setField'; field: SignUpField; value: string }
  | { type: 'setAddress'; value: Partial<AddressData> }
  | { type: 'toggleCheck'; field: SignUpCheck }
  | { type: 'togglePassword' }
  | { type: 'toggleConfirmPassword' }
  | { type: 'setLoading'; value: boolean };

// Google Places puede no traer altura ni codigo postal, asi que se exigen los
// cinco campos del formulario manual y no el resultado del buscador.
const ADDRESS_FIELDS = [
  { key: 'street', label: 'address.field.street' },
  { key: 'number', label: 'address.field.number' },
  { key: 'city', label: 'address.field.city' },
  { key: 'state', label: 'address.field.state' },
  { key: 'zip_code', label: 'address.field.zip' },
] as const satisfies readonly { key: string; label: MessageKey }[];

type RequiredAddress = Pick<AddressData, (typeof ADDRESS_FIELDS)[number]['key']>;

// Type guard en lugar de `!` mas abajo: si los cinco campos tienen texto, el
// envio puede tratarlos como string sin tener que convencer a TypeScript.
const hasRequiredAddress = (
  value: Partial<AddressData>,
): value is Partial<AddressData> & RequiredAddress =>
  ADDRESS_FIELDS.every(({ key }) => !!value[key]?.trim());

const initialSignUpState: SignUpState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  documentId: '',
  password: '',
  confirmPassword: '',
  address: {
    street: '',
    number: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
  },
  showPassword: false,
  showConfirmPassword: false,
  acceptedTerms: false,
  readPrivacy: false,
  marketingOptIn: false,
  loading: false,
};

function signUpReducer(state: SignUpState, action: SignUpAction): SignUpState {
  switch (action.type) {
    case 'setField':
      return { ...state, [action.field]: action.value };
    case 'setAddress':
      return { ...state, address: action.value };
    case 'toggleCheck':
      return { ...state, [action.field]: !state[action.field] };
    case 'togglePassword':
      return { ...state, showPassword: !state.showPassword };
    case 'toggleConfirmPassword':
      return { ...state, showConfirmPassword: !state.showConfirmPassword };
    case 'setLoading':
      return { ...state, loading: action.value };
  }
}

// El titulo del mockup va con el degrade morado -> rosa. En web alcanza con
// background-clip: text; el movil necesita un <Text> de SVG porque RN no acepta
// un fill degradado en texto.
function GradientTitle({ children }: { children: string }) {
  return (
    <h1
      className="bg-clip-text text-center text-[25px] font-extrabold text-transparent"
      style={{ backgroundImage: gradient(colors.headerGrad) }}
    >
      {children}
    </h1>
  );
}

// Ojo de mostrar/ocultar: va encima del input, que ya reserva el padding.
function EyeToggle({
  visible,
  label,
  onClick,
}: {
  visible: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="pressable absolute inset-y-0 right-3 flex items-center text-[#7C7F8E]"
      aria-label={label}
      onClick={onClick}
    >
      {visible ? <IoEyeOffOutline size={16} /> : <IoEyeOutline size={16} />}
    </button>
  );
}

// Casilla de aceptacion legal. El texto entero es el blanco de toque (no solo
// el cuadrito), y el "Ver ..." queda aparte para poder abrir el documento sin
// marcar la casilla.
function LegalCheck({
  checked,
  label,
  onToggle,
  linkLabel,
  onLink,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <div className="mb-2.5">
      <label className="pressable flex cursor-pointer items-start">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onToggle}
        />
        <span
          aria-hidden
          className={cn(
            'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px]',
            checked ? 'border-purple bg-purple' : 'border-[#D6D8E3]',
          )}
        >
          {checked ? <FiCheck size={13} color="#FFFFFF" /> : null}
        </span>
        <span className="ml-2.5 flex-1 text-[12.5px] leading-[18px] text-[#3F4557]">
          {label}
        </span>
      </label>
      {linkLabel ? (
        <button
          type="button"
          className="pressable ml-[30px] mt-[3px] text-[12px] font-bold text-violet"
          onClick={onLink}
        >
          {linkLabel}
        </button>
      ) : null}
    </div>
  );
}

// Los campos del alta viven aparte para que SignUpPage se quede solo con la
// validacion y el envio, que es lo unico que hay que leer para entender el alta.
function SignUpForm({
  state,
  dispatch,
}: {
  state: SignUpState;
  dispatch: React.Dispatch<SignUpAction>;
}) {
  const {
    firstName,
    lastName,
    email,
    phone,
    documentId,
    password,
    confirmPassword,
    address,
    showPassword,
    showConfirmPassword,
  } = state;

  const t = useT();
  const setField = (field: SignUpField) => (value: string) =>
    dispatch({ type: 'setField', field, value });

  const googleApiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return (
    <div className="mt-[26px]">
      <FormField icon={<IoPerson size={18} />}>
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="firstName" className={FORM_LABEL}>
              {t('signUp.firstName')}
            </label>
            <input
              id="firstName"
              name="given-name"
              autoComplete="given-name"
              className={FORM_INPUT}
              placeholder={t('signUp.firstNamePlaceholder')}
              value={firstName}
              onChange={(e) => setField('firstName')(e.target.value)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="lastName" className={FORM_LABEL}>
              {t('signUp.lastName')}
            </label>
            <input
              id="lastName"
              name="family-name"
              autoComplete="family-name"
              className={FORM_INPUT}
              placeholder={t('signUp.lastNamePlaceholder')}
              value={lastName}
              onChange={(e) => setField('lastName')(e.target.value)}
            />
          </div>
        </div>
      </FormField>

      <FormField
        htmlFor="email"
        icon={<IoMail size={18} />}
        label={t('signUp.email')}
      >
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={FORM_INPUT}
          placeholder={t('signIn.emailPlaceholder')}
          value={email}
          // El email siempre en minuscula: se puede tipear o pegar en mayusculas.
          onChange={(e) => setField('email')(e.target.value.trim().toLowerCase())}
        />
      </FormField>

      <FormField
        htmlFor="phone"
        icon={<IoCall size={18} />}
        label={t('signUp.phone')}
      >
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          className={FORM_INPUT}
          placeholder={t('signUp.phonePlaceholder')}
          value={phone}
          onChange={(e) => setField('phone')(e.target.value)}
        />
      </FormField>

      <FormField
        htmlFor="documentId"
        icon={<IoCard size={18} />}
        label={t('signUp.document')}
      >
        <input
          id="documentId"
          inputMode="numeric"
          className={FORM_INPUT}
          placeholder={t('signUp.documentPlaceholder')}
          value={documentId}
          onChange={(e) => setField('documentId')(e.target.value)}
        />
      </FormField>

      <FormField
        htmlFor="password"
        icon={<IoLockClosed size={18} />}
        label={t('signUp.password')}
      >
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={cn(FORM_INPUT, 'pr-10')}
            placeholder={t('signUp.passwordPlaceholder')}
            value={password}
            onChange={(e) => setField('password')(e.target.value)}
          />
          <EyeToggle
            visible={showPassword}
            label={t(showPassword ? 'signIn.hidePassword' : 'signIn.showPassword')}
            onClick={() => dispatch({ type: 'togglePassword' })}
          />
        </div>
      </FormField>

      <FormField
        htmlFor="confirmPassword"
        icon={<IoLockClosed size={18} />}
        label={t('signUp.confirmPassword')}
      >
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={cn(FORM_INPUT, 'pr-10')}
            placeholder={t('signUp.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setField('confirmPassword')(e.target.value)}
          />
          <EyeToggle
            visible={showConfirmPassword}
            label={t(
              showConfirmPassword
                ? 'signUp.hideConfirmPassword'
                : 'signUp.showConfirmPassword',
            )}
            onClick={() => dispatch({ type: 'toggleConfirmPassword' })}
          />
        </div>
      </FormField>

      <FormField
        icon={<IoLocation size={18} />}
        label={t('signUp.address')}
        last
      >
        <AddressInput
          value={address}
          onChange={(value) => dispatch({ type: 'setAddress', value })}
          googleApiKey={googleApiKey}
        />
      </FormField>
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(signUpReducer, initialSignUpState);
  const {
    firstName,
    lastName,
    email,
    phone,
    documentId,
    password,
    confirmPassword,
    address,
    acceptedTerms,
    readPrivacy,
    marketingOptIn,
    loading,
  } = state;
  const { signUp } = useAuth();
  const t = useT();

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      notify.error(t('common.error'), { description: t('signUp.missingFields') });
      return;
    }

    if (password !== confirmPassword) {
      notify.error(t('common.error'), {
        description: t('signUp.passwordMismatch'),
      });
      return;
    }

    if (password.length < 6) {
      notify.error(t('common.error'), {
        description: t('signUp.passwordTooShort'),
      });
      return;
    }

    if (!hasRequiredAddress(address)) {
      const missing = ADDRESS_FIELDS.filter(({ key }) => !address[key]?.trim());
      notify.error(t('signUp.missingAddressTitle'), {
        description: t('signUp.missingAddressBody', {
          fields: missing.map((f) => t(f.label)).join(', '),
        }),
      });
      return;
    }

    if (!acceptedTerms || !readPrivacy) {
      notify.error(t('signUp.missingConsentTitle'), {
        description: t('signUp.missingConsentBody'),
      });
      return;
    }

    dispatch({ type: 'setLoading', value: true });
    const { error } = await signUp(email.trim(), password, {
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
      document_id: documentId.trim() || undefined,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      marketing_opt_in: marketingOptIn,
      address: {
        street: address.street.trim(),
        number: address.number.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        zip_code: address.zip_code.trim(),
        country: address.country?.trim() || undefined,
        place_id: address.place_id,
        latitude: address.latitude,
        longitude: address.longitude,
      },
    });
    dispatch({ type: 'setLoading', value: false });

    if (error) {
      notify.error(t('common.error'), { description: errorMessage(t, error) });
    } else {
      notify.success(t('signUp.createdTitle'), {
        description: t('signUp.createdBody'),
      });
      router.replace('/sign-in');
    }
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader width="form" title={t('signUp.header')} />

      <form
        onSubmit={handleSignUp}
        className="page-column page-form no-scrollbar flex-1 overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-[34px]"
      >
        <GradientTitle>{t('signUp.header')}</GradientTitle>
        <p className="mt-1.5 text-center text-[13px] leading-5 text-[#5D6067]">
          {t('signUp.subtitle')}
        </p>

        <SignUpForm state={state} dispatch={dispatch} />

        <div className="mt-[22px] flex items-center rounded-2xl bg-lilac p-[14px]">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-card">
            <IoShieldCheckmark size={18} color={colors.violet} />
          </span>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-violet">
              {t('signUp.noticeTitle')}
            </p>
            <p className="mt-1 text-[11.5px] leading-[17px] text-[#6B7280]">
              {t('signUp.noticeText')}
            </p>
          </div>
        </div>

        <div className="mt-[18px] rounded-2xl border border-[#ECE6FA] bg-card px-[14px] py-4">
          <p className="text-[13.5px] font-bold text-ink">
            {t('signUp.legalTitle')}
          </p>
          <p className="mb-3 mt-[5px] text-[11.5px] leading-[17px] text-[#6B7280]">
            {t('signUp.legalText')}
          </p>

          <LegalCheck
            checked={acceptedTerms}
            label={t('signUp.acceptTerms')}
            onToggle={() =>
              dispatch({ type: 'toggleCheck', field: 'acceptedTerms' })
            }
            linkLabel={t('signUp.viewTerms')}
            onLink={() => router.push('/legal?doc=terms')}
          />

          <LegalCheck
            checked={readPrivacy}
            label={t('signUp.readPrivacy')}
            onToggle={() =>
              dispatch({ type: 'toggleCheck', field: 'readPrivacy' })
            }
            linkLabel={t('signUp.viewPrivacy')}
            onLink={() => router.push('/legal?doc=privacy')}
          />

          <p className="mb-2 mt-3 text-[11px] font-bold text-muted">
            {t('signUp.optional')}
          </p>
          <LegalCheck
            checked={marketingOptIn}
            label={t('signUp.marketing')}
            onToggle={() =>
              dispatch({ type: 'toggleCheck', field: 'marketingOptIn' })
            }
          />
        </div>

        <GradientSubmitButton
          label={t('signUp.submit')}
          loading={loading}
          disabled={loading}
          gradientColors={colors.pinkGrad}
          className="mt-5"
        />

        <div className="mt-4 flex items-center justify-center gap-1">
          <span className="text-[12.5px] text-[#6B7280]">
            {t('signUp.haveAccount')}
          </span>
          <button
            type="button"
            className="pressable text-[12.5px] font-bold text-violet"
            onClick={() => router.replace('/sign-in')}
          >
            {t('signUp.signInLink')}
          </button>
        </div>
      </form>
    </div>
  );
}
