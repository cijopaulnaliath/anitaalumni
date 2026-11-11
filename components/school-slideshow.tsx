'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';

const slides=[
 {src:'/school/slides/classroom-wing.webp',alt:'The classroom wing and courtyard at Anita Vidyalaya Higher Secondary School',label:'OUR CAMPUS. OUR ROOTS.',title:['The place where','our stories began.'],caption:'Familiar corridors. A lifetime of memories.'},
 {src:'/school/slides/students-and-teachers.webp',alt:'Students and teachers gathered for a class photograph at Anita Vidyalaya HSS',label:'OUR SCHOOL. OUR STORY.',title:['A place in our hearts.','A part of who we are.'],caption:'The years pass. The bond stays.'},
 {src:'/school/slides/school-celebration.webp',alt:'Students performing together on an outdoor stage at the school',label:'TALENT. TOGETHERNESS.',title:['Where confidence','found its stage.'],caption:'The moments that brought us together.'},
 {src:'/school/slides/student-achievements.webp',alt:'Anita Vidyalaya students with certificates and a trophy at a school gathering',label:'LEARNING. GROWING.',title:['Small beginnings.','Shared achievements.'],caption:'Every step forward becomes part of our story.'},
 {src:'/school/slides/our-teachers.webp',alt:'The teaching community gathered for a photograph at Anita Vidyalaya HSS',label:'OUR TEACHERS. OUR GRATITUDE.',title:['The people who','helped us become.'],caption:'Remembering the guidance that stays with us.'}
];

export default function SchoolSlideshow(){
 const[active,setActive]=useState(0),[playing,setPlaying]=useState(false),[hovered,setHovered]=useState(false),[focusPaused,setFocusPaused]=useState(false),[visible,setVisible]=useState(true);
 useEffect(()=>{const motion=window.matchMedia('(prefers-reduced-motion: reduce)');setPlaying(!motion.matches);const reduce=()=>{if(motion.matches)setPlaying(false)};motion.addEventListener('change',reduce);const visibility=()=>setVisible(!document.hidden);visibility();document.addEventListener('visibilitychange',visibility);return()=>{motion.removeEventListener('change',reduce);document.removeEventListener('visibilitychange',visibility)}},[]);
 const rotating=playing&&!hovered&&!focusPaused&&visible;
 useEffect(()=>{if(!rotating)return;const timer=window.setInterval(()=>setActive(i=>(i+1)%slides.length),6500);return()=>window.clearInterval(timer)},[rotating,active]);
 function choose(index:number){setActive((index+slides.length)%slides.length);setPlaying(false)}
 const slide=slides[active];
 return <section className="hero-visual school-slideshow" aria-label="Photographs from our school" aria-roledescription="carousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocusPaused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocusPaused(false)}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();choose(active+1)}if(e.key==='ArrowLeft'){e.preventDefault();choose(active-1)}}}>
  <div className="school-slides-viewport">
   {slides.map((item,i)=><div key={item.src} className={'school-slide'+(active===i?' is-active':'')} aria-hidden={active!==i} role="group" aria-roledescription="slide" aria-label={`${i+1} of ${slides.length}`}><img src={item.src} alt={active===i?item.alt:''} width={1349} height={500} loading={i===0?'eager':'lazy'} decoding="async" fetchPriority={i===0?'high':'auto'}/></div>)}
  </div>
  <div className="school-photo-caption" aria-live={rotating?'off':'polite'} aria-atomic="true"><div className="school-photo-heading"><small>{slide.label}</small><span>Thannipuzha · Kalady · Kerala</span></div><h2>{slide.title[0]}<br/>{slide.title[1]}</h2><p>{slide.caption}</p></div>
  <button type="button" className="slideshow-keyboard-pause sr-only" onClick={()=>{setPlaying(v=>!v);setFocusPaused(false)}}>{playing?'Pause slideshow':'Play slideshow'}</button>
  <div className="school-photo-credit"><span>A glimpse of the place we call home.</span><a href="https://anitavidyalayahss.com/">Photos: our school <ArrowUpRight size={12}/></a></div>
 </section>
}
