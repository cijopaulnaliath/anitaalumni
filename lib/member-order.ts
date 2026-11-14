const names=new Intl.Collator('en',{sensitivity:'base',numeric:true});
// Registration stores a full name; its first word is used as the first name.
export function compareMemberNames(a:{name:string;id?:string},b:{name:string;id?:string}){const left=a.name.trim(),right=b.name.trim();return names.compare(left.split(/\s+/)[0],right.split(/\s+/)[0])||names.compare(left,right)||(a.id||'').localeCompare(b.id||'');}
