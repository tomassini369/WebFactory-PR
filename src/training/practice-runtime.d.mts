export type PracticeEvent = {name: string; detail?: any}
export type PracticeOptions = {role: string; capabilities: string[]; design?: any; category?: string; operations?: any; snapshot?: any; now?: () => number}
export type PracticeRuntime = {
 siteId: string; user: any; membership: {role: string; capabilities: string[]}; operations: any; site: any;
 fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
 subscribe: (listener: (event: PracticeEvent) => void) => () => void;
 emit: (name: string, detail?: any) => void;
 draft: (site: any) => void; snapshot: () => any;
 ui: Record<string, any>; setUi: (key: string, value: any) => void;
 setSurface: (surface: string) => void; surface: string;
}
export function createPracticeRuntime(options: PracticeOptions): PracticeRuntime
