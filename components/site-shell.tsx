'use client';
import {SiteText} from './site-content';
import {useRef,useState} from 'react';
import {Menu,X,ArrowUpRight} from 'lucide-react';
import ProfileIndicator from './profile-indicator';
export const siteLinks=[['About us','/about'],['Events','/events'],['Volunteer','/volunteer'],['Mentoring','/mentoring'],['Advisory board','/advisory-board'],['Batch leaders','/batch-leaders'],['Vision & objectives','/vision'],['Reunion gallery','/gallery'],['Alumni projects','/projects'],['Updates','/updates'],['Contact us','/contact'],['FAQs','/faq'],['How verification works','/verification']];
export function SiteHeader({onProfile}:{onProfile?:()=>void}){const[open,setOpen]=useState(false);const menuToggle=useRef<HTMLButtonElement>(null);return <><div className="topbar"><span>Love and Serve · Anita Vidyalaya HSS Alumni</span><a href="https://anitavidyalayahss.com/" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">Our school <ArrowUpRight size={12}/></a></div><header className="community-header" onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.currentTarget.querySelectorAll('details[open]').forEach(el=>el.removeAttribute('open'));menuToggle.current?.focus()}}}><a href="/" className="brand" aria-label="Anita Alumni home"><span className="brand-symbol"><img src="/alumni-logo.png" alt="Anita Alumni emblem" width="1254" height="1254"/></span><span className="brand-wordmark"><strong>ANITA <em>ALUMNI</em></strong><small>LOVE AND SERVE</small></span><span className="brand-school">Anita Vidyalaya HSS · Thannipuzha · Kalady</span></a><nav id="main-navigation" aria-label="Main navigation" onClick={e=>{if((e.target as Element).closest('a'))setOpen(false)}} className={open?'open':''}><a href="/">Home</a><a href="/alumni">Find alumni</a><a href="/events">Events</a><a href="/register" className="nav-register">Register</a><details className="community-menu"><summary>Our community</summary><div>{siteLinks.filter(x=>x[1]!=='/events').map(([label,url])=><a href={url} key={url}>{label}</a>)}</div></details><a href="/donate">Membership & giving</a><a href="/account">My account</a><a className="mobile-school-link" href="https://anitavidyalayahss.com/" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">Visit our school <ArrowUpRight size={16} aria-hidden="true"/></a></nav><div className="header-actions"><ProfileIndicator/><a href="/register" className="btn small header-join">Register <ArrowUpRight size={16}/></a><button type="button" ref={menuToggle} className="menu-toggle" aria-controls="main-navigation" aria-expanded={open} aria-label="Toggle navigation" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div></header></>}
const footerGroups=[
 {title:'Our community',links:[['About us','/about'],['Vision & objectives','/vision'],['Advisory board','/advisory-board'],['Batch leaders','/batch-leaders'],['Reunion gallery','/gallery'],['Updates','/updates']]},
 {title:'Connect & contribute',links:[['Find alumni','/alumni'],['Events & reunions','/events'],['Mentoring','/mentoring'],['Volunteer','/volunteer'],['Alumni projects','/projects'],['Membership & donations','/donate']]},
 {title:'Here to help',links:[['My account','/account'],['Contact us','/contact'],['Frequently asked questions','/faq'],['How verification works','/verification'],['Visit our school','https://anitavidyalayahss.com/']]}
];
export function SiteFooter(){return <footer className="community-footer alumni-footer" aria-label="Anita Alumni footer">
 <div className="footer-main">
  <div className="footer-identity">
   <a href="/" className="footer-brand" aria-label="Anita Alumni home"><span className="footer-emblem" aria-hidden="true"><img src="/alumni-logo.png" alt="" width="1254" height="1254"/></span><span>Anita Alumni<small>LOVE AND SERVE</small></span></a>
   <p><SiteText id="site-shell.text.1">One school.<br/>A lifetime of connection.</SiteText></p>
   <span className="footer-location">Anita Vidyalaya HSS<br/>Thannipuzha · Kalady · Kerala</span>
   <a href="/register" className="footer-register">Become a member <ArrowUpRight size={17} aria-hidden="true"/></a>
  </div>
  {footerGroups.map(group=><nav className="footer-link-group" key={group.title} aria-label={group.title+' footer links'}><h2>{group.title}</h2><ul>{group.links.map(([label,url])=><li key={url}><a href={url} target={url.startsWith('https://')?'_blank':undefined} rel={url.startsWith('https://')?'noopener noreferrer':undefined}>{label}</a></li>)}</ul></nav>)}
 </div>
 <div className="footer-bottom"><p>© {new Date().getFullYear()} Anita Alumni. All rights reserved.</p><nav aria-label="Legal and administration"><a href="/terms">Terms of use</a><a href="/privacy">Privacy</a><a href="/payment-terms">Payment terms</a><a href="/admin">Administration</a></nav></div>
 <p className="footer-governance"><SiteText id="site-shell.text.2">Proposed alumni-led association. School endorsement and formal governance are pending.</SiteText></p>
 </footer>}
