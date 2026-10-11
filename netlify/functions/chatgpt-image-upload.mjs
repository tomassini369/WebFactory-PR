import {receiveImageUpload} from '../lib/chatgpt-assets.mjs';
export default receiveImageUpload;
export const config={rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip']}};
