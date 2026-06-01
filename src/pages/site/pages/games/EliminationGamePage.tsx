import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { gamePages } from '../../content/games';
export default function EliminationGamePage() { return <MarketingPageTemplate content={gamePages.elimination} templateType="game" />; }
