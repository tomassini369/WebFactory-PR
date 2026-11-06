import {createContentClaimsHandler} from './content-claims.mjs';
// Public intake keeps its stricter abuse budget separate from authenticated review.
export default createContentClaimsHandler({intakeOnly:true});
export const config={rateLimit:{windowLimit:5,windowSize:60,aggregateBy:['ip']}};
