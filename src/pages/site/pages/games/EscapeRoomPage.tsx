import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { gamePages } from '../../content/games';
export default function EscapeRoomPage() { return <MarketingPageTemplate content={gamePages['escape-room']} templateType="game" />; }
