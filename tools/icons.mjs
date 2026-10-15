// Builds the app icons (public/favicon.png, public/icon-192.png) from an SVG.
import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="44" fill="#000"/>
  <rect x="6" y="6" width="180" height="180" rx="40" fill="none" stroke="#2a2410" stroke-width="3"/>
  <rect x="136" y="-4" width="34" height="58" rx="4" fill="#2fdc5a"/><rect x="130" y="44" width="46" height="16" rx="4" fill="#5cff85"/>
  <rect x="136" y="138" width="34" height="60" rx="4" fill="#2fdc5a"/><rect x="130" y="128" width="46" height="16" rx="4" fill="#5cff85"/>
  <g transform="translate(84 96)">
    <path d="M-50 -2 l-18 -10 l4 12 l-6 12 z" fill="#ffb21e"/>
    <ellipse cx="0" cy="0" rx="52" ry="46" fill="#ffd23f"/>
    <ellipse cx="13" cy="18" rx="34" ry="25" fill="#fff1b0"/>
    <path d="M-40 6 q10 -24 46 -12 q-10 26 -46 12z" fill="#ffb21e"/>
    <circle cx="24" cy="-14" r="16" fill="#fff"/><circle cx="29" cy="-12" r="7" fill="#10141c"/><circle cx="31" cy="-15" r="2.4" fill="#fff"/>
    <path d="M40 -4 q24 0 34 8 l-32 3z" fill="#ff7a1a"/><path d="M42 7 l26 0 q-10 9 -26 7z" fill="#e8601a"/>
    <path d="M-8 -44 l38 -6 l2 -30 l-40 6 z" fill="#14161c"/><rect x="-26" y="-48" width="64" height="8" rx="3" fill="#14161c" transform="rotate(-8)"/>
    <rect x="-6" y="-56" width="38" height="7" fill="#d1001f" transform="rotate(-8)"/>
  </g>
</svg>`;
await sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(Buffer.from(svg)).resize(64, 64).png().toFile('public/favicon.png');
console.log('icons written');
