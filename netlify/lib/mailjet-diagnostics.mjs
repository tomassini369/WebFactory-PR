import nodemailer from 'nodemailer';
const env=name=>globalThis.Netlify?.env?.get(name)||'';
export async function verifyMailjetCredentials({read=env,createTransport=nodemailer.createTransport,fetcher=fetch}={}){
 const checkedAt=new Date().toISOString(),key=read('MAILJET_API_KEY'),secret=read('MAILJET_SECRET_KEY');
 if(!key||!secret)return {authenticated:false,checkedAt,issue:'credentials_missing'};
 const port=Number(read('MAILJET_SMTP_PORT')||587);
 if(![465,587].includes(port)||!['','in-v3.mailjet.com'].includes(read('MAILJET_SMTP_HOST')))return {authenticated:false,checkedAt,issue:'smtp_configuration_invalid'};
 let apiStatus=null;
 try{const response=await fetcher('https://api.mailjet.com/v3/REST/myprofile',{headers:{Authorization:`Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`},signal:AbortSignal.timeout(8000)});apiStatus=response.status;await response.body?.cancel();}catch{}
 const transport=createTransport({host:'in-v3.mailjet.com',port,secure:port===465,requireTLS:port===587,auth:{user:key,pass:secret},connectionTimeout:5000,greetingTimeout:5000,socketTimeout:8000});
 let timer,smtpAuthenticated=false,smtpStatus=null;
 try{await Promise.race([transport.verify(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),10000)})]);smtpAuthenticated=true;}catch(error){smtpStatus=Number.isInteger(error.responseCode)?error.responseCode:null;}finally{clearTimeout(timer);transport.close();}
 return {authenticated:smtpAuthenticated,checkedAt,apiStatus,smtpAuthenticated,smtpStatus,issue:smtpAuthenticated?null:smtpStatus===535?'smtp_authentication_failed':'smtp_connection_failed'};
}
