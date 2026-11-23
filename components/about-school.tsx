'use client';
import {SiteHeader,SiteFooter} from './site-shell';
import {SiteText,useSiteImage} from './site-content';
import {schoolCopy} from '@/lib/school-content';
function Copy({id}:{id:keyof typeof schoolCopy}){return <SiteText id={id}>{schoolCopy[id].text}</SiteText>}
export default function AboutSchool(){
 const image=useSiteImage();
 return <><SiteHeader/><main id="main-content" tabIndex={-1} className="community-page">
  <div className="community-hero"><div className="eyebrow"><Copy id="school.label"/></div><h1><Copy id="school.title"/></h1><p><Copy id="school.intro"/></p></div>
  <div className="about-layout"><img src={image('about.photo','/campus.png')} alt="Anita Vidyalaya school community"/><article><h2><Copy id="school.history.title"/></h2><p><Copy id="school.history"/></p><p><Copy id="school.values"/></p><p><Copy id="school.community"/></p><a className="btn" href="https://anitavidyalayahss.com/about-us/" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">Read the school’s official About Us page</a></article></div>
  <p className="fine-print">Source: <a href="https://anitavidyalayahss.com/about-us/" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">Anita Vidyalaya HSS — About Us</a>. Summarized for our alumni community.</p>
  <div className="page-link-grid"><a href="/about">About the alumni association</a><a href="/memories">School memories</a><a href="https://anitavidyalayahss.com/" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">Visit the school website</a></div>
 </main><SiteFooter/></>;
}
