export class HttpError extends Error { status:number;code:string;retryable:boolean;constructor(message:string,options?:{status?:number;code?:string;retryable?:boolean}); }
export function requestJson(input:string|URL|Request,init?:RequestInit,options?:{fetcher?:typeof fetch;timeoutMs?:number;errorMessage?:string;requireOk?:boolean;retry?:boolean}):Promise<any>;
