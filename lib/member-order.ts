const names=new Intl.Collator('en',{sensitivity:'base',numeric:true});
// Registration stores a full name; its first word is used as the first name.
export function compareMemberNames(a:{name:string;id?:string},b:{name:string;id?:string}){const left=a.name.trim(),right=b.name.trim();return names.compare(left.split(/\s+/)[0],right.split(/\s+/)[0])||names.compare(left,right)||(a.id||'').localeCompare(b.id||'');}
// Show newest batches first, then first names alphabetically within each batch.
export function compareDirectoryMembers(a:{year:number;name:string;id?:string},b:{year:number;name:string;id?:string}){return b.year-a.year||compareMemberNames(a,b);}
