export type AdminMember={id:string;name:string;email:string;phone:string;year:number;level:string;country:string;city:string;profession:string;verification:string;enrollment:string;visible:number;is_test:number;email_verified_at:string|null;email_updates_opt_in:number;whatsapp_updates_opt_in:number;whatsapp_consent_at:string|null;fee_commitment_at:string|null;archived_at:string|null;created:string};
export type Budget={id:string;year:number;category:string;amount:number;updated:string;actor:string};
export type Ledger={id:string;date:string;kind:'income'|'expense';category:string;description:string;amount:number;actor:string;created:string;voided_at:string|null};
export type Campaign={id:string;subject:string;body:string;year:number|null;status:string;actor:string;created:string;lease_until:number|null;counts?:Record<string,number>};
export type Recipient={id:string;campaign_id:string;member_id:string;email:string;status:string;batch_id:string|null;provider_id:string|null;updated:string};
export type PasswordRecord={hash:string;mustChange:boolean};
export function moneyValue(value:unknown,zero=false){const raw=String(value);if(!/^\d+(\.\d{1,2})?$/.test(raw))throw Error('Use an INR amount with at most two decimal places.');const n=Math.round(Number(raw)*100);if(!Number.isSafeInteger(n)||n<(zero?0:1)||n>10000000000)throw Error('Amount is outside the supported range.');return n;}
export function csvCell(v:unknown){let s=String(v??'');if(/^\s*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function csvRows(rows:Record<string,unknown>[]){const columns=Object.keys(rows[0]||{});return '\uFEFF'+[columns.map(csvCell).join(','),...rows.map(r=>columns.map(k=>csvCell(r[k])).join(','))].join('\r\n');}

export function validReportDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
