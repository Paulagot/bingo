import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { useCasePages } from '../../content/useCases';
export default function SchoolsPage() { return <MarketingPageTemplate content={useCasePages['schools-ptas']} templateType="use-case" />; }
