// Kitchen workflow adapted from igniter-labs/ti-ext-kitchendisplay v4.0.2.
// See docs/licenses/TastyIgniter-Kitchen-Display-MIT.md.
import { posCapabilities } from './pos-capabilities.mjs';

export const kitchenStatuses = ['received', 'preparing', 'ready', 'completed'];
export const kitchenColumns = [...kitchenStatuses, 'on_hold'];
export const kitchenChannels = ['storefront', 'pos', 'kiosk'];
export const kitchenWaitTimes = [5, 10, 15, 20, 30, 45];

const invalid = (message, status = 400) => Object.assign(new Error(message), { status });
const clockTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function kitchenChannel(order) {
  if (order.channel === 'kiosk') return 'kiosk';
  if (['pos', 'pos_remote'].includes(order.source)) return 'pos';
  return order.channel === 'storefront' ? 'storefront' : '';
}

export function isKitchenOrder(order) {
  return order.kind === 'order' && Boolean(order.queueNumber)
    && ['paid', 'paid_in_person'].includes(order.paymentStatus)
    && !['processing', 'reservation_pending', 'cancelled', 'refunded', 'failed', 'payment_review_required', 'inventory_review_required'].includes(order.status)
    && !order.posRecoveryNeeded;
}

export function kitchenOrderPatch(order, input, timeZone = 'America/Puerto_Rico') {
  if (!isKitchenOrder(order)) throw invalid('Kitchen updates are only available for paid food orders. / Cocina requiere una orden de comida pagada.', 409);
  const revision = order.kitchenRevision ?? 0;
  const expected = input.expectedKitchenRevision;
  if ((input.kitchenEtaMinutes !== undefined || expected !== undefined) && expected !== revision) {
    throw invalid('This order changed. Refresh the board and try again. / La orden cambió. Actualiza el tablero e inténtalo de nuevo.', 409);
  }
  const actions = [input.kitchenStatus, input.kitchenPause, input.kitchenEtaMinutes, input.kitchenEtaTime];
  if (actions.filter(value => value !== undefined).length !== 1) throw invalid('Choose one kitchen action. / Selecciona una acción de cocina.');
  if (input.kitchenStatus !== undefined) {
    if (!kitchenStatuses.includes(input.kitchenStatus)) throw invalid('Invalid kitchen status. / Estado de cocina inválido.');
    return { kitchenStatus: input.kitchenStatus, kitchenPaused: false, kitchenRevision: revision + 1 };
  }
  if (order.kitchenStatus === 'completed') throw invalid('This order was already handed off. / Esta orden ya fue entregada.', 409);
  if (input.kitchenPause !== undefined) {
    if (input.kitchenPause !== true) throw invalid('Invalid kitchen pause. / Pausa inválida.');
    return { kitchenPaused: true, kitchenRevision: revision + 1 };
  }
  if (input.kitchenEtaTime !== undefined) {
    if (typeof input.kitchenEtaTime !== 'string' || !clockTime.test(input.kitchenEtaTime)) throw invalid('Enter a valid time. / Ingresa una hora válida.');
    return { kitchenEtaTime: input.kitchenEtaTime, kitchenRevision: revision + 1 };
  }
  if (!kitchenWaitTimes.includes(input.kitchenEtaMinutes)) throw invalid('Invalid time increment. / Incremento de tiempo inválido.');
  const base = order.kitchenEtaTime || new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(order.paidAt || order.createdAt));
  const [hour, minute] = base.split(':').map(Number);
  const next = (hour * 60 + minute + input.kitchenEtaMinutes) % 1440;
  const format = value => String(value).padStart(2, '0');
  return { kitchenEtaTime: `${format(Math.floor(next / 60))}:${format(next % 60)}`, kitchenRevision: revision + 1 };
}

export function paidPosKitchenFields(site, order) {
  if (!posCapabilities(site).kitchen) return {};
  const location = site.business?.locations?.find(entry => entry.id === order.locationId);
  return {
    queueNumber: order.queueNumber || `Q${Date.parse(order.paidAt)}-${order.transactionId.slice(-8)}`,
    kitchenStatus: order.kitchenStatus || 'received',
    locationName: order.locationName || location?.name || '',
  };
}

export function normalizeKitchenDisplays(value, site) {
  if (!Array.isArray(value) || value.length > 12) throw invalid('Use up to 12 kitchen stations. / Usa hasta 12 estaciones de cocina.');
  const locations = new Set((site.business?.locations || []).map(location => location.id));
  const products = new Set((site.catalog || []).filter(item => item.type === 'product').map(item => item.id));
  const existing = new Map((site.kitchenDisplays || []).map(display => [display.id, display]));
  const ids = new Set();
  return value.map(display => {
    const { id, limit } = display || {};
    const name = typeof display?.name === 'string' ? display.name.trim() : '';
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(id) || ids.has(id) || !name || name.length > 80
      || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw invalid('Enter a valid station name and order limit. / Ingresa un nombre y un límite de órdenes válidos.');
    }
    ids.add(id);
    const select = (values, allowed, previous = []) => {
      if (!Array.isArray(values) || values.length > 100 || values.some(item => !allowed.has(item) && !previous.includes(item))) {
        throw invalid('Invalid station filter. / Filtro de estación inválido.');
      }
      return [...new Set(values)];
    };
    const columns = select(display.columns, new Set(kitchenColumns));
    if (!columns.some(status => kitchenStatuses.includes(status))) throw invalid('Show at least one active column. / Muestra al menos una columna operativa.');
    return {
      id, name, limit, columns, enabled: display.enabled !== false, hideCustomer: display.hideCustomer === true,
      hideOrderId: display.hideOrderId === true, hideChannel: display.hideChannel === true,
      locationIds: select(display.locationIds, locations, existing.get(id)?.locationIds),
      productIds: select(display.productIds, products, existing.get(id)?.productIds),
      channels: select(display.channels, new Set(kitchenChannels)),
    };
  });
}
