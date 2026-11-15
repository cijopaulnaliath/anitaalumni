export const helpCategories=['Mentoring & careers','Learning & skills','Local guidance','Community service','School support','Other'] as const;
export type HubPost={id:string;kind:'help'|'memory';ownerId:string|null;author:string;batch:number|null;title:string;details:string;category:string;helpType:'offer'|'need';memoryYear:number|null;location:string;image:string|null;imageAlt:string;status:'pending'|'published'|'rejected'|'closed'|'withdrawn';permission:boolean;created:string;updated:string;expires:string|null;reviewedBy:string|null;reviewedAt:string|null};
export type ImpactReport={id:string;initiative:string;title:string;details:string;periodStart:string;periodEnd:string;volunteerHours:number;mentoringCount:number;spendingPaise:number;sourceRef:string;status:'draft'|'published'|'withdrawn';actor:string;verifiedBy:string|null;verifiedAt:string|null;created:string;updated:string};
export type ImpactRegister={reports:ImpactReport[]};
export type PublicPost=Omit<HubPost,'ownerId'|'permission'|'reviewedBy'|'reviewedAt'|'image'>&{contactMemberId:string|null;imageUrl:string|null};
export type PublicImpact=Omit<ImpactReport,'sourceRef'|'actor'|'verifiedBy'>;
