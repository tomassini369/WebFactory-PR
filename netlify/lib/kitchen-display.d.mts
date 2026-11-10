export type KitchenStatus = 'received' | 'preparing' | 'ready' | 'completed';
export type KitchenColumn = KitchenStatus | 'on_hold';
export type KitchenChannel = 'storefront' | 'pos' | 'kiosk';
export type KitchenChange = { kitchenStatus: KitchenStatus } | { kitchenPause: true } | { kitchenEtaMinutes: 5 | 10 | 15 | 20 | 30 | 45 } | { kitchenEtaTime: string };
export type KitchenDisplay = {
  id: string; name: string; limit: number; columns: KitchenColumn[]; enabled: boolean;
  hideCustomer: boolean; hideOrderId: boolean; hideChannel: boolean;
  locationIds: string[]; productIds: string[]; channels: KitchenChannel[];
};
export const kitchenWaitTimes: Array<5 | 10 | 15 | 20 | 30 | 45>;
export const kitchenStatuses: KitchenStatus[];
export const kitchenColumns: KitchenColumn[];
export const kitchenChannels: KitchenChannel[];
export function kitchenChannel(order: {channel?: string; source?: string}): KitchenChannel | '';
export function isKitchenOrder(order: {kind: string; queueNumber?: string; paymentStatus: string; status: string; posRecoveryNeeded?: boolean}): boolean;
