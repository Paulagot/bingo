import React, { useState } from 'react';
import  {Header} from '../components/GeneralSite/Header';
import Hfooter from '../components/GeneralSite/hFooter';

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
      <Header />

      <div className="container mx-auto px-4 max-w-6xl pt-16 pb-16">
        <h1 className="text-4xl font-bold text-indigo-700 mb-8">Inside FundRaisely</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {updates.map((item) => {
            const isExpanded = expandedId === item.id;
            const shortDescription =
              item.description.length > 80
                ? item.description.slice(0, 80) + '...'
                : item.description;

            return (
              <div
                key={item.id}
                className="p-5 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col h-full"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="rounded-lg w-full h-40 object-cover mb-4"
                />

                <h2 className="text-lg font-semibold text-indigo-700 mb-1">{item.title}</h2>
                <p className="text-sm text-gray-500 mb-2">{item.date}</p>
                <p className="text-gray-700 mb-3">
                  {isExpanded ? item.description : shortDescription}
                </p>

                {item.description.length > 80 && (
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="text-indigo-600 text-sm font-medium hover:underline mb-2"
                  >
                    {isExpanded ? 'Show Less' : 'Read More'}
                  </button>
                )}

                {item.video && (
                  <a
                    href={item.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 font-medium hover:underline mb-2"
                  >
                    🎥 Watch Video
                  </a>
                )}

                {isExpanded && item.cta && (
                  <a
                    href={item.cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-md hover:bg-indigo-700 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.184 3H17.71l-5.295 6.574L7.845 3H3.5l6.946 9.06L3 21h2.474l5.675-7.044L16.23 21h4.345l-7.04-9.168L20.184 3z" />
                    </svg>
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






