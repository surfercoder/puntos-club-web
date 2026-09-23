---
description: Corre todos los gates de calidad (lint, types, coverage 100%, build, react-doctor 100/100, ponytail-review, CodeRabbit) y recién ahí pushea a main
argument-hint: [mensaje de commit opcional]
---

Llevá el trabajo pendiente hasta main pasando **todos** los gates. Mensaje de commit sugerido por el usuario: $ARGUMENTS

No pushees hasta que cada gate esté en verde. Si un gate falla, arreglá el código y **volvé a correr los gates desde el principio** — un fix puede romper otro gate.

## Fase 1 — gates automáticos

Corré estos cinco en paralelo (un solo mensaje, varias llamadas a Bash):

```
npm run lint
npm run type-check
npm run test:coverage
npm run build
npx react-doctor --score
```

Criterio de aprobación, sin excepciones:

- **lint**: 0 errores y 0 warnings.
- **type-check**: 0 errores. Nunca `@ts-ignore`, `@ts-expect-error`, `any`, `!` para tapar un error, ni aflojar `tsconfig.json`. Si el tipo no cierra, el problema es el código: modelalo bien (union discriminada, type guard, `unknown` + narrowing).
- **test:coverage**: 100% en branches, functions, lines y statements (el umbral ya está en `jest.config.ts`). Cubrí con tests reales; `/* v8 ignore */` sólo para ramas físicamente inalcanzables y con el motivo escrito al lado.
- **build**: sin errores ni warnings.
- **react-doctor**: 100/100, sin warnings. Para ver qué falta: `npx react-doctor --verbose`. Los overrides de `doctor.config.json` son decisiones deliberadas y cada uno lleva su motivo escrito; no agregues uno nuevo para tapar un hallazgo real.

Prohibido pasar un gate silenciando la regla (`eslint-disable`, `react-doctor-disable`, bajar un threshold). Si una supresión es genuinamente correcta, dejá el comentario explicando por qué y avisale al usuario en el resumen final.

### Específico de esta app

- Es el port 1:1 de `PuntosClub` (Expo, beneficiario). Antes de cambiar una pantalla, mirá la nativa: si el comportamiento difiere sin motivo, el bug puede estar en el port.
- Los diccionarios `src/i18n/es.ts` / `en.ts` son **copia literal** de los de la app móvil. El test de paridad falla si una clave queda en un solo idioma, y los `{placeholder}` tienen que coincidir entre los dos.
- El **cuerpo** de los documentos legales queda sólo en español a propósito (una traducción sin revisión legal sería igual de vinculante). Si cambia un texto, subí `TERMS_VERSION` / `PRIVACY_VERSION` en `src/lib/legal.ts`: los T&C exigen dejar constancia de qué versión aceptó cada beneficiario.
- Lo que **no** se portó de la app móvil (huella, push, pull-to-refresh) está explicado en el README con su motivo. No lo reimplementes sin hablarlo: en web el equivalente de la huella es WebAuthn, nunca la contraseña en `localStorage`.
- Ningún botón de volver usa `router.back()` cuando la pantalla puede abrirse por link directo: sin historial propio no hace nada. `ScreenHeader` acepta `onBack` para esos casos.
- Los modales van con `<dialog>` nativo (Escape, foco atrapado y backdrop los da el navegador) y se montan sólo mientras están abiertos.
- Los toasts y el diálogo de confirmación se llaman desde `@/lib/notify` y `@/lib/confirm`; en `components/ui/*` viven sólo los hosts (mezclarlos rompe Fast Refresh).

## Fase 2 — reviews

Recién con la Fase 1 en verde, corré los dos reviews en paralelo:

1. `/ponytail-review` sobre el diff — código simple, seguro, performante, testeable, sin abstracciones especulativas.
2. `coderabbit review --agent --uncommitted --include-untracked` (si ya commiteaste, usá `--base main` o `--committed`).

Aplicá cada sugerencia de ambos. Si estás en desacuerdo con alguna, no la apliques calladamente: decilo en el resumen con el motivo. Después de aplicar fixes, **volvé a la Fase 1**.

## Fase 3 — push a main

Proyecto de un solo dev: se pushea directo a `main`, sin branch ni PR.

1. `git status` y `git diff` para revisar qué entra. Incluí el bloque de `AGENTS.md` si `next dev` lo regeneró.
2. `git add` de lo que corresponde (nada de secretos, `.env.local`, `coverage/`, ni artefactos de build). `.env.test` **sí** va: sin él la suite no corre en un clon limpio y sólo tiene valores de juguete.
3. Commit con el mensaje de $ARGUMENTS, o uno propio que describa el *por qué* del cambio si no lo pasaron.
4. `git push origin main`.

## Resumen final

Cerrá con, como máximo:

- Estado de cada gate (lint / types / coverage / build / react-doctor / ponytail / CodeRabbit).
- Sugerencias de review que rechazaste, con el motivo.
- El SHA pusheado.
