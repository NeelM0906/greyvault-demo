const C = 200;
const TAU = Math.PI * 2;

const METALS = {
  steel: ['#F3F4F5', '#C4C9CE', '#7D848B', '#DCDFE2', '#A2A8AE', '#5F666D'],
  white: ['#F7F7F5', '#D5D7D8', '#8C9195', '#E8E9EA', '#B0B4B7', '#6B7074'],
  yellow: ['#F7E9BD', '#DABA6A', '#9A7633', '#EDD18D', '#BD9649', '#7A5C24'],
  rose: ['#F6DACC', '#D7A38C', '#925F4C', '#E9BCA9', '#BA8471', '#74473A'],
};

const f = n => +n.toFixed(2);
const polar = (r, deg, cx = C, cy = C) => {
  const a = (deg * Math.PI) / 180;
  return [f(cx + r * Math.sin(a)), f(cy - r * Math.cos(a))];
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = c => Math.round(c + (t - c) * p).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}
const luminance = hex => {
  const [r, g, b] = hexToRgb(hex).map(c => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function defs(p, a) {
  const m = METALS[a.metal] || METALS.steel;
  const bm = METALS[a.bezelMetal || a.metal] || m;
  const dial = a.dial;
  const metalGrad = (id, s) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${s[0]}"/><stop offset=".28" stop-color="${s[1]}"/>
    <stop offset=".52" stop-color="${s[2]}"/><stop offset=".72" stop-color="${s[3]}"/><stop offset="1" stop-color="${s[4]}"/></linearGradient>`;
  return `<defs>
  ${metalGrad(`${p}m`, m)}
  ${metalGrad(`${p}b`, bm)}
  <linearGradient id="${p}brush" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${m[2]}"/><stop offset=".18" stop-color="${m[1]}"/><stop offset=".5" stop-color="${m[3]}"/>
    <stop offset=".82" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[2]}"/></linearGradient>
  <linearGradient id="${p}pol" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${m[4]}"/><stop offset=".45" stop-color="${m[0]}"/><stop offset="1" stop-color="${m[4]}"/></linearGradient>
  <radialGradient id="${p}d" cx=".42" cy=".38" r=".75">
    <stop offset="0" stop-color="${shade(dial, 0.16)}"/><stop offset=".55" stop-color="${dial}"/><stop offset="1" stop-color="${shade(dial, -0.42)}"/></radialGradient>
  <linearGradient id="${p}g" x1="0" y1="0" x2=".9" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <pattern id="${p}tap" width="7" height="7" patternUnits="userSpaceOnUse">
    <rect width="7" height="7" fill="${shade(dial, -0.35)}"/><rect x=".8" y=".8" width="5.4" height="5.4" rx=".6" fill="${shade(dial, 0.06)}"/></pattern>
  <pattern id="${p}grid" width="9" height="9" patternUnits="userSpaceOnUse">
    <rect width="9" height="9" fill="${shade(dial, -0.3)}"/><rect x="1.2" y="1.2" width="6.6" height="6.6" rx="2" fill="${shade(dial, 0.1)}"/></pattern>
  <pattern id="${p}hz" width="6" height="4" patternUnits="userSpaceOnUse">
    <rect width="6" height="4" fill="${dial}"/><rect y="2.6" width="6" height="1.4" fill="${shade(dial, -0.4)}"/></pattern>
  <pattern id="${p}wave" width="24" height="10" patternUnits="userSpaceOnUse">
    <rect width="24" height="10" fill="${dial}"/><path d="M0 5 Q6 0 12 5 T24 5" fill="none" stroke="${shade(dial, -0.35)}" stroke-width="1.6"/></pattern>
  <pattern id="${p}rub" width="10" height="10" patternUnits="userSpaceOnUse">
    <rect width="10" height="10" fill="#1A1B1D"/><rect x="1.5" y="1.5" width="7" height="7" rx="2" fill="#26282B"/></pattern>
  <filter id="${p}sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>`;
}

function bracelet(p, a, bw, yEnd, clip) {
  const m = METALS[a.metal] || METALS.steel;
  const edge = m[5];
  const L = C - bw / 2;
  const taper = a.bracelet === 'integrated' ? 0.84 : 0.88;
  let rows = '';
  const kind = a.bracelet;
  if (kind === 'leather' || kind === 'rubber') {
    const fill = kind === 'leather' ? (a.strap || '#2A1D17') : `url(#${p}rub)`;
    rows += `<rect x="${L}" y="-20" width="${bw}" height="${yEnd + 20}" fill="${fill}"/>`;
    if (kind === 'leather') {
      for (let y = yEnd - 14; y > -10; y -= 13) {
        const off = (Math.round(y / 13) % 2) * 8;
        for (let x = L - 8 + off; x < L + bw; x += 16) rows += `<rect x="${f(x)}" y="${f(y)}" width="14" height="11" rx="4" fill="#000" opacity=".22"/>`;
      }
      rows += `<rect x="${L + 6}" y="-20" width="${bw - 12}" height="${yEnd + 14}" rx="4" fill="none" stroke="${shade(a.strap || '#2A1D17', 0.35)}" stroke-width="1" stroke-dasharray="4 3"/>`;
    } else {
      for (let y = yEnd - 18; y > -10; y -= 22) rows += `<rect x="${L}" y="${y}" width="${bw}" height="2" fill="#0C0C0D" opacity=".7"/>`;
    }
  } else {
    const h = { oyster: 24, rivet: 24, jubilee: 15, president: 20, integrated: 22 }[kind] || 24;
    let i = 0;
    for (let y = yEnd - h; y > -h - 4; y -= h, i++) {
      if (kind === 'jubilee') {
        const o = bw * 0.3;
        rows += `<rect x="${L}" y="${y}" width="${o}" height="${h - 1}" fill="url(#${p}brush)"/><rect x="${L + bw - o}" y="${y}" width="${o}" height="${h - 1}" fill="url(#${p}brush)"/>`;
        const cw = (bw - 2 * o) / 3;
        for (let k = 0; k < 3; k++) {
          const yy = y + (k === 1 ? h / 2 : 0);
          rows += `<rect x="${f(L + o + k * cw + 0.8)}" y="${f(yy)}" width="${f(cw - 1.6)}" height="${h - 2}" rx="4" fill="url(#${p}pol)" stroke="${edge}" stroke-width=".5"/>`;
        }
      } else if (kind === 'president') {
        const cw = bw / 3;
        for (let k = 0; k < 3; k++) rows += `<rect x="${f(L + k * cw + 0.6)}" y="${y}" width="${f(cw - 1.2)}" height="${h - 1.4}" rx="${h / 2.2}" fill="url(#${p}pol)" stroke="${edge}" stroke-width=".6"/>`;
      } else if (kind === 'integrated') {
        const wide = i % 2 === 0;
        const cw = bw * (wide ? 0.44 : 0.3);
        rows += `<rect x="${L}" y="${y}" width="${bw}" height="${h - 1}" fill="url(#${p}brush)"/>`;
        rows += `<rect x="${f(C - cw / 2)}" y="${y + 2}" width="${f(cw)}" height="${h - 5}" rx="2" fill="url(#${p}pol)" stroke="${edge}" stroke-width=".6"/>`;
        rows += `<rect x="${L}" y="${y + h - 1}" width="${bw}" height="1" fill="${edge}" opacity=".7"/>`;
      } else {
        const o = bw / 3;
        rows += `<rect x="${L}" y="${y}" width="${o}" height="${h - 1}" fill="url(#${p}brush)"/>`;
        rows += `<rect x="${f(L + o)}" y="${y}" width="${f(o)}" height="${h - 1}" fill="url(#${p}${a.metal === 'steel' && !a.bezelMetal ? 'brush' : 'pol'})"/>`;
        rows += `<rect x="${f(L + 2 * o)}" y="${y}" width="${o}" height="${h - 1}" fill="url(#${p}brush)"/>`;
        rows += `<path d="M${f(L + o)} ${y}v${h}M${f(L + 2 * o)} ${y}v${h}" stroke="${edge}" stroke-width=".7"/>`;
        if (kind === 'rivet') for (const x of [L + o / 2, L + 2.5 * o]) rows += `<circle cx="${f(x)}" cy="${y + h / 2}" r="1.8" fill="${m[0]}" stroke="${edge}" stroke-width=".5"/>`;
        rows += `<rect x="${L}" y="${y + h - 1}" width="${bw}" height="1" fill="${edge}" opacity=".8"/>`;
      }
    }
  }
  const t = (bw * taper) / 2;
  return `<clipPath id="${clip}"><path d="M${f(C - t)} -20H${f(C + t)}L${f(C + bw / 2)} ${yEnd}H${f(C - bw / 2)}Z"/></clipPath><g clip-path="url(#${clip})">${rows}</g>`;
}

function bothBracelets(p, a, bw, yEnd) {
  const top = bracelet(p, a, bw, yEnd, `${p}ct`);
  const bot = bracelet(p, a, bw, yEnd, `${p}cu`);
  return `${top}<g transform="matrix(1 0 0 -1 0 400)">${bot}</g>`;
}

function bezelRound(p, a, R) {
  const m = METALS[a.metal] || METALS.steel;
  const r1 = R * 0.97;
  const kind = a.bezel || 'smooth';
  const r0 = kind === 'smooth' ? (a.thinBezel ? R * 0.92 : R * 0.86) : kind === 'fluted' ? R * 0.84 : R * 0.8;
  const mid = (r1 + r0) / 2;
  const band = r1 - r0;
  let s = '';
  const ink = a.bezelInk || (kind === 'tachy' ? '#E8E6E0' : '#E4E4E0');
  if (kind === 'dive' || kind === 'tachy') {
    s += `<circle cx="${C}" cy="${C}" r="${f(mid)}" fill="none" stroke="${a.bezelColors?.[0] || '#141414'}" stroke-width="${f(band)}"/>`;
  }
  if (kind === 'dive') {
    for (let i = 0; i < 60; i++) {
      const deg = i * 6;
      if (i === 0) {
        const [x1, y1] = polar(r1 - band * 0.14, -6);
        const [x2, y2] = polar(r1 - band * 0.14, 6);
        const [x3, y3] = polar(r0 + band * 0.18, 0);
        s += `<path d="M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}Z" fill="${ink}"/><circle cx="${C}" cy="${f(C - r1 + band * 0.42)}" r="${f(band * 0.12)}" fill="#F1EFE3" stroke="${shade(ink, -0.4)}" stroke-width=".6"/>`;
      } else if (i % 10 === 0) {
        s += `<text x="${C}" y="${f(C - mid + band * 0.2)}" transform="rotate(${deg} ${C} ${C})" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${f(band * 0.56)}" font-weight="600" fill="${ink}">${i}</text>`;
      } else if (i % 5 === 0) {
        const [x1, y1] = polar(r1 - band * 0.18, deg);
        const [x2, y2] = polar(r0 + band * 0.22, deg);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width="${f(band * 0.16)}"/>`;
      } else if (i < 15) {
        const [x1, y1] = polar(r1 - band * 0.18, deg);
        const [x2, y2] = polar(r1 - band * 0.5, deg);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width="1"/>`;
      }
    }
  } else if (kind === 'gmt') {
    const [top, bot] = a.bezelColors;
    const [lx, ly] = polar(mid, -90);
    const [rx, ry] = polar(mid, 90);
    s += `<path d="M${lx} ${ly}A${f(mid)} ${f(mid)} 0 0 1 ${rx} ${ry}" fill="none" stroke="${top}" stroke-width="${f(band)}"/>`;
    s += `<path d="M${rx} ${ry}A${f(mid)} ${f(mid)} 0 0 1 ${lx} ${ly}" fill="none" stroke="${bot}" stroke-width="${f(band)}"/>`;
    for (let h = 0; h < 24; h++) {
      const deg = h * 15;
      if (h === 0) {
        const [x1, y1] = polar(r1 - band * 0.14, -6);
        const [x2, y2] = polar(r1 - band * 0.14, 6);
        const [x3, y3] = polar(r0 + band * 0.2, 0);
        s += `<path d="M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}Z" fill="${ink}"/>`;
      } else if (h % 2 === 0) {
        s += `<text x="${C}" y="${f(C - mid + band * 0.2)}" transform="rotate(${deg} ${C} ${C})" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${f(band * 0.52)}" font-weight="600" fill="${ink}">${h}</text>`;
      } else {
        const [x, y] = polar(mid, deg);
        s += `<rect x="${f(x - 1.6)}" y="${f(y - 4)}" width="3.2" height="8" transform="rotate(${deg} ${x} ${y})" fill="${ink}"/>`;
      }
    }
  } else if (kind === 'tachy') {
    for (let i = 0; i < 120; i++) {
      const [x1, y1] = polar(r0 + band * 0.05, i * 3);
      const [x2, y2] = polar(r0 + band * (i % 5 === 0 ? 0.3 : 0.18), i * 3);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width=".6" opacity=".85"/>`;
    }
    for (const v of [500, 400, 300, 250, 200, 150, 120, 100, 90, 80, 70]) {
      const deg = (3600 / v) * 6;
      s += `<text x="${C}" y="${f(C - mid - band * 0.08)}" transform="rotate(${f(deg)} ${C} ${C})" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${f(band * 0.36)}" font-weight="600" fill="${ink}">${v}</text>`;
    }
  } else if (kind === 'fluted') {
    const circ = TAU * mid;
    const d = f(circ / 160);
    s += `<circle cx="${C}" cy="${C}" r="${f(mid)}" fill="none" stroke="url(#${p}b)" stroke-width="${f(band)}"/>`;
    s += `<circle cx="${C}" cy="${C}" r="${f(mid)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${f(band * 0.86)}" stroke-dasharray="${d} ${d}"/>`;
    s += `<circle cx="${C}" cy="${C}" r="${f(mid)}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="${f(band * 0.86)}" stroke-dasharray="${f(d / 2)} ${f(d * 1.5)}"/>`;
  } else {
    s += `<circle cx="${C}" cy="${C}" r="${f(mid)}" fill="none" stroke="url(#${p}b)" stroke-width="${f(band)}"/>`;
    s += `<circle cx="${C}" cy="${C}" r="${f(r0 + 1.4)}" fill="none" stroke="${m[0]}" stroke-width="1.2" opacity=".8"/>`;
  }
  s += `<circle cx="${C}" cy="${C}" r="${f(r1)}" fill="none" stroke="${m[5]}" stroke-width="1"/><circle cx="${C}" cy="${C}" r="${f(r0)}" fill="none" stroke="${m[5]}" stroke-width="1.2"/>`;
  return { svg: s, dialR: r0 - 1.5 };
}

function octagonPts(r, rot = 22.5) {
  const pts = [];
  for (let k = 0; k < 8; k++) pts.push(polar(r, rot + k * 45).join(','));
  return pts.join(' ');
}

function caseShape(p, a, R) {
  const m = METALS[a.metal] || METALS.steel;
  const edge = m[5];
  let back = '', body = '', bezel = '', dialShape, dialR;
  const crown = (y = C, guards = false, cab = null) => {
    let s = '';
    const x = a.case === 'round' ? C + R - 4 : a.case === 'square' ? C + R * 0.9 - 3 : C + R * 0.98 - 4;
    if (guards) s += `<path d="M${x - 8} ${y - 24}Q${x + 14} ${y - 22} ${x + 12} ${y}Q${x + 14} ${y + 22} ${x - 8} ${y + 24}Z" fill="url(#${p}m)" stroke="${edge}" stroke-width=".8"/>`;
    s += `<rect x="${x}" y="${y - 14}" width="${guards ? 14 : 17}" height="28" rx="3" fill="url(#${p}pol)" stroke="${edge}" stroke-width=".8"/>`;
    for (let i = 0; i < 6; i++) s += `<line x1="${x + 2 + i * 2.4}" y1="${y - 12}" x2="${x + 2 + i * 2.4}" y2="${y + 12}" stroke="${edge}" stroke-width=".5" opacity=".7"/>`;
    if (cab) s += `<path d="M${x + 17} ${y - 7}L${x + 25} ${y}L${x + 17} ${y + 7}Z" fill="${cab}" stroke="${shade(cab, -0.3)}" stroke-width=".6"/>`;
    return s;
  };
  const pushers = () => {
    let s = '';
    for (const deg of [52, 128]) {
      const [x, y] = polar(R + 2, deg);
      s += `<rect x="${f(x - 6)}" y="${f(y - 9)}" width="16" height="18" rx="3" transform="rotate(${deg - 90} ${x} ${y})" fill="url(#${p}pol)" stroke="${edge}" stroke-width=".7"/>`;
    }
    return s;
  };

  if (a.case === 'round') {
    const bw = R * 0.98;
    back += bothBracelets(p, a, bw, C - R + 6);
    const hw = 13;
    const yIn = C - Math.sqrt(R * R - (bw / 2) ** 2);
    const yOut = C - Math.sqrt(R * R - (bw / 2 + hw) ** 2);
    const tip = C - R - 24;
    for (const sx of [-1, 1]) for (const sy of [1, -1]) {
      const X = d => f(C + sx * d);
      const Y = y => f(sy > 0 ? y : 400 - y);
      back += `<path d="M${X(bw / 2 - 1)} ${Y(yIn + 6)}L${X(bw / 2 - 1)} ${Y(tip + 3)}Q${X(bw / 2 - 1)} ${Y(tip)} ${X(bw / 2 + 3)} ${Y(tip)}L${X(bw / 2 + hw - 3)} ${Y(tip + 2)}Q${X(bw / 2 + hw + 1)} ${Y(tip + 4)} ${X(bw / 2 + hw + 1)} ${Y(tip + 10)}L${X(bw / 2 + hw + 4)} ${Y(yOut + 8)}Z" fill="url(#${p}m)" stroke="${edge}" stroke-width="1" stroke-linejoin="round"/>`;
    }
    body += (a.pushers ? pushers() : '') + crown(C, a.crownGuards);
    body += `<circle cx="${C}" cy="${C}" r="${R}" fill="url(#${p}m)" stroke="${edge}" stroke-width="1.4"/>`;
    const bz = bezelRound(p, a, R);
    bezel = bz.svg;
    dialR = bz.dialR;
    dialShape = `<circle cx="${C}" cy="${C}" r="${f(dialR)}"/>`;
  } else if (a.case === 'octagon') {
    const bw = R * 1.3;
    back += bothBracelets(p, a, bw, C - R * 0.62);
    body += (a.pushers ? pushers() : '') + crown(C, true);
    body += `<rect x="${f(C - R)}" y="${f(C - R * 0.98)}" width="${f(2 * R)}" height="${f(2 * R * 0.98)}" rx="${f(R * 0.46)}" fill="url(#${p}brush)" stroke="${edge}" stroke-width="1.4"/>`;
    bezel += `<polygon points="${octagonPts(R * 0.93)}" fill="url(#${p}m)" stroke="${edge}" stroke-width="1.4" stroke-linejoin="round"/>`;
    bezel += `<polygon points="${octagonPts(R * 0.86)}" fill="none" stroke="${METALS[a.metal][0]}" stroke-width="1.2" opacity=".9"/>`;
    for (let k = 0; k < 8; k++) {
      const [x, y] = polar(R * 0.8, 22.5 + k * 45);
      bezel += `<circle cx="${x}" cy="${y}" r="${f(R * 0.05)}" fill="url(#${p}pol)" stroke="${edge}" stroke-width=".7"/>`;
      const hex = [];
      for (let j = 0; j < 6; j++) hex.push(polar(R * 0.03, j * 60 + k * 17, x, y).join(','));
      bezel += `<polygon points="${hex.join(' ')}" fill="${edge}" opacity=".55"/>`;
    }
    dialR = R * 0.67;
    bezel += `<circle cx="${C}" cy="${C}" r="${f(dialR + 6)}" fill="${shade(a.dial, -0.25)}" stroke="${edge}" stroke-width="1"/>`;
    for (let i = 0; i < 60; i++) {
      const [x1, y1] = polar(dialR + 1, i * 6);
      const [x2, y2] = polar(dialR + (i % 5 ? 3.5 : 5.5), i * 6);
      bezel += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-opacity=".6" stroke-width=".6"/>`;
    }
    dialShape = `<circle cx="${C}" cy="${C}" r="${f(dialR)}"/>`;
  } else if (a.case === 'cushion') {
    const bw = R * 1.26;
    back += bothBracelets(p, a, bw, C - R * 0.6);
    for (const sx of [-1, 1]) back += `<rect x="${f(sx < 0 ? C - R * 1.1 : C + R * 0.8)}" y="${f(C - R * 0.36)}" width="${f(R * 0.3)}" height="${f(R * 0.72)}" rx="${f(R * 0.14)}" fill="url(#${p}m)" stroke="${edge}" stroke-width="1"/>`;
    body += crown(C, false);
    body += `<rect x="${f(C - R * 0.98)}" y="${f(C - R * 0.98)}" width="${f(2 * R * 0.98)}" height="${f(2 * R * 0.98)}" rx="${f(R * 0.42)}" fill="url(#${p}brush)" stroke="${edge}" stroke-width="1.4"/>`;
    bezel += `<polygon points="${octagonPts(R * 0.8)}" fill="url(#${p}m)" stroke="url(#${p}m)" stroke-width="${f(R * 0.16)}" stroke-linejoin="round"/>`;
    bezel += `<polygon points="${octagonPts(R * 0.8)}" fill="none" stroke="${edge}" stroke-width="${f(R * 0.16 + 2)}" stroke-linejoin="round" opacity=".25"/>`;
    bezel += `<polygon points="${octagonPts(R * 0.8)}" fill="url(#${p}m)" stroke="url(#${p}m)" stroke-width="${f(R * 0.14)}" stroke-linejoin="round"/>`;
    dialR = R * 0.64;
    dialShape = `<polygon points="${octagonPts(dialR * 0.94)}" stroke-linejoin="round" stroke-width="${f(R * 0.1)}" stroke="#000"/>`;
  } else {
    const bw = R * 1.3;
    back += bothBracelets(p, a, bw, C - R * 0.7);
    body += crown(C, true, '#2B3F7A');
    body += `<rect x="${f(C - R * 0.9)}" y="${f(C - R * 0.94)}" width="${f(2 * R * 0.9)}" height="${f(2 * R * 0.94)}" rx="${f(R * 0.2)}" fill="url(#${p}m)" stroke="${edge}" stroke-width="1.4"/>`;
    bezel += `<rect x="${f(C - R * 0.78)}" y="${f(C - R * 0.78)}" width="${f(2 * R * 0.78)}" height="${f(2 * R * 0.78)}" rx="${f(R * 0.16)}" fill="url(#${p}pol)" stroke="${edge}" stroke-width="1"/>`;
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) {
      const x = C + dx * R * 0.71, y = C + dy * R * 0.71;
      if (dx && dy) continue;
      bezel += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.04)}" fill="url(#${p}m)" stroke="${edge}" stroke-width=".7"/><line x1="${f(x - R * 0.025)}" y1="${f(y)}" x2="${f(x + R * 0.025)}" y2="${f(y)}" stroke="${edge}" stroke-width="1"/>`;
    }
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = C + dx * R * 0.66, y = C + dy * R * 0.66;
      bezel += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.04)}" fill="url(#${p}m)" stroke="${edge}" stroke-width=".7"/><line x1="${f(x - R * 0.025)}" y1="${f(y + R * 0.01)}" x2="${f(x + R * 0.025)}" y2="${f(y - R * 0.01)}" stroke="${edge}" stroke-width="1"/>`;
    }
    dialR = R * 0.6;
    dialShape = `<rect x="${f(C - dialR)}" y="${f(C - dialR)}" width="${f(2 * dialR)}" height="${f(2 * dialR)}" rx="${f(R * 0.08)}"/>`;
  }
  return { back, body, bezel, dialShape, dialR };
}

function dialFace(p, a, Rd, shape) {
  const light = luminance(a.dial) > 0.55;
  const ink = light ? '#1C1C1C' : '#ECEAE3';
  const m = METALS[a.metal] || METALS.steel;
  const fillByTexture = { tapisserie: `url(#${p}tap)`, grid: `url(#${p}grid)`, horizontal: `url(#${p}hz)`, waves: `url(#${p}wave)` };
  let s = `<clipPath id="${p}dc">${shape}</clipPath><g clip-path="url(#${p}dc)">`;
  s += `<rect x="0" y="0" width="400" height="400" fill="${fillByTexture[a.texture] || `url(#${p}d)`}"/>`;
  if (fillByTexture[a.texture]) s += `<rect x="0" y="0" width="400" height="400" fill="url(#${p}d)" opacity=".45"/>`;
  if (a.texture === 'sunburst') {
    for (let i = 0; i < 180; i++) {
      const [x, y] = polar(Rd * 1.2, i * 2);
      s += `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}" stroke="${i % 2 ? '#fff' : '#000'}" stroke-opacity=".05" stroke-width="1.4"/>`;
    }
  }

  const occupied = new Set();
  if (['date', 'daydate'].includes(a.complication)) occupied.add(3);
  if (a.complication === 'daydate') occupied.add(12);
  if (a.complication === 'chrono3') [3, 6, 9].forEach(h => occupied.add(h));

  const square = a.case === 'square';
  if (square) {
    const s0 = Rd * 0.94;
    for (let i = 0; i < 60; i++) {
      const deg = i * 6;
      const rad = (deg * Math.PI) / 180;
      const t = s0 / Math.max(Math.abs(Math.sin(rad)), Math.abs(Math.cos(rad)));
      const [x1, y1] = polar(t, deg);
      const [x2, y2] = polar(t - 6, deg);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width=".7"/>`;
    }
    s += `<rect x="${f(C - s0)}" y="${f(C - s0)}" width="${f(2 * s0)}" height="${f(2 * s0)}" fill="none" stroke="${ink}" stroke-width=".7"/><rect x="${f(C - s0 + 6)}" y="${f(C - s0 + 6)}" width="${f(2 * s0 - 12)}" height="${f(2 * s0 - 12)}" fill="none" stroke="${ink}" stroke-width=".7"/>`;
    const romans = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let h = 0; h < 12; h++) {
      const deg = h * 30;
      const rad = (deg * Math.PI) / 180;
      const t = (s0 - 20) / Math.max(Math.abs(Math.sin(rad)), Math.abs(Math.cos(rad)));
      const [x, y] = polar(t, deg);
      s += `<text x="${x}" y="${f(y + 6)}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${f(Rd * 0.17)}" fill="${ink}">${romans[h]}</text>`;
    }
  } else {
    for (let i = 0; i < 60; i++) {
      const [x1, y1] = polar(Rd * 0.985, i * 6);
      const [x2, y2] = polar(Rd * (i % 5 ? 0.94 : 0.92), i * 6);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-opacity="${i % 5 ? 0.5 : 0.85}" stroke-width="${i % 5 ? 0.6 : 1.2}"/>`;
    }
    const lume = '#F1EFE2';
    const mk = a.markerColor || m[1];
    const markerFill = a.markerColor ? a.markerColor : `url(#${p}pol)`;
    for (let h = 1; h <= 12; h++) {
      if (occupied.has(h)) continue;
      const deg = h * 30;
      const kind = a.markers;
      if (kind === 'dive' || kind === 'explorer') {
        if (h === 12) {
          const [x1, y1] = polar(Rd * 0.9, -7);
          const [x2, y2] = polar(Rd * 0.9, 7);
          const [x3, y3] = polar(Rd * 0.68, 0);
          s += `<path d="M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}Z" fill="${lume}" stroke="${mk}" stroke-width="2.2" stroke-linejoin="round"/>`;
        } else if (kind === 'explorer' && h % 3 === 0) {
          const [x, y] = polar(Rd * 0.76, deg);
          s += `<text x="${x}" y="${f(y + Rd * 0.09)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${f(Rd * 0.26)}" fill="${lume}" stroke="${mk}" stroke-width="1">${h}</text>`;
        } else if (kind === 'dive' && h % 3 === 0) {
          const [x, y] = polar(Rd * 0.78, deg);
          s += `<rect x="${f(x - Rd * 0.045)}" y="${f(y - Rd * 0.12)}" width="${f(Rd * 0.09)}" height="${f(Rd * 0.24)}" rx="1" transform="rotate(${deg} ${x} ${y})" fill="${lume}" stroke="${mk}" stroke-width="2"/>`;
        } else {
          const [x, y] = polar(Rd * 0.8, deg);
          s += `<circle cx="${x}" cy="${y}" r="${f(Rd * 0.068)}" fill="${lume}" stroke="${mk}" stroke-width="2"/>`;
        }
      } else if (kind === 'arabic') {
        const [x, y] = polar(Rd * 0.74, deg);
        s += `<text x="${x}" y="${f(y + Rd * 0.07)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${f(Rd * 0.2)}" fill="${lume}" stroke="${m[2]}" stroke-width=".8">${h}</text>`;
      } else {
        const w = Rd * 0.055;
        const draw = off => {
          const [x, y] = polar(Rd * 0.78, deg + off);
          return `<rect x="${f(x - w / 2)}" y="${f(y - Rd * 0.1)}" width="${f(w)}" height="${f(Rd * 0.2)}" rx=".8" transform="rotate(${deg} ${x} ${y})" fill="${markerFill}" stroke="${m[5]}" stroke-width=".6"/>`;
        };
        s += h === 12 ? draw(-3.2) + draw(3.2) : draw(0);
      }
    }
  }

  const textY = a.complication === 'chrono3' ? C - Rd * 0.3 : C + Rd * 0.42;
  s += `<text x="${C}" y="${f(textY)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${f(Rd * 0.07)}" letter-spacing="${f(Rd * 0.02)}" fill="${ink}" opacity=".6">AUTOMATIC</text>`;

  const windowBox = (x, y, w, h, label) =>
    `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="1.5" fill="#F6F4EE" stroke="url(#${p}pol)" stroke-width="2"/><text x="${f(x)}" y="${f(y + h * 0.3)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${f(h * 0.78)}" fill="#151515">${label}</text>`;
  if (['date', 'daydate'].includes(a.complication)) s += windowBox(C + Rd * 0.7, C, Rd * 0.24, Rd * 0.19, '14');
  if (a.complication === 'daydate') s += windowBox(C, C - Rd * 0.68, Rd * 0.5, Rd * 0.17, 'WED');
  if (a.innerRing) s += `<circle cx="${C}" cy="${C}" r="${f(Rd * 0.5)}" fill="none" stroke="${shade(a.dial, 0.25)}" stroke-width="${f(Rd * 0.12)}"/>`;
  if (a.complication === 'chrono3') {
    const sub = a.subdial || shade(a.dial, -0.2);
    const subInk = luminance(sub) > 0.55 ? '#1C1C1C' : '#ECEAE3';
    for (const deg of [90, 180, 270]) {
      const [x, y] = polar(Rd * 0.47, deg);
      const r = Rd * 0.25;
      s += `<circle cx="${x}" cy="${y}" r="${f(r)}" fill="${sub}" stroke="${m[1]}" stroke-width="1.6"/>`;
      for (let i = 0; i < 30; i++) {
        const [x1, y1] = polar(r * 0.95, i * 12, x, y);
        const [x2, y2] = polar(r * (i % 5 ? 0.85 : 0.75), i * 12, x, y);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${subInk}" stroke-width="${i % 5 ? 0.5 : 1}"/>`;
      }
      const [hx, hy] = polar(r * 0.78, deg * 1.7 + 40, x, y);
      s += `<line x1="${x}" y1="${y}" x2="${hx}" y2="${hy}" stroke="${subInk}" stroke-width="1.4" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="2" fill="${subInk}"/>`;
    }
  }
  return { svg: s + '</g>', ink, light };
}

function hands(p, a, Rd, light) {
  const m = METALS[a.metal] || METALS.steel;
  const fill = a.handColor || `url(#${p}pol)`;
  const stroke = light ? '#1A1A1A' : m[5];
  const lume = '#F1EFE2';
  const L = { h: Rd * 0.55, m: Rd * 0.84 };
  const shape = (len, w, style) => {
    if (style === 'dauphine') return `<path d="M0 ${f(len * 0.12)}L${f(-w)} 0L0 ${f(-len)}L${f(w)} 0Z" fill="${fill}" stroke="${stroke}" stroke-width=".6"/><path d="M0 ${f(len * 0.12)}L${f(w)} 0L0 ${f(-len)}Z" fill="#000" opacity=".18"/>`;
    if (style === 'sword') return `<path d="M${f(-w * 0.5)} ${f(len * 0.12)}L${f(-w)} ${f(-len * 0.6)}L0 ${f(-len)}L${f(w)} ${f(-len * 0.6)}L${f(w * 0.5)} ${f(len * 0.12)}Z" fill="${fill}" stroke="${stroke}" stroke-width=".5"/>`;
    const tip = style === 'baton' ? 0 : w * 1.4;
    let s = `<path d="M${f(-w)} ${f(len * 0.12)}V${f(-len + tip + 2)}L0 ${f(-len)}L${f(w)} ${f(-len + tip + 2)}V${f(len * 0.12)}Z" fill="${fill}" stroke="${stroke}" stroke-width=".6"/>`;
    s += `<rect x="${f(-w * 0.5)}" y="${f(-len * 0.88)}" width="${f(w)}" height="${f(len * 0.62)}" rx="${f(w * 0.4)}" fill="${lume}"/>`;
    if (style === 'mercedes') s += `<circle cx="0" cy="${f(-len * 0.66)}" r="${f(w * 2.1)}" fill="${lume}" stroke="${fill}" stroke-width="${f(w * 0.8)}"/>`;
    if (style === 'snowflake') s += `<rect x="${f(-w * 2)}" y="${f(-len * 0.74)}" width="${f(w * 4)}" height="${f(w * 4)}" fill="${lume}" stroke="${a.markerColor || fill}" stroke-width="1.4"/>`;
    return s;
  };
  const style = a.hands;
  const minuteStyle = style === 'mercedes' || style === 'snowflake' ? 'baton-lume' : style;
  let s = '';
  if (a.complication === 'gmt') {
    const len = Rd * 0.86;
    s += `<g transform="translate(${C} ${C}) rotate(76)"><line x1="0" y1="0" x2="0" y2="${f(-len + 10)}" stroke="${a.gmtHand}" stroke-width="2.2"/><path d="M-6 ${f(-len + 12)}L0 ${f(-len)}L6 ${f(-len + 12)}Z" fill="${a.gmtHand}" stroke="${lume}" stroke-width=".8"/></g>`;
  }
  s += `<g transform="translate(${C} ${C}) rotate(304.5)">${shape(L.h, Rd * 0.05, style)}</g>`;
  s += `<g transform="translate(${C} ${C}) rotate(54)">${shape(L.m, Rd * 0.038, minuteStyle)}</g>`;
  {
    const sc = a.complication === 'chrono3' ? (light ? '#1A1A1A' : '#ECEAE3') : (a.handColor || m[1]);
    s += `<g transform="translate(${C} ${C}) rotate(212)"><line x1="0" y1="${f(Rd * 0.2)}" x2="0" y2="${f(-Rd * 0.9)}" stroke="${sc}" stroke-width="1.1"/>${a.markers === 'dive' ? `<circle cx="0" cy="${f(-Rd * 0.62)}" r="${f(Rd * 0.04)}" fill="${lume}" stroke="${sc}" stroke-width="1"/>` : ''}</g>`;
  }
  s += `<circle cx="${C}" cy="${C}" r="${f(Rd * 0.045)}" fill="url(#${p}pol)" stroke="${stroke}" stroke-width=".6"/>`;
  return s;
}

function watchBody(p, a) {
  const R = 112 * (a.caseScale || 1);
  const cs = caseShape(p, a, R);
  const face = dialFace(p, a, cs.dialR, cs.dialShape);
  const glare = `<g clip-path="url(#${p}dc)"><path d="M${f(C - cs.dialR * 1.1)} ${f(C - cs.dialR * 0.2)}Q${f(C - cs.dialR * 0.3)} ${f(C - cs.dialR * 1.2)} ${f(C + cs.dialR * 0.75)} ${f(C - cs.dialR * 1.05)}L${f(C + cs.dialR * 1.2)} ${f(C - cs.dialR * 1.4)}L${f(C - cs.dialR * 1.4)} ${f(C - cs.dialR * 1.4)}Z" fill="url(#${p}g)"/></g>`;
  const shadow = `<ellipse cx="${C + 10}" cy="${C + 16}" rx="${f(R * 1.02)}" ry="${f(R * 1.02)}" fill="#000" opacity=".28" filter="url(#${p}sh)"/>`;
  return `${cs.back}${shadow}${cs.body}${cs.bezel}${face.svg}${hands(p, a, cs.dialR, face.light)}${glare}`;
}

const xmlEsc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const wrap = (inner, vb, rawTitle, title = xmlEsc(rawTitle)) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}"><title>${title}</title>${inner}</svg>`;

export function front(w) {
  const p = 'w';
  return wrap(defs(p, w.art) + watchBody(p, w.art), '0 0 400 400', `${w.brand} ${w.model} ${w.ref}, front view (illustration)`);
}

export function dialDetail(w) {
  const p = 'w';
  const r = 112 * (w.art.caseScale || 1) * 0.72;
  return wrap(defs(p, w.art) + watchBody(p, w.art), `${f(C - r)} ${f(C - r)} ${f(2 * r)} ${f(2 * r)}`, `${w.brand} ${w.model} ${w.ref}, dial detail (illustration)`);
}

export function caseback(w) {
  const p = 'w';
  const a = w.art;
  const m = METALS[a.metal] || METALS.steel;
  const R = 112 * (a.caseScale || 1);
  const cs = caseShape(p, a, R);
  const exhibition = ['Audemars Piguet', 'Patek Philippe'].includes(w.brand) && w.family !== 'Calatrava';
  const r = cs.dialR * 0.98;
  let s = `<g transform="matrix(-1 0 0 1 400 0)">${cs.back}<ellipse cx="${C - 10}" cy="${C + 16}" rx="${f(R)}" ry="${f(R)}" fill="#000" opacity=".25" filter="url(#${p}sh)"/>${cs.body}</g>`;
  s += `<circle cx="${C}" cy="${C}" r="${f(R * 0.9)}" fill="url(#${p}pol)" stroke="${m[5]}" stroke-width="1"/>`;
  if (exhibition) {
    s += `<circle cx="${C}" cy="${C}" r="${f(r)}" fill="#2A2C2F" stroke="${m[5]}" stroke-width="2"/>`;
    for (let i = -6; i <= 6; i++) s += `<rect x="${f(C - r)}" y="${f(C + i * r * 0.16 - 3)}" width="${f(2 * r)}" height="${f(r * 0.08)}" fill="#3A3D41" opacity=".8"/>`;
    s += `<path d="M${f(C - r * 0.92)} ${C}A${f(r * 0.92)} ${f(r * 0.92)} 0 0 1 ${f(C + r * 0.92)} ${C}L${f(C + r * 0.25)} ${C}A${f(r * 0.25)} ${f(r * 0.25)} 0 0 0 ${f(C - r * 0.25)} ${C}Z" fill="url(#${p}pol)" transform="rotate(-30 ${C} ${C})" stroke="${METALS.yellow[2]}" stroke-width="1"/>`;
    s += `<path d="M${f(C - r * 0.92)} ${C}A${f(r * 0.92)} ${f(r * 0.92)} 0 0 1 ${f(C + r * 0.92)} ${C}L${f(C + r * 0.25)} ${C}A${f(r * 0.25)} ${f(r * 0.25)} 0 0 0 ${f(C - r * 0.25)} ${C}Z" fill="${METALS.yellow[1]}" opacity=".55" transform="rotate(-30 ${C} ${C})"/>`;
    for (let i = 0; i < 9; i++) {
      const [x, y] = polar(r * (0.4 + (i % 3) * 0.17), 140 + i * 13);
      s += `<circle cx="${x}" cy="${y}" r="2.6" fill="#9B1B30" stroke="#E8D9A8" stroke-width="1"/>`;
    }
    const [bx, by] = polar(r * 0.55, 200);
    s += `<circle cx="${bx}" cy="${by}" r="${f(r * 0.2)}" fill="none" stroke="#D9BC72" stroke-width="2.4"/><circle cx="${bx}" cy="${by}" r="${f(r * 0.04)}" fill="#D9BC72"/>`;
    s += `<circle cx="${C}" cy="${C}" r="${f(r)}" fill="url(#${p}g)" opacity=".7"/>`;
  } else {
    for (let i = 0; i < 14; i++) s += `<circle cx="${C}" cy="${C}" r="${f(r * (0.2 + i * 0.055))}" fill="none" stroke="${i % 2 ? m[0] : m[2]}" stroke-opacity=".35" stroke-width="1.4"/>`;
    const circ = TAU * R * 0.84;
    s += `<circle cx="${C}" cy="${C}" r="${f(R * 0.84)}" fill="none" stroke="${m[2]}" stroke-width="7" stroke-dasharray="${f(circ / 180)} ${f(circ / 180)}" opacity=".6"/>`;
    s += `<path id="${p}arc" d="M${f(C - r * 0.72)} ${C}A${f(r * 0.72)} ${f(r * 0.72)} 0 0 1 ${f(C + r * 0.72)} ${C}" fill="none"/>`;
    s += `<text font-family="Helvetica, Arial, sans-serif" font-size="9.5" letter-spacing="2.4" fill="${m[5]}"><textPath href="#${p}arc" startOffset="50%" text-anchor="middle">${a.metal === 'steel' ? 'STAINLESS STEEL' : '18K GOLD'} · WATER RESISTANT</textPath></text>`;
  }
  return wrap(defs(p, a) + s, '0 0 400 400', `${w.brand} ${w.model} ${w.ref}, case back (illustration)`);
}

export function boxAndPapers(w) {
  if (!w.set.box && !w.set.papers) return null;
  const p = 'w';
  const boxColor = { Rolex: '#1E3B2E', Tudor: '#3A1F1F', Omega: '#2A2B30', Cartier: '#6A1B22' }[w.brand] || '#1B1C1E';
  let s = '';
  if (w.set.box) {
    s += `<path d="M70 120L330 120L344 150L56 150Z" fill="${shade(boxColor, 0.15)}"/>`;
    s += `<rect x="56" y="150" width="288" height="150" rx="6" fill="${boxColor}"/>`;
    s += `<rect x="72" y="160" width="256" height="120" rx="4" fill="${shade(boxColor, -0.35)}"/>`;
    s += `<rect x="72" y="160" width="256" height="120" rx="4" fill="none" stroke="#C9A961" stroke-opacity=".5"/>`;
    s += `<ellipse cx="200" cy="222" rx="70" ry="34" fill="${shade('#EDE7DA', -0.05)}"/>`;
    s += `<g transform="translate(140 162) scale(.3)">${watchBody(p, w.art)}</g>`;
    s += `<rect x="56" y="296" width="288" height="8" rx="3" fill="${shade(boxColor, -0.45)}"/>`;
  }
  if (w.set.papers) {
    const y = w.set.box ? 252 : 150;
    s += `<g transform="rotate(-8 120 ${y + 50})"><rect x="54" y="${y}" width="150" height="96" rx="7" fill="#F4F1EA" stroke="#CFC8BA"/>`;
    s += `<rect x="68" y="${y + 16}" width="26" height="20" rx="3" fill="#C9A961"/>`;
    for (let i = 0; i < 4; i++) s += `<rect x="68" y="${y + 46 + i * 11}" width="${110 - i * 18}" height="4" rx="2" fill="#B9B2A4"/>`;
    s += `<text x="190" y="${y + 30}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="9" letter-spacing="1.5" fill="#6B655B">${w.set.papersDate ? w.set.papersDate.toUpperCase() : 'PAPERS'}</text></g>`;
  }
  return wrap(defs(p, w.art) + s, '0 0 400 400', `${w.brand} ${w.model}: ${[w.set.box && 'box', w.set.papers && 'papers'].filter(Boolean).join(' and ')} (illustration)`);
}

export function monogram(initials, bg = '#1E2125', fg = '#E9E4DA') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" role="img" aria-label="Portrait placeholder for ${initials}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(bg, 0.12)}"/><stop offset="1" stop-color="${shade(bg, -0.2)}"/></linearGradient></defs><rect width="300" height="360" fill="url(#g)"/><circle cx="150" cy="150" r="56" fill="${shade(bg, 0.2)}"/><path d="M60 360C60 280 100 240 150 240S240 280 240 360Z" fill="${shade(bg, 0.2)}"/><text x="150" y="335" text-anchor="middle" font-family="Georgia, serif" font-size="30" letter-spacing="6" fill="${fg}" opacity=".9">${initials}</text></svg>`;
}
