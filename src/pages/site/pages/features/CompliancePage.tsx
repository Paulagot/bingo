import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { featurePages } from '../../content/features';
export default function CompliancePage() { return <MarketingPageTemplate content={featurePages['compliance']} templateType="feature" />; }
