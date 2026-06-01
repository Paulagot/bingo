import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { featurePages } from '../../content/features';
export default function ReportsPage() { return <MarketingPageTemplate content={featurePages['reports']} templateType="feature" />; }
