import {clientSiteStore,clientCommerceStore,clientEventStore,getClientSite} from '../lib/client-store.mjs';
import {sendBookingReminders} from '../lib/booking-reminders.mjs';
import {createBookingReminderProcessor} from '../lib/booking-reminder-processor.mjs';
import {googleConfigured} from '../lib/google-calendar.mjs';
export default async(req,context)=>{
 if(context.deploy?.context!=='production'||context.deploy?.published!==true)return;
 const result=await createBookingReminderProcessor({sites:clientSiteStore(),commerce:clientCommerceStore(),events:clientEventStore(),getSite:getClientSite,send:sendBookingReminders,configured:googleConfigured})();
 console.log(`booking-reminders sent=${result.sent} uncertain=${result.uncertain} errors=${result.errors} paused=${result.paused}`);
};
export const config={schedule:'*/5 * * * *'};
