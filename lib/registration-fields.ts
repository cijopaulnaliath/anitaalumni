export const participationOptions = ['Registration desk','Batch representative','Invite classmates','Mentoring / career guidance','School memories and events'] as const;
export const enrollmentOptions = [{value:'alumni',label:'Yes, enroll me in the alumni network'},{value:'event',label:'No, event registration only'}] as const;
export function normalizePhone(raw:string){const phone=raw.replace(/[\s()\-]/g,'');return /^\+[1-9]\d{6,14}$/.test(phone)?phone:null;}
export const duplicateEmailMessage='This email address is already registered. Please use My profile or contact the alumni team.';
