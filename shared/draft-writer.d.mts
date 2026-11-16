export function createDraftWriter<T>(write:(value:T)=>void,options?:{delay?:number}):{schedule(value:T):void;flush():void;cancel():void};
