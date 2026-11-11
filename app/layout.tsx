import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#173f35'};
export const metadata:Metadata={title:'Anita Alumni — Love and Serve',description:'Reconnect with your Anita Vidyalaya classmates. Find your batch, mentor the next generation, and serve our community.',icons:{icon:'/alumni-logo.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to main content</a>{children}</body></html>}
