export type ContactVerification={email_verified_at?:string|null;phone_verified_at?:string|null};
export function contactVerified(member:ContactVerification|null|undefined){return !!(member?.email_verified_at||member?.phone_verified_at)}
