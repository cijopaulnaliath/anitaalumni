type CheckoutJS={onLoad:(cb:()=>void)=>void;init:(config:Record<string,unknown>)=>Promise<void>;invoke:()=>void;close:()=>void};
declare global{interface Window{Paytm?:{CheckoutJS:CheckoutJS}}}
let ready:Promise<void>|null=null;
export async function openPaytm(d:{host?:string;mid?:string;txnToken?:string;orderId:string;amount:number},complete:()=>void,closed:()=>void){
 if(!['https://secure.paytmpayments.com','https://securestage.paytmpayments.com'].includes(d.host||'')||!d.mid||!/^[a-zA-Z0-9]+$/.test(d.mid)||!d.txnToken)throw Error('Paytm checkout configuration is unavailable.');
 if(!ready)ready=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');const timeout=window.setTimeout(()=>{ready=null;script.remove();reject(Error('Paytm checkout timed out. Check payment status before trying again.'))},20000);script.src=d.host+'/merchantpgpui/checkoutjs/merchants/'+encodeURIComponent(d.mid!)+'.js';script.onload=()=>{if(!window.Paytm?.CheckoutJS){clearTimeout(timeout);ready=null;reject(Error('Paytm checkout could not load'));return;}window.Paytm.CheckoutJS.onLoad(()=>{clearTimeout(timeout);resolve()})};script.onerror=()=>{clearTimeout(timeout);ready=null;script.remove();reject(Error('Paytm checkout could not load. Please try again.'))};document.head.appendChild(script)});
 await ready;const checkout=window.Paytm!.CheckoutJS;
 await checkout.init({root:'',flow:'DEFAULT',data:{orderId:d.orderId,token:d.txnToken,tokenType:'TXN_TOKEN',amount:(d.amount/100).toFixed(2)},merchant:{redirect:true},handler:{notifyMerchant:function(event:string){if(event==='APP_CLOSED'||event==='SESSION_EXPIRED')closed()},transactionStatus:function(){checkout.close();window.setTimeout(complete,0)}}});checkout.invoke();
}
