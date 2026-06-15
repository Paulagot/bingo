import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { featurePages } from '../../content/features';

export default function ImpactReportsPage() {
  return <MarketingPageTemplate content={featurePages['impact-reports']} templateType="feature" />;
}
