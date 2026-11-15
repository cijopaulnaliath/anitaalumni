export const memberMetricLinks=[
 {label:'Members',summary:'members',href:'/admin?section=registrations&status=all'},
 {label:'Approved',summary:'approved',href:'/admin?section=registrations&status=approved'},
 {label:'Awaiting review',summary:'pending',href:'/admin?section=registrations&status=pending'},
 {label:'Test profiles',summary:'tests',href:'/admin?section=operations&view=test'}
] as const;
export function adminLinkState(search:string){const p=new URLSearchParams(search),status=p.get('status')||'all',view=p.get('view')||'active';return{section:p.get('section')==='registrations'?'members':p.get('section')==='community'?'network':p.get('section')==='hub'?'hub':'operations',status:['all','approved','pending','rejected'].includes(status)?status:'all',view:['active','test','removed'].includes(view)?view:'active',memberList:p.get('section')==='operations'&&['active','test','removed'].includes(p.get('view')||'')};}
export function matchesReviewStatus(member:{verification:string},status:string){return status==='all'||member.verification===status;}
