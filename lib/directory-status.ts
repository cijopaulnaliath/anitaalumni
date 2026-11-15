export type ListingMember={visible?:number|boolean|null;verification?:string;email_verified_at?:string|null;enrollment?:string;is_test?:number;archived_at?:string|null};
export function directoryStatus(member:ListingMember){
 if(member.archived_at)return{listed:false,reason:'Registration is removed.'};
 if(member.is_test)return{listed:false,reason:'Test profiles stay private.'};
 if(member.enrollment!=='alumni')return{listed:false,reason:'Event-only registration is not enrolled in the alumni directory.'};
 if(member.verification!=='approved')return{listed:false,reason:member.verification==='rejected'?'School connection was not approved.':'School approval is pending.'};
 if(!member.email_verified_at)return{listed:false,reason:'Email verification is pending.'};
 return{listed:true,reason:'Approved alumni profiles with verified email are listed automatically.'};
}
