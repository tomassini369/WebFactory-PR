import nodemailer from 'nodemailer';
const env=name=>globalThis.Netlify?.env?.get(name)||'';
export async function verifyResendCredentials({read=env,createTransport=nodemailer.createTransport}={}){
 const checkedAt=new Date().toISOString(),key=read('RESEND_API_KEY').trim();
 if(!key)return {authenticated:false,checkedAt,issue:'credentials_missing'};
 const transport=createTransport({host:'smtp.resend.com',port:465,secure:true,auth:{user:'resend',pass:key},connectionTimeout:5000,greetingTimeout:5000,socketTimeout:8000});
 let timer,smtpAuthenticated=false,smtpStatus=null;
 try{await Promise.race([transport.verify(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),10000)})]);smtpAuthenticated=true;}
 catch(error){smtpStatus=Number.isInteger(error.responseCode)?error.responseCode:null;}
 finally{clearTimeout(timer);transport.close();}
 return {authenticated:smtpAuthenticated,checkedAt,smtpAuthenticated,smtpStatus,issue:smtpAuthenticated?null:smtpStatus===535?'smtp_authentication_failed':'smtp_connection_failed'};
}
