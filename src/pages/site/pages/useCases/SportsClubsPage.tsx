import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { useCasePages } from '../../content/useCases';
export default function SportsClubsPage() { return <MarketingPageTemplate content={useCasePages['sports-clubs']} templateType="use-case" />; }
