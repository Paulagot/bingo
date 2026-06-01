import { IndexPageTemplate } from '../../components/templates/IndexPageTemplate';

export default function UseCasesIndexPage() {
  return (
    <IndexPageTemplate
      path="/use-cases"
      seoTitle="FundRaisely Use Cases for Clubs, Schools, Charities and Community Groups"
      seoDescription="Explore how FundRaisely supports sports clubs, schools, PTAs, charities and community groups with fundraising campaigns, events, games, payment tracking and reports."
      eyebrow="Use cases"
      h1="Fundraising tools for the people organising local events"
      intro="FundRaisely is built for volunteer-led organisations that need practical ways to run fundraisers, track payments and report clearly on what was raised."
      imageKey="communityCelebration"
      cards={[
        {
          title: 'Sports clubs',
          text: 'For club committees, teams, parents and members raising money for kit, travel, facilities and community events.',
          to: '/use-cases/sports-clubs',
        },
        {
          title: 'Schools & PTAs',
          text: 'For school fundraisers, parent groups and community events that need simple setup, payment tracking and reports.',
          to: '/use-cases/schools-ptas',
        },
        {
          title: 'Charities',
          text: 'For charities and nonprofits running events, supporter campaigns and prize-led fundraisers with clearer records.',
          to: '/use-cases/charities',
        },
        {
          title: 'Community groups',
          text: 'For local organisers and volunteer groups running practical fundraisers with cash, instant payments, tickets and reports.',
          to: '/use-cases/community-groups',
        },
      ]}
      faqs={[
        {
          question: 'Who is FundRaisely built for?',
          answer:
            'FundRaisely is built for clubs, schools, PTAs, charities, nonprofits and community groups that need better ways to run fundraisers and track the money collected.',
        },
        {
          question: 'Why are there different use-case pages?',
          answer:
            'Each type of organisation has different fundraising pressures, but they often share the same need: campaigns, events, payment tracking, reports and repeatable fundraising ideas.',
        },
      ]}
    />
  );
}
