import {getSupport} from './engagement-store';
import {settings} from './payments';
export async function paymentReadiness(){const s=settings();if(!s.enabled)return false;if(s.mode==='test')return true;const support=await getSupport();return !!(support.email&&support.contactName&&support.responseTime&&support.refundPolicy);}
