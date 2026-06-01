import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { featurePages } from '../../content/features';
export default function PaymentsPage() { return <MarketingPageTemplate content={featurePages['payments']} templateType="feature" />; }
