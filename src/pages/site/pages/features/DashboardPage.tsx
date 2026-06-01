import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { featurePages } from '../../content/features';
export default function DashboardPage() { return <MarketingPageTemplate content={featurePages['dashboard']} templateType="feature" />; }
