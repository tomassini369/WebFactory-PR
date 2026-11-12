export type MembershipId='basic'|'standard'|'premium';
export type MembershipInterval='monthly'|'annual';
export const membershipPlans:Readonly<Record<MembershipId,Readonly<{name:string;nameEn:string;monthly:number;annual:number}>>>;
export const membershipIds:readonly MembershipId[];
export const membershipTrialDays:number;
export const membershipConsentVersion:string;
export function isMembershipId(value:unknown):value is MembershipId;
