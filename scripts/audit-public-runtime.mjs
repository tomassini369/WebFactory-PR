// Read-only probes: no logins, passwords, recovery emails or provider mutations.
const base=process.argv[2]||'https://webfactorypr.com';
if(!/^https:\/\/[^/]+$/.test(base))throw Error('Pass an HTTPS origin without a trailing slash');
const checks=[['/',200],['/templates',200],['/builder',200],['/client-admin/',200],['/webfactory-admin/',200],['/.netlify/functions/portal-session',200],['/.netlify/functions/booking-reminder-health',401],['/.netlify/functions/tenant-backup-health',401]];
const report={origin:base,checkedAt:new Date().toISOString(),readOnly:true,results:[]};
for(const [path,expected] of checks){
 try{const response=await fetch(base+path,{redirect:'follow',signal:AbortSignal.timeout(20000)});report.results.push({path,status:response.status,expected,ok:response.status===expected,cacheControl:response.headers.get('cache-control')});await response.body?.cancel()}
 catch{report.results.push({path,ok:false,issue:'request_failed'})}
}
console.log(JSON.stringify(report,null,2));if(report.results.some(row=>!row.ok))process.exitCode=1;
