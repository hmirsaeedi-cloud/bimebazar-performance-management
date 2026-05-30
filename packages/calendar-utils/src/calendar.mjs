const breaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

function div(a, b) {
  return ~~(a / b);
}

function mod(a, b) {
  return a - ~~(a / b) * b;
}

function jalCal(jy) {
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm = 0;
  let jump = 0;

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error("Jalali year is out of supported range");
  }

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }

  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return (
    g2d(r.gy, 3, r.march) +
    (jm - 1) * 31 -
    div(jm, 7) * (jm - 7) +
    jd -
    1
  );
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm;
  let jd;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function jalaliToGregorian(jy, jm, jd) {
  assertJalaliParts(jy, jm, jd);
  return d2g(j2d(jy, jm, jd));
}

export function gregorianToJalali(gy, gm, gd) {
  if (!Number.isInteger(gy) || !Number.isInteger(gm) || !Number.isInteger(gd)) {
    throw new Error("Gregorian date parts must be integers");
  }
  return d2j(g2d(gy, gm, gd));
}

export function formatIsoDate(parts) {
  return `${parts.gy}-${pad2(parts.gm)}-${pad2(parts.gd)}`;
}

export function formatJalaliDate(parts) {
  return `${parts.jy}-${pad2(parts.jm)}-${pad2(parts.jd)}`;
}

export function parseJalaliDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Jalali date must use YYYY-MM-DD format");
  const parts = {
    jy: Number(match[1]),
    jm: Number(match[2]),
    jd: Number(match[3]),
  };
  assertJalaliParts(parts.jy, parts.jm, parts.jd);
  return parts;
}

export function isValidJalaliDate(value) {
  try {
    parseJalaliDate(value);
    return true;
  } catch {
    return false;
  }
}

export function jalaliToIsoDate(value) {
  return formatIsoDate(jalaliToGregorian(...Object.values(parseJalaliDate(value))));
}

export function isoDateToJalali(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("ISO date must use YYYY-MM-DD format");
  return formatJalaliDate(gregorianToJalali(Number(match[1]), Number(match[2]), Number(match[3])));
}

function assertJalaliParts(jy, jm, jd) {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) {
    throw new Error("Jalali date parts must be integers");
  }
  if (jm < 1 || jm > 12) throw new Error("Jalali month must be between 1 and 12");
  const maxDay = jm <= 6 ? 31 : jm <= 11 ? 30 : jalCal(jy).leap === 0 ? 30 : 29;
  if (jd < 1 || jd > maxDay) throw new Error("Jalali day is out of range");
}
