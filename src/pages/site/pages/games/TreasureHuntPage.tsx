import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { gamePages } from '../../content/games';
export default function TreasureHuntPage() { return <MarketingPageTemplate content={gamePages['treasure-hunt']} templateType="game" />; }
