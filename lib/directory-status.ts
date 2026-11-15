export type ListingMember={visible?:number|boolean|null;verification?:string;email_verified_at?:string|null;enrollment?:string;is_test?:number;archived_at?:string|null};
export function directoryStatus(member:ListingMember){
 if(member.archived_at)return{listed:false,reason:'Registration is removed.'};
 if(member.is_test)return{listed:false,reason:'Test profiles stay private.'};
 if(member.enrollment!=='alumni')return{listed:false,reason:'Event-only registration is not enrolled in the alumni directory.'};
 if(member.verification!=='approved')return{listed:false,reason:member.verification==='rejected'?'School connection was not approved.':'School approval is pending.'};
 if(!member.email_verified_at)return{listed:false,reason:'Email verification is pending.'};
 if(member.visible!==1&&member.visible!==true)return{listed:false,reason:'The member has not opted into public directory listing. They can enable “Show my approved profile and photograph in the public directory” in My account, then save their profile.'};
 return{listed:true,reason:'Approved, email verified, and public directory listing enabled.'};
}
