import {assertSameOrigin,requireClientUser} from '../lib/client-auth.mjs';
import {portalPreferenceStore,emailHash} from '../lib/client-store.mjs';
import {createPortalPreferences} from '../lib/portal-preferences.mjs';
export default createPortalPreferences({authenticate:requireClientUser,assertOrigin:assertSameOrigin,store:portalPreferenceStore,keyForUser:user=>`${emailHash(user.email)}.json`});
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
