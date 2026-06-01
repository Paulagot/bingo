import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
export default function NotFoundPage() { return <><SEO title="Page Not Found" description="The page you are looking for could not be found." noindex /><section className="section not-found"><div className="site-shell"><p className="eyebrow">404</p><h1>That page could not be found</h1><p>The route may have moved, or the page may not exist yet.</p><Link className="button button--primary-dark" to="/">Go to homepage</Link></div></section></>; }
