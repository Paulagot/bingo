// scripts/optimise-hero.ts
import sharp from 'sharp';

const input = 'public/images/screenshots/homehero.png';
const out = 'public/images/screenshots';

await sharp(input).resize(490).webp({ quality: 80 }).toFile(`${out}/homehero-490w.webp`);
await sharp(input).resize(980).webp({ quality: 80 }).toFile(`${out}/homehero-980w.webp`);
await sharp(input).resize(1672).webp({ quality: 80 }).toFile(`${out}/homehero-1672w.webp`);

console.log('Done!');