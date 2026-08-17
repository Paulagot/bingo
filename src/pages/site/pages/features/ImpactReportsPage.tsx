import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { featurePages } from '../../content/features';

export default function ImpactReportsPage() {
  const content = featurePages['impact-reports'];
  return <MarketingPageTemplate content={content!} templateType="feature" />;
}
