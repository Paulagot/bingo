import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { useCasePages } from '../../content/useCases';
export default function CharitiesPage() { return <MarketingPageTemplate content={useCasePages['charities']} templateType="use-case" />; }
