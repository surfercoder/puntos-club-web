'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import React, { useEffect, useRef, useState } from 'react';
import { FiEdit2, FiSearch } from 'react-icons/fi';
import { IoLocation } from 'react-icons/io5';

import { useI18n } from '@/contexts/I18nContext';
import type { MessageKey, Translate } from '@/i18n';
import { FORM_INPUT, FORM_LABEL } from '@/lib/form';
import { colors } from '@/lib/theme';

export interface AddressData {
  street: string;
  number: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  place_id?: string;
  latitude?: number;
  longitude?: number;
}

// Puro y fuera del componente: el switch de tipos de Google Places no necesita
// re-crearse por render.
function parseGooglePlaceDetails(
  place: google.maps.places.PlaceResult,
): Partial<AddressData> {
  const addressComponents: Partial<AddressData> = {
    street: '',
    number: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    place_id: place.place_id,
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
  };

  place.address_components?.forEach((component) => {
    const componentType = component.types[0];

    switch (componentType) {
      case 'street_number':
        addressComponents.number = component.long_name;
        break;
      case 'route':
        addressComponents.street = component.long_name;
        break;
      case 'locality':
        addressComponents.city = component.long_name;
        break;
      case 'administrative_area_level_2':
        // Respaldo para la ciudad cuando no hay locality (caso Argentina).
        if (!addressComponents.city) {
          addressComponents.city = component.long_name;
        }
        break;
      case 'administrative_area_level_1':
        addressComponents.state = component.long_name;
        break;
      case 'country':
        addressComponents.country = component.long_name;
        break;
      case 'postal_code':
        addressComponents.zip_code = component.long_name;
        break;
    }
  });

  return addressComponents;
}

// Campos del formulario manual: mapear una lista en vez de repetir el mismo
// bloque cinco veces es lo que baja la complejidad del componente.
type ManualField = 'street' | 'number' | 'city' | 'state' | 'zip_code';

const MANUAL_FIELDS: {
  field: ManualField;
  label: MessageKey;
  placeholder: MessageKey;
}[] = [
  { field: 'street', label: 'address.street', placeholder: 'address.streetPlaceholder' },
  { field: 'number', label: 'address.number', placeholder: 'address.numberPlaceholder' },
  { field: 'city', label: 'address.city', placeholder: 'address.cityPlaceholder' },
  { field: 'state', label: 'address.state', placeholder: 'address.statePlaceholder' },
  { field: 'zip_code', label: 'address.zip', placeholder: 'address.zipPlaceholder' },
];

const LinkButton = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="pressable mt-[14px] flex w-full items-center justify-center gap-[9px]"
    onClick={onClick}
  >
    {icon}
    <span className="text-[14px] font-bold text-violet">{label}</span>
  </button>
);

function ManualAddressFields({
  value,
  onChangeField,
  googleApiKey,
  onSwitchToSearch,
  t,
}: {
  value: Partial<AddressData>;
  onChangeField: (field: keyof AddressData) => (text: string) => void;
  googleApiKey: string;
  onSwitchToSearch: () => void;
  t: Translate;
}) {
  return (
    <>
      {MANUAL_FIELDS.map(({ field, label, placeholder }) => (
        <div key={field} className="mb-3">
          <label htmlFor={`address-${field}`} className={FORM_LABEL}>
            {t(label)}
          </label>
          <input
            id={`address-${field}`}
            className={FORM_INPUT}
            value={value[field] ?? ''}
            onChange={(e) => onChangeField(field)(e.target.value)}
            placeholder={t(placeholder)}
          />
        </div>
      ))}

      {googleApiKey ? (
        <LinkButton
          icon={<FiSearch size={15} color={colors.violet} />}
          label={t('address.searchWithGoogle')}
          onClick={onSwitchToSearch}
        />
      ) : null}
    </>
  );
}

// Carga la libreria de Places una sola vez por pestana y engancha el widget de
// autocompletado al input. Es el mismo enfoque que usa puntos-club-admin.
//
// `onFailed` avisa al padre que Google no cargo, y se llama desde el catch en
// vez de guardar el fallo en estado y reportarlo con un efecto: ese efecto
// llamaba a una prop en cada render del padre para mantenerlo sincronizado.
function useGooglePlaces(
  apiKey: string,
  language: string,
  onPlace: (place: google.maps.places.PlaceResult) => void,
  onFailed: () => void,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPlaceRef = useRef(onPlace);
  const onFailedRef = useRef(onFailed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPlaceRef.current = onPlace;
    onFailedRef.current = onFailed;
  });

  useEffect(() => {
    // Sin guardia por apiKey vacio: la seccion del buscador solo se dibuja
    // cuando hay key (ver AddressInput, abajo), asi que aca siempre hay una.
    let cancelled = false;

    (async () => {
      try {
        setOptions({ key: apiKey, language });
        await importLibrary('places');
        if (!cancelled) setReady(true);
      } catch {
        // Key mal, adblocker o sin red: el buscador quedaria como un campo
        // muerto, asi que el padre cae al formulario manual.
        if (!cancelled) onFailedRef.current();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, language]);

  useEffect(() => {
    const inputEl = inputRef.current;
    if (!ready || !inputEl) return;

    const autocomplete = new google.maps.places.Autocomplete(inputEl, {
      types: ['address'],
      fields: ['address_components', 'formatted_address', 'place_id', 'geometry'],
    });

    const listener = google.maps.event.addListener(
      autocomplete,
      'place_changed',
      () => {
        const place = autocomplete.getPlace();
        if (place.address_components) onPlaceRef.current(place);
      },
    );

    // Enter dentro del autocompletado no debe enviar el formulario del alta.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') e.preventDefault();
    };
    inputEl.addEventListener('keydown', onKeyDown);

    return () => {
      listener.remove();
      inputEl.removeEventListener('keydown', onKeyDown);
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [ready]);

  return { inputRef, ready };
}

function PlacesAutocompleteSection({
  googleApiKey,
  onPlaceSelected,
  onSwitchToManual,
  t,
  lang,
}: {
  googleApiKey: string;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  onSwitchToManual: () => void;
  t: Translate;
  lang: string;
}) {
  // Si Google no carga se cae al formulario manual, que es lo que igual hace la
  // app cuando no hay key.
  const { inputRef, ready } = useGooglePlaces(
    googleApiKey,
    lang,
    onPlaceSelected,
    onSwitchToManual,
  );

  return (
    <div>
      <input
        ref={inputRef}
        className={FORM_INPUT}
        placeholder={t('address.searchPlaceholder')}
        disabled={!ready}
        autoComplete="off"
      />

      <div className="mt-3 flex items-center rounded-[14px] bg-[#F8F4FE] p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card">
          <IoLocation size={20} color={colors.violet} />
        </span>
        <div className="ml-3 min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-violet">
            {t('address.hintTitle')}
          </p>
          <p className="mt-[3px] text-[12px] leading-[17px] text-[#6E7483]">
            {t('address.hintBody')}
          </p>
        </div>
      </div>

      <LinkButton
        icon={<FiEdit2 size={15} color={colors.violet} />}
        label={t('address.enterManually')}
        onClick={onSwitchToManual}
      />
    </div>
  );
}

export default function AddressInput({
  value,
  onChange,
  googleApiKey,
}: {
  value: Partial<AddressData>;
  onChange: (address: Partial<AddressData>) => void;
  googleApiKey: string;
}) {
  const { t, lang } = useI18n();
  // Solo decide con que arranca: sin buscador, o con una direccion ya guardada,
  // se abre a mano. De ahi en mas manda lo que elija el usuario — cuando
  // `hasAddressData` seguia pesando en cada render, "volver a buscar" no hacia
  // nada apenas hubiera un campo escrito. Elegir un lugar en Google tambien
  // vuelve al manual, para que se vean los campos que quedaron llenos.
  const [showManualInput, setShowManualInput] = useState(
    () => !googleApiKey || MANUAL_FIELDS.some(({ field }) => value[field]),
  );

  // Editar a mano invalida lo que devolvio Google: si se conservan place_id y
  // las coordenadas, la direccion guardada apunta al lugar que se busco y no al
  // que quedo escrito. Sin buscador nunca hubo coordenadas, asi que el backend
  // ya sabe recibir la direccion sin ellas.
  const setField = (field: keyof AddressData) => (text: string) =>
    onChange({
      ...value,
      [field]: text,
      place_id: undefined,
      latitude: undefined,
      longitude: undefined,
    });

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    onChange(parseGooglePlaceDetails(place));
    setShowManualInput(true);
  };

  return (
    <div>
      {!showManualInput && googleApiKey ? (
        <PlacesAutocompleteSection
          googleApiKey={googleApiKey}
          onPlaceSelected={handlePlaceSelected}
          onSwitchToManual={() => setShowManualInput(true)}
          t={t}
          lang={lang}
        />
      ) : null}

      {showManualInput ? (
        <ManualAddressFields
          value={value}
          onChangeField={setField}
          googleApiKey={googleApiKey}
          onSwitchToSearch={() => setShowManualInput(false)}
          t={t}
        />
      ) : null}
    </div>
  );
}
