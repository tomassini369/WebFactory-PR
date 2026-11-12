export type SocialLink={id:string;url:string};
export const socialPlatforms:Array<{id:string;label:string;hosts:string[]}>;
export function normalizeSocialLinks(input:unknown):SocialLink[];
export function businessSocialLinks(business:unknown,features?:Record<string,unknown>):SocialLink[];
