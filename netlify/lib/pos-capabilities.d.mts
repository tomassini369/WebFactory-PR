export type PosProfile = 'auto' | 'restaurant' | 'barber' | 'salon' | 'retail' | 'workshop' | 'general';
export type PosOperations = { cashierEnabled: boolean; displayEnabled: boolean; profile: PosProfile; revision: number };
export type PosCapabilities = { profile: Exclude<PosProfile, 'auto'>; products: boolean; services: boolean; appointments: boolean; inventory: boolean; kitchen: boolean; professionals: boolean; serviceFirst: boolean };
export const POS_PROFILES: PosProfile[];
export function posOperations(configuration?: { operations?: PosOperations } | null): PosOperations;
export function posCapabilities(site?: { business?: { category?: string }; design?: { templateCategory?: string }; catalog?: { type: string; active?: boolean; requiresAppointment?: boolean; trackInventory?: boolean }[]; employees?: { active?: boolean }[] }, operations?: PosOperations): PosCapabilities;
