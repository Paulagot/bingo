import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { featurePages } from '../../content/features';
export default function TicketingPage() { return <MarketingPageTemplate content={featurePages['ticketing']!} templateType="feature" />; }
