import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { gamePages } from '../../content/games';
export default function PuzzleChallengesPage() { return <MarketingPageTemplate content={gamePages['puzzle-challenges']} templateType="game" />; }
