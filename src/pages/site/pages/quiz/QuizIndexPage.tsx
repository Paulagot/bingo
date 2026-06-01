import { MarketingPageTemplate } from '../../components/templates/MarketingPageTemplate';
import { quizPages } from '../../content/quiz';
export default function QuizIndexPage() { return <MarketingPageTemplate content={quizPages.index} templateType="quiz" />; }
