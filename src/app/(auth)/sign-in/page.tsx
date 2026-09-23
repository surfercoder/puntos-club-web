'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import {
  IoEyeOffOutline,
  IoEyeOutline,
  IoGiftOutline,
  IoLockClosed,
  IoMail,
  IoPersonAdd,
  IoShieldCheckmarkOutline,
  IoStarOutline,
} from 'react-icons/io5';

import FormField from '@/components/FormField';
import GradientSubmitButton from '@/components/GradientSubmitButton';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { MessageKey } from '@/i18n';
import { APP_VERSION } from '@/lib/app-version';
import { env } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { FORM_INPUT } from '@/lib/form';
import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase/client';
import { colors, gradient } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Ilustracion del mockup (robot + logotipo + bajada) recortada entera, con su
// degrade incluido: cualquier recorte con alpha dejaria costura contra el
// fondo. La franja del safe-area se pinta con el mismo degrade, ver topStrip.
const HERO_W = 787;
const HERO_H = 574;

const FEATURES: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  title: MessageKey;
  text: MessageKey;
}[] = [
  {
    Icon: IoShieldCheckmarkOutline,
    color: colors.purple,
    title: 'signIn.feature.secureTitle',
    text: 'signIn.feature.secureText',
  },
  {
    Icon: IoStarOutline,
    color: colors.pinkAccent,
    title: 'signIn.feature.easyTitle',
    text: 'signIn.feature.easyText',
  },
  {
    Icon: IoGiftOutline,
    color: colors.amber,
    title: 'signIn.feature.benefitsTitle',
    text: 'signIn.feature.benefitsText',
  },
];

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const t = useT();

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      notify.error(t('common.error'), { description: t('signIn.missingFields') });
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim(), password).finally(() =>
      setLoading(false),
    );

    if (error) {
      notify.error(t('common.error'), { description: errorMessage(t, error) });
      return;
    }

    // replace y no push: volver atras despues de entrar tiene que dejar al
    // usuario fuera de la app, no de vuelta en el formulario.
    router.replace('/');
  };

  // Sin pantalla propia de recuperacion: el mail abre /auth/update-password en
  // el admin. Sin redirectTo, Supabase manda al Site URL y el link no sirve.
  const handleForgotPassword = async () => {
    if (!email) {
      notify.info(t('forgot.title'), { description: t('forgot.needEmail') });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
    });
    // El rate limit de GoTrue ("you can only request this after 60 seconds")
    // sale traducido y con los segundos.
    if (error) {
      notify.error(t('forgot.title'), { description: errorMessage(t, error) });
    } else {
      notify.success(t('forgot.title'), { description: t('forgot.sent') });
    }
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      {/* Continua el degrade de la ilustracion por detras del safe area. */}
      <div
        className="h-[env(safe-area-inset-top)] w-full shrink-0"
        style={{ backgroundImage: gradient(colors.authTop) }}
      />

      <form
        onSubmit={handleSignIn}
        className="page-column page-form page-center no-scrollbar flex-1 overflow-y-auto pb-[calc(24px+env(safe-area-inset-bottom))]"
      >
        <Image
          src="/images/auth/hero.png"
          alt=""
          width={HERO_W}
          height={HERO_H}
          priority
          className="w-full"
        />

        <div className="mx-5 mt-1 rounded-[22px] bg-card px-[19px] py-[15px] shadow-[0px_10px_30px_rgba(23,10,60,0.05)]">
          <h1 className="text-center text-[16.5px] font-extrabold tracking-[-0.2px] text-ink">
            {t('signIn.title')}
          </h1>
          <p className="mt-[5px] text-center text-[11px] text-[#5D6067]">
            {t('signIn.subtitle')}
          </p>

          <div className="mt-5">
            <FormField
              htmlFor="email"
              icon={<IoMail size={18} />}
              label={t('signIn.email')}
            >
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                className={FORM_INPUT}
                placeholder={t('signIn.emailPlaceholder')}
                value={email}
                // El email siempre en minuscula: se puede tipear o pegar en
                // mayusculas.
                onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              />
            </FormField>

            <FormField
              htmlFor="password"
              icon={<IoLockClosed size={18} />}
              label={t('signIn.password')}
              last
            >
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  className={cn(FORM_INPUT, 'pr-10')}
                  placeholder={t('signIn.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* El ojo va sobre el input, que ya trae su padding. */}
                <button
                  type="button"
                  className="pressable absolute inset-y-0 right-3 flex items-center text-[#7C7F8E]"
                  aria-label={t(
                    showPassword ? 'signIn.hidePassword' : 'signIn.showPassword',
                  )}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <IoEyeOffOutline size={16} />
                  ) : (
                    <IoEyeOutline size={16} />
                  )}
                </button>
              </div>
            </FormField>
          </div>

          <button
            type="button"
            className="pressable ml-auto mt-[11px] block text-[11.5px] font-semibold text-violet"
            onClick={handleForgotPassword}
          >
            {t('signIn.forgot')}
          </button>

          <GradientSubmitButton
            label={t('signIn.submit')}
            loading={loading}
            disabled={loading}
            gradientColors={colors.pinkGrad}
            className="mt-[14px]"
          />

          <div className="mt-4 flex items-center rounded-[15px] bg-[#F7F2FB] py-3 pl-[13px] pr-3">
            <span className="flex h-[31px] w-[33px] shrink-0 items-center justify-center rounded-[10px] bg-card">
              <IoPersonAdd size={17} color={colors.violet} />
            </span>
            <div className="ml-[11px] min-w-0 flex-1">
              <p className="text-[11px] font-bold text-violet">
                {t('signIn.noAccountTitle')}
              </p>
              <p className="mt-1 text-[9.5px] leading-[15px] text-[#6B7280]">
                {t('signIn.noAccountText')}
              </p>
            </div>
            <button
              type="button"
              className="pressable ml-2 flex shrink-0 items-center"
              onClick={() => router.push('/sign-up')}
            >
              <span className="mr-[5px] text-[11px] font-bold text-violet">
                {t('signIn.signUpLink')}
              </span>
              <FiArrowRight size={15} color={colors.violet} />
            </button>
          </div>
        </div>

        <div className="mt-[21px] flex px-3">
          {FEATURES.map(({ Icon, color, title, text }, i) => (
            <div
              key={title}
              className={cn(
                'flex flex-1 pr-1',
                i > 0 && 'border-l border-[#F1EFF6] pl-2',
              )}
            >
              <Icon size={22} color={color} />
              <div className="ml-1.5 min-w-0 flex-1">
                <p className="text-[9px] font-bold" style={{ color }}>
                  {t(title)}
                </p>
                <p className="mt-[3px] text-[8px] leading-[13px] text-[#6B7280]">
                  {t(text)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-[18px] text-center text-[12px] text-subtle">
          PuntosClub {APP_VERSION}
        </p>
      </form>
    </div>
  );
}
