import React, { useState } from 'react';
import  {Header} from '../components/GeneralSite/Header';
import Hfooter from '../components/GeneralSite/hFooter';
import { SEO } from '../components/SEO';

type UpdateItem = {
  id: number;
  title: string;
  date: string;
  description: string;
  image: string;
  video?: string | null;
  cta?: { label: string; url: string };
};

const updates: UpdateItem[] = [
     {
    id: 9,
    title: 'Stellar Ireland Hackathon',
    date: 'July 2025',
    description:
      'We are thrilled to announce that we will be participating in the Stellar Ireland Hackathon on July 19th. This event is a fantastic opportunity for us to showcase our platform and connect with the Stellar community. Stay tuned for updates!',
    image: '/images/hack.webp',
       cta: {
      label: 'Connect with Stellar Ireland',
      url: 'https://x.com/Stellar_IE',
    },
  },
       {
    id: 8,
    title: 'SCF Build Award Community Vote',
    date: 'July 2025',
    description:
      'Super cool to be accepted into the SCF Build Award Community Vote. We are looking forward to sharing our progress and getting feedback from the community. Your support means a lot to us!',
    image: '/images/scf.jpg',
       cta: {
      label: 'Check out our submission',
      url: 'https://communityfund.stellar.org/dashboard/submissions/reczxSWIT1rp5ov92',
    },
  },
     {
    id: 7,
    title: 'From Idea to Startup in 4 hours',
    date: 'July 2025',
    description:
      'This workshop, led by Kevin, hosted in WorkIQ Tallagh, sponsored by Superteam Ireland was amazing. For a lean startup, helping clubs and chrities raise funds, learning to use AI tools is a must.  It will save our partners time and money.',
    image: '/images/ai.jpg',
     
  },
    {
    id: 6,
    title: 'SCF Kickstart Camp',
    date: 'June 2025',
    description:
      'We are excited to be part of the Stellar Kickstart Camp. 5 super intense days of learning, building and networking with the Stellar community. We are looking forward to sharing our learnings and insights from this event.',
    image: '/images/SCF_build.jpg',
  },
    {
    id: 5,
    title: 'Private Beta Open — Clubs & Communities',
    date: 'June 2025',
    description:
      'We are now open for private beta registrations! Clubs and community groups can DM us on X to be included.  Our Quix in a Box event will be ready in July!',
    image: '/images/privatebeta.png',
    cta: {
      label: 'DM us on X',
      url: 'https://twitter.com/messages/compose?recipient_id=YOUR_USER_ID',
    },
  },
    {
    id: 4,
    title: 'Fundraising Quiz Demo: Setup & Go!',
    date: 'June 2025',
    description:
      'A quick demo showing how easy it is to get your fundraising quiz in a box setup and running on FundRaisely.  The build is looking good!',
    image: '/images/quiz.png',
    video: 'https://youtu.be/toRVX6xF-9k',
  },
  {
    id: 3,
    title: 'Start Up Village at Dogpatch Labs',
    date: 'June 2025',
    description:
      'We are excited to be part of the Start Up Village hosted by Superteam Ireland inside Dogpatch Labs from June 9th to 18th. Stay turned as we post updates as the event happens',
    image: '/images/startupvillage.jpg',
  },


  {
    id: 2,
    title: '3rd Place at ETH Dublin Hackathon',
    date: 'May 2025',
    description:
      'Our second hackathon. We ran a live demo of our bingo game with other participants at ETH Dublin and we know the build still needs lots of work, and placed 3rd overall.',
    image: '/images/eth.jpg',
    video: 'https://youtu.be/PA6Oyxh4jjc',
  },
  {
    id: 1,
    title: 'Prizewinner at Solana Superteam Ireland Breakout Hackathon',
    date: 'May 2025',
    description:
      'Our very first hackathon — and our first win! We came 5th place at the Solana Superteam Ireland Breakout Hackathon.',
    image: '/images/solanasuper.jpg',
    video: 'https://youtu.be/9ySA87Kjx8s',
  },
];

const WhatsNew: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
<SEO
  title="Inside FundRaisely - Latest Updates"
  description="Stay updated with FundRaisely's latest developments, features, and community achievements. Follow our journey building the future of fundraising for clubs and charities."
  
  keywords="fundraisely updates, platform news, fundraising innovations, development progress"
  ukKeywords="fundraising platform updates UK, charity software news Britain, nonprofit technology UK"
  ieKeywords="fundraising platform updates Ireland, charity software news Ireland, nonprofit technology Ireland"
  
  type="update"
  domainStrategy="geographic"

/>
      <Header />

      <div className="container mx-auto max-w-6xl px-4 pb-16 pt-16">
        <h1 className="mb-8 text-4xl font-bold text-indigo-700">Inside FundRaisely</h1>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {updates.map((item) => {
            const isExpanded = expandedId === item.id;
            const shortDescription =
              item.description.length > 80
                ? item.description.slice(0, 80) + '...'
                : item.description;

            return (
              <div
                key={item.id}
                className="bg-muted flex h-full flex-col rounded-xl border border-gray-100 p-5 shadow-md"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="mb-4 h-40 w-full rounded-lg object-cover"
                />

                <h2 className="mb-1 text-lg font-semibold text-indigo-700">{item.title}</h2>
                <p className="text-fg/60 mb-2 text-sm">{item.date}</p>
                <p className="text-fg/80 mb-3">
                  {isExpanded ? item.description : shortDescription}
                </p>

                {item.description.length > 80 && (
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="mb-2 text-sm font-medium text-indigo-600 hover:underline"
                  >
                    {isExpanded ? 'Show Less' : 'Read More'}
                  </button>
                )}

                {item.video && (
                  <a
                    href={item.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 font-medium text-indigo-600 hover:underline"
                  >
                    🎥 Watch Video
                  </a>
                )}

                {isExpanded && item.cta && (
                  <a
                    href={item.cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
                  >
                    {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.184 3H17.71l-5.295 6.574L7.845 3H3.5l6.946 9.06L3 21h2.474l5.675-7.044L16.23 21h4.345l-7.04-9.168L20.184 3z" />
                    </svg> */}
                    {item.cta.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Hfooter />
    </div>
  );
};

export default WhatsNew;






