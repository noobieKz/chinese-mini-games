/** Original, code-owned vector art. Rasterized once by Phaser, then animated as sprites. */
const svg = (width: number, height: number, content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;

export const worldArt = svg(
  1600,
  1000,
  `
<defs>
 <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#071e32"/><stop offset=".55" stop-color="#174850"/><stop offset="1" stop-color="#0d333e"/></linearGradient>
 <radialGradient id="moon"><stop stop-color="#e0edb5" stop-opacity=".24"/><stop offset="1" stop-color="#b7e2b0" stop-opacity="0"/></radialGradient>
 <linearGradient id="mountain" x2="0" y2="1"><stop stop-color="#1c5559"/><stop offset="1" stop-color="#102d3e"/></linearGradient>
 <linearGradient id="rock" x2=".2" y2="1"><stop stop-color="#3a6d64"/><stop offset=".3" stop-color="#1a494c"/><stop offset="1" stop-color="#0c2736"/></linearGradient>
 <linearGradient id="land" x2="0" y2="1"><stop stop-color="#5a7f66"/><stop offset="1" stop-color="#294f4e"/></linearGradient>
 <radialGradient id="floor"><stop stop-color="#759282"/><stop offset="1" stop-color="#3a675e"/></radialGradient>
 <linearGradient id="roof" x2="0" y2="1"><stop stop-color="#38777a"/><stop offset=".5" stop-color="#133c4b"/><stop offset="1" stop-color="#072a3c"/></linearGradient>
 <linearGradient id="door" x2="0" y2="1"><stop stop-color="#f6d389"/><stop offset="1" stop-color="#a17f3c"/></linearGradient>
 <radialGradient id="gate"><stop stop-color="#e1c475" stop-opacity=".35"/><stop offset="1" stop-color="#a9cb95" stop-opacity="0"/></radialGradient>
 <filter id="blur"><feGaussianBlur stdDeviation="20"/></filter>
</defs>
<path fill="url(#sky)" d="M0 0h1600v1000H0z"/>
<ellipse cx="820" cy="240" rx="500" ry="340" fill="url(#moon)"/>
<circle cx="820" cy="155" r="67" fill="#d6dec0" opacity=".8"/><circle cx="835" cy="141" r="64" fill="#244b50" opacity=".12"/>
<g fill="#d6e9cd" opacity=".5">${Array.from({ length: 55 }, (_, i) => `<circle cx="${(i * 263 + 71) % 1600}" cy="${(i * 97 + 28) % 440}" r="${i % 3 === 0 ? 1.6 : 0.8}"/>`).join('')}</g>
<path d="M0 420L90 306 135 330 195 176 223 160 248 313 280 342 300 257 330 249 359 403 440 390 490 280 530 250 555 390 610 450 708 400 760 310 804 430 900 430 960 324 1000 318 1037 411 1110 390 1188 232 1215 214 1244 362 1285 301 1320 295 1350 401 1400 370 1460 193 1502 170 1532 355 1600 425V700H0Z" fill="url(#mountain)"/>
<path d="M0 518L110 430 160 457 210 388 248 403 300 510 380 482 455 400 498 423 543 521 630 465 701 510 790 456 880 530 980 459 1040 506 1130 425 1182 440 1240 529 1330 450 1410 470 1510 408 1600 472V760H0Z" fill="#123f47"/>
<g stroke="#7fc2aa" opacity=".17" fill="none"><path d="M185 250l20 185M1200 280l18 170M1470 250l20 180" stroke-width="5"/><path d="M190 255l12 170M1205 285l8 150" stroke-width="2"/></g>
<g fill="#b3d6b7" opacity=".1" filter="url(#blur)"><ellipse cx="330" cy="457" rx="420" ry="25"/><ellipse cx="1300" cy="520" rx="450" ry="24"/><ellipse cx="700" cy="380" rx="300" ry="18"/></g>
<path d="M0 680Q400 590 800 655T1600 650V1000H0Z" fill="#102f3d"/>
<g stroke="#51887a" stroke-width="2" opacity=".16"><path d="M50 740h170m90-36h100m710 30h200m-550 100h150m380-30h170M10 920h290m610 12h280m-560-25h100M330 785h160m640 97h190"/></g>
<!-- Floating central island, faceted underside and moss rim. -->
<ellipse cx="800" cy="879" rx="410" ry="46" fill="#061f30" opacity=".55"/>
<path d="M401 590L1190 585 1150 730 1081 781 1012 797 936 874 870 837 800 917 716 842 650 869 571 803 500 770 444 711Z" fill="url(#rock)"/>
<path d="M490 655l56 113 56-68 54 145 54-128 85 168 64-150 70 96 50-118 82 64 57-142" fill="none" stroke="#3d6862" stroke-width="3" opacity=".5"/>
<path d="M401 590Q432 505 587 473Q813 424 1039 481Q1174 514 1190 585L1166 625Q800 766 422 631Z" fill="url(#land)" stroke="#608477" stroke-width="5"/>
<ellipse cx="800" cy="578" rx="318" ry="100" fill="url(#floor)" stroke="#849980" stroke-width="3"/>
<ellipse cx="800" cy="578" rx="270" ry="80" fill="none" stroke="#b0b498" stroke-width="2" opacity=".55"/>
<ellipse cx="800" cy="578" rx="248" ry="71" fill="none" stroke="#233e41" stroke-width="2" opacity=".45"/>
<g stroke="#a1ae90" opacity=".3"><path d="M492 554l605 61M526 526l520 112M590 505l366 143M1107 554l-605 61M1074 526L554 638M1010 505L644 648"/></g>
<!-- Central treasury steps and temple. -->
<path d="M669 552h261l30 15H640Z" fill="#a4a58b"/><path d="M652 565h293l24 16H629Z" fill="#678477"/><path d="M675 550h249V373H675Z" fill="#233e43" stroke="#778c70" stroke-width="3"/>
<path d="M707 550V414Q800 327 892 414V550" fill="#0c2936" stroke="#bdad72" stroke-width="5"/>
<ellipse cx="800" cy="459" rx="135" ry="132" fill="url(#gate)"/>
<path d="M738 550V427Q800 367 862 427V550" fill="#f8cf75" opacity=".13"/>
<path d="M693 409h21v142h-21zm194 0h21v142h-21z" fill="url(#door)"/>
<path d="M617 382Q711 370 748 325H855Q897 367 982 382L952 404H648Z" fill="url(#roof)" stroke="#83a28b" stroke-width="3"/>
<path d="M617 382Q690 385 748 342H855Q915 383 982 382" fill="none" stroke="#d5bd7e" stroke-width="4"/>
<path d="M700 323Q751 308 783 269H818Q853 311 902 323L884 338H719Z" fill="url(#roof)" stroke="#83a28b" stroke-width="3"/>
<path d="M700 323q46 5 83-40h35q43 42 84 40" fill="none" stroke="#d5bd7e" stroke-width="3"/>
<path d="M800 270v-28" stroke="#c9af6c" stroke-width="4"/><circle cx="800" cy="240" r="5" fill="#e7ce8e"/>
<rect x="762" y="359" width="77" height="35" rx="4" fill="#12333b" stroke="#ae9d66" stroke-width="2"/><text x="800" y="383" text-anchor="middle" font-family="serif" fill="#e8d393" font-size="24">金库</text>
<g fill="#d4ad63"><path d="M648 403h14v119h-14zM938 403h14v119h-14z"/></g>
<!-- Foliage and stone lanterns along the island. -->
${[455, 520, 1065, 1145].map((x, i) => `<g transform="translate(${x} ${i % 2 ? 590 : 560})"><path d="M0 32v-56m-4 30l-18-20m24 12l19-26" stroke="#284d43" stroke-width="6"/><ellipse cx="-16" cy="-14" rx="26" ry="16" fill="#39705b"/><ellipse cx="12" cy="-30" rx="28" ry="19" fill="#4a8063"/><ellipse cx="-1" cy="-47" rx="20" ry="17" fill="#578a68"/></g>`).join('')}
${[625, 975].map((x) => `<g transform="translate(${x} 527)"><ellipse cy="40" rx="23" ry="7" fill="#203e3f"/><path d="M-8 36h16L5 1H-5z" fill="#60786b"/><path d="M-15 0h30v-25h-30z" fill="#bda76d"/><rect x="-9" y="-21" width="18" height="17" fill="#ffda79"/><path d="M-25-27l25-18 25 18-5 6h-40z" fill="#355c55"/></g>`).join('')}
<!-- Framing bamboo, with deliberate empty center for the play field. -->
<g fill="#0a2832" stroke="#0c3039" stroke-width="3"><path d="M0 0h100v1000H0ZM1500 0h100v1000h-100Z" opacity=".3"/>
<path d="M-10 0Q140 200 80 550M55 0Q185 152 170 310M1600 0Q1440 180 1520 540M1545 0Q1440 130 1430 330" fill="none" stroke-width="11"/>
${[0, 1, 2, 3, 4].map((i) => `<g transform="translate(${i * 28} ${35 + i * 45}) rotate(${i * 14})"><path d="M0 0q100-85 165-37Q88-6 0 0ZM0 0q98-8 139 62Q51 51 0 0Z"/></g><g transform="translate(${1600 - i * 28} ${35 + i * 45}) scale(-1 1) rotate(${i * 14})"><path d="M0 0q100-85 165-37Q88-6 0 0ZM0 0q98-8 139 62Q51 51 0 0Z"/></g>`).join('')}</g>
<path d="M0 1000V880q95-75 172-11 24-65 102-51 73 4 112 110 77-68 139 72Zm1600 0V880q-95-75-172-11-24-65-102-51-73 4-112 110-77-68-139 72Z" fill="#082734"/>
`,
);

export const islandArt = svg(
  460,
  320,
  `
<defs><linearGradient id="stone" x2="0" y2="1"><stop stop-color="#405e63"/><stop offset="1" stop-color="#142c3e"/></linearGradient><linearGradient id="grass" x2="0" y2="1"><stop stop-color="#5b9578"/><stop offset="1" stop-color="#386f63"/></linearGradient></defs>
<ellipse cx="230" cy="288" rx="163" ry="20" fill="#031d2a" opacity=".35"/>
<path d="M50 162L411 160 385 241 337 252 303 286 261 269 226 310 173 275 137 282 93 235 69 222Z" fill="url(#stone)" stroke="#395660" stroke-width="2"/>
<path d="M82 179l32 53 34-33 26 63 47-47 33 57 28-56 34 34 57-63" fill="none" stroke="#55766d" stroke-width="3" opacity=".5"/>
<ellipse cx="230" cy="161" rx="181" ry="64" fill="url(#grass)" stroke="#7baf8b" stroke-width="4"/>
<ellipse cx="230" cy="157" rx="144" ry="45" fill="#709383" stroke="#a7b29c" stroke-width="3"/>
<ellipse cx="230" cy="158" rx="120" ry="34" fill="none" stroke="#adba9d" stroke-width="2" opacity=".4"/>
<path d="M136 147h188l20 21H118Z" fill="#9b9d83"/><path d="M147 149h166V62H147Z" fill="#2a4b4c" stroke="#9caa86" stroke-width="3"/>
<path d="M164 150V86h132v64" fill="#162e3b" stroke="#bfad72" stroke-width="3"/>
<path d="M120 66q69-6 85-44h52q18 37 84 44l-20 15H139Z" fill="#244b52" stroke="#91ae95" stroke-width="3"/>
<path d="M120 66q55 4 85-30h52q29 33 84 30" fill="none" stroke="#dfc17b" stroke-width="3"/>
<path d="M158 82h10v69h-10zm134 0h10v69h-10z" fill="#c1a66b"/>
<rect x="211" y="60" width="39" height="26" rx="3" fill="#15313b" stroke="#bba96e"/><text x="230" y="80" text-anchor="middle" fill="#edd399" font-family="serif" font-size="20">宝</text>
<g fill="#57916b"><ellipse cx="80" cy="136" rx="28" ry="18"/><ellipse cx="93" cy="120" rx="22" ry="20"/><ellipse cx="371" cy="133" rx="29" ry="19"/><ellipse cx="362" cy="116" rx="20" ry="18"/></g>
<g fill="#a5b79b"><path d="M90 188l22-9 16 10-21 9Zm248 5l19-9 14 10-19 7Z"/></g>
`,
);

export const chestArt = (open: boolean) =>
  svg(
    240,
    220,
    `
<defs><linearGradient id="body" x2="0" y2="1"><stop stop-color="#c66b35"/><stop offset="1" stop-color="#66382c"/></linearGradient><linearGradient id="gold" x2=".5" y2="1"><stop stop-color="#ffeda8"/><stop offset=".5" stop-color="#eeb954"/><stop offset="1" stop-color="#bc782d"/></linearGradient><radialGradient id="glow"><stop stop-color="#ffe5a2" stop-opacity=".8"/><stop offset="1" stop-color="#ffce69" stop-opacity="0"/></radialGradient></defs>
${open ? '<ellipse cx="122" cy="110" rx="115" ry="105" fill="url(#glow)"/>' : ''}
<ellipse cx="120" cy="193" rx="87" ry="15" fill="#061927" opacity=".4"/>
<path d="M35 113L122 90 207 115 195 176 118 201 46 176Z" fill="url(#body)" stroke="#402b2a" stroke-width="4"/>
<path d="M122 140L207 115 195 176 118 201Z" fill="#75402c"/>
<path d="M44 132l75 22 79-22M46 156l73 24 76-26" fill="none" stroke="#592d27" stroke-width="4"/>
<path d="M35 113L120 138 207 115 204 132 119 158 38 132Z" fill="url(#gold)" stroke="#98642e" stroke-width="2"/>
<path d="M47 171l72 22 77-23-2 12-75 23-70-22Z" fill="url(#gold)"/>
<path d="M59 121l15 5 6 62-15-5ZM167 128l16-5-7 64-15 5Z" fill="url(#gold)"/>
<g transform="${open ? 'translate(-8 -54) rotate(-14 120 100)' : 'translate(0 0)'}"><path d="M35 112L31 74Q69 37 126 50L204 76 207 115 120 139Z" fill="url(#body)" stroke="#543027" stroke-width="4"/><path d="M31 74Q69 37 126 50L204 76 119 98Z" fill="#c57a3d"/><path d="M35 112l85 27 87-24-1-13-86 24-87-25Z" fill="url(#gold)"/><path d="M31 74l88 25 85-23 1 12-86 25-87-25Z" fill="url(#gold)"/><path d="M59 56l15-5 7 62-15-4ZM159 61l15 5 6 41-16 5Z" fill="url(#gold)"/></g>
${open ? Array.from({ length: 9 }, (_, i) => `<ellipse cx="${65 + ((i * 29) % 119)}" cy="${112 + ((i * 13) % 24)}" rx="16" ry="7" fill="#edb541" stroke="#ffed9b" stroke-width="3"/>`).join('') : ''}
<rect x="107" y="145" width="25" height="28" rx="5" fill="url(#gold)" stroke="#ae752e" stroke-width="2"/><circle cx="120" cy="155" r="4" fill="#6c432c"/><path d="M120 156v8" stroke="#6c432c" stroke-width="3"/>
`,
  );
export const coinArt = svg(
  48,
  48,
  `<defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#fff2b7"/><stop offset=".5" stop-color="#f9cc64"/><stop offset="1" stop-color="#b97627"/></linearGradient></defs><circle cx="24" cy="26" r="21" fill="#9e632b"/><circle cx="24" cy="22" r="20" fill="url(#g)" stroke="#ffecad" stroke-width="2"/><circle cx="24" cy="22" r="14" fill="none" stroke="#ca8b35" stroke-width="2"/><path d="M19 17h10v10H19z" fill="#b27c31" stroke="#ffe9a3"/>`,
);
export const lanternArt = svg(
  64,
  110,
  `<defs><radialGradient id="g"><stop stop-color="#fff2ad" stop-opacity=".65"/><stop offset="1" stop-color="#ffc968" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="50" rx="32" ry="45" fill="url(#g)"/><path d="M32 0v19" stroke="#b5a46b"/><rect x="20" y="20" width="24" height="4" rx="2" fill="#dbb46e"/><ellipse cx="32" cy="43" rx="18" ry="22" fill="#d37a47"/><ellipse cx="32" cy="43" rx="12" ry="22" fill="#efaf63"/><ellipse cx="32" cy="43" rx="5" ry="22" fill="#ffdd91"/><path d="M16 32h32M14 42h36M16 52h32" stroke="#af693d" stroke-width="1" opacity=".6"/><path d="M23 65h18v4H23zM32 69v20m-4-4 4 9 4-9" stroke="#e3b36b" stroke-width="3"/>`,
);
