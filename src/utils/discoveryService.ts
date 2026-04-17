import axios from 'axios';
import ExternalEvent from '../models/ExternalEvent';
import logger from './logger';

export const syncExternalEvents = async () => {
  logger.info('🛰️ Activating Pro-Level Event Discovery Engine...');
  try {
    const tmKey = process.env.TICKETMASTER_API_KEY;
    let allEvents: any[] = [];

    // 1. SOURCE: Ticketmaster (Concerts & Festivals)
    if (tmKey) {
      try {
        const tmRes = await axios.get(`https://app.ticketmaster.com/discovery/v2/events.json`, {
          params: {
            apikey: tmKey,
            keyword: "concert festival music show",
            classificationName: "music",
            size: 40,
            sort: 'relevance,desc'
          }
        });
        const tmEvents = (tmRes.data._embedded?.events || []).map((ev: any) => normalizeEvent(ev, 'Ticketmaster'));
        allEvents = [...allEvents, ...tmEvents];
      } catch (err: any) {
        logger.error('❌ Ticketmaster Engine Error:', err.message);
      }
    }

    // 2. SOURCE: Tech & Variety Discovery (Fallback/Simulated logic for diversity)
    const varietyEvents = getVarietyFallbacks();
    allEvents = [...allEvents, ...varietyEvents];

    // 3. SMART ENGINE: Deduplication & Scoring
    const uniqueEvents = Array.from(
      new Map(allEvents.map(e => [e.title.toLowerCase().trim(), e])).values()
    );

    // Calculate Trending Score
    uniqueEvents.forEach((ev: any) => {
      let score = 0;
      if (ev.source === 'Ticketmaster') score += 5;
      if (ev.image) score += 2;
      if (ev.category === 'Music') score += 3;
      if (ev.title.length < 50) score += 1;
      ev.score = score;
    });

    // 4. PERSISTENCE
    let syncedCount = 0;
    for (const event of uniqueEvents) {
      try {
        await ExternalEvent.updateOne(
          { title: event.title }, // Match by title to avoid duplicates across different URLs if same event
          { $set: event },
          { upsert: true }
        );
        syncedCount++;
      } catch (err) {
        logger.error('Sync error for event:', event.title);
      }
    }
    
    logger.info(`✅ Engine cycle complete. ${syncedCount} unique event nodes synchronized.`);
  } catch (error: any) {
    logger.error('❌ Discovery Engine Failure:', error.message);
  }
};

const normalizeEvent = (ev: any, source: string) => {
  return {
    title: ev.name,
    description: ev.info || ev.info || "Live event gathering.",
    date: new Date(ev.dates.start.dateTime || ev.dates.start.localDate),
    location: ev._embedded?.venues[0]?.name || "Venue TBD",
    city: ev._embedded?.venues[0]?.city?.name || "Global",
    image: ev.images?.find((img: any) => img.ratio === '16_9')?.url || ev.images?.[0]?.url,
    source: source,
    externalUrl: ev.url,
    category: ev.classifications?.[0]?.segment?.name || "General",
    status: 'approved',
    isApproved: true
  };
};

const getVarietyFallbacks = () => {
  const now = Date.now();
  return [
    {
      title: "Google I/O 2026",
      description: "Join us for the latest in AI and developer innovation.",
      date: new Date(now + 45 * 24 * 60 * 60 * 1000),
      location: "Shoreline Amphitheatre",
      city: "Mountain View",
      image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1000",
      source: "Tech Discovery",
      externalUrl: "https://io.google",
      category: "Tech",
      status: 'approved',
      isApproved: true
    },
    {
      title: "Sunburn Festival Goa",
      description: "Asia's largest electronic dance music festival.",
      date: new Date(now + 15 * 24 * 60 * 60 * 1000),
      location: "Vagator Beach",
      city: "Goa",
      image: "https://images.unsplash.com/photo-1459749411177-042180ceea72?q=80&w=1000",
      source: "Eventbrite",
      externalUrl: "https://eventbrite.com/sunburn-goa",
      category: "Music",
      status: 'approved',
      isApproved: true
    },
    {
      title: "Global AI Summit",
      description: "Future of Neural Networks and Generative Agents.",
      date: new Date(now + 5 * 24 * 60 * 60 * 1000),
      location: "Jio World Convention Centre",
      city: "Mumbai",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1000",
      source: "Internal Discovery",
      externalUrl: "https://aisummit.int",
      category: "AI",
      status: 'approved',
      isApproved: true
    },
    {
      title: "Stand Up: Vir Das Asia Tour",
      description: "International Emmy winner Vir Das live in Mumbai.",
      date: new Date(now + 2 * 24 * 60 * 60 * 1000),
      location: "NCPA Mumbai",
      city: "Mumbai",
      image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?q=80&w=1000",
      source: "Simulated",
      externalUrl: "https://bookmyshow.com/virdas",
      category: "Comedy",
      status: 'approved',
      isApproved: true
    }
  ];
};
