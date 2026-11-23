export const schoolCopy={
 'school.label':{label:'Page eyebrow',text:'OUR SCHOOL. OUR SHARED BEGINNING.'},
 'school.title':{label:'Page title',text:'About our School.'},
 'school.intro':{label:'Introduction',text:'Anita Vidyalaya Higher Secondary School · Thannipuzha, Kalady, Kerala'},
 'school.history.title':{label:'School history heading',text:'Learning with values, since 1974.'},
 'school.history':{label:'School history',text:'Founded in 1974 by the Sisters of St. Anne, Bangalore (SAB), Anita Vidyalaya Higher Secondary School follows the Kerala State syllabus and serves children from Thannipuzha and neighbouring communities.'},
 'school.values':{label:'Educational values',text:'The school reflects SAB’s educational vision, shared across more than 100 institutions in India: bringing spiritual and secular learning together, balancing heritage with modernity, cooperation with competitiveness, technology with human concern, and independence with social responsibility.'},
 'school.community':{label:'School community',text:'In partnership with families and the wider community, the school supports academic learning, personal values, and the development of each child’s spirit, mind, and character.'}
} as const;
export const schoolContentFields=Object.entries(schoolCopy).map(([key,value])=>({key,group:'About our School',label:value.label,defaultValue:value.text,kind:'text' as const}));
