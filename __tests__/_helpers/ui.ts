/** Dobles de las dos APIs imperativas de UI (toasts y dialogo de confirmacion).
 *
 *  Se mockean con getters en cada suite porque jest.mock se iza por encima de
 *  los imports: sin el getter, la fabrica lee la variable antes de que exista.
 *
 *      jest.mock('@/lib/notify', () => ({
 *        get notify() {
 *          return notify;
 *        },
 *      }));
 */
export const notify = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

/** Por defecto el usuario acepta; `confirmMock.mockResolvedValue(false)` cancela. */
export const confirmMock = jest.fn();
