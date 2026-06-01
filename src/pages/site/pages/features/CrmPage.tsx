import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { featurePages } from '../../content/features';
export default function CrmPage() { return <MarketingPageTemplate content={featurePages['crm']} templateType="feature" />; }
