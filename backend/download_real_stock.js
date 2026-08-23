const axios = require('axios');
const fs = require('fs');
const path = require('path');

const stockDir = path.join(__dirname, 'public/uploads/social-media/stock');
if (!fs.existsSync(stockDir)) fs.mkdirSync(stockDir, { recursive: true });

const realClips = [
  {
    name: 'real_students_campus.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-friends-walking-to-class-together-3308/1080p.mp4'
  },
  {
    name: 'real_student_studying.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-focused-student-with-digital-devices/1080p.mp4'
  },
  {
    name: 'real_library_books.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-cozy-reading-moments-in-a-library-8575/1080p.mp4'
  },
  {
    name: 'real_technology_team.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-working-as-a-team-5182/1080p.mp4'
  },
  {
    name: 'real_mobile_tech.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-google-search-on-a-smartphone-3769/1080p.mp4'
  },
  {
    name: 'real_city_business.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-walking-and-texting-3677/1080p.mp4'
  }
];

async function downloadAllClips() {
  console.log('Downloading real stock MP4 videos...');
  for (const clip of realClips) {
    const dest = path.join(stockDir, clip.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 500000) {
      console.log(`[Exists] ${clip.name} (${fs.statSync(dest).size} bytes)`);
      continue;
    }
    console.log(`[Downloading] ${clip.name}...`);
    try {
      const res = await axios.get(clip.url, { responseType: 'arraybuffer' });
      fs.writeFileSync(dest, res.data);
      console.log(`✓ Saved ${clip.name} (${res.data.length} bytes)`);
    } catch (e) {
      console.error(`Failed ${clip.name}:`, e.message);
    }
  }
  console.log('Finished downloading real stock clips!');
}

downloadAllClips().catch(console.error);
