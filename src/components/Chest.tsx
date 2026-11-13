export function Chest({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? 'chest small' : 'chest'}
      viewBox="0 0 420 330"
      fill="none"
      role="img"
      aria-label="Rương kho báu đầy vàng"
    >
      <defs>
        <linearGradient
          id="wood"
          x1="160"
          y1="130"
          x2="280"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#AF592B" />
          <stop offset="1" stopColor="#703326" />
        </linearGradient>
        <linearGradient
          id="gold"
          x1="130"
          y1="120"
          x2="260"
          y2="280"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFF0A1" />
          <stop offset=".45" stopColor="#FFCF46" />
          <stop offset="1" stopColor="#EAA029" />
        </linearGradient>
      </defs>
      <ellipse cx="220" cy="287" rx="141" ry="23" fill="#38205C" opacity=".16" />
      <path d="M91 182L234 144L349 190L210 240Z" fill="#FFD265" />
      <path d="M91 182L210 220L349 190L333 267L210 305L105 266Z" fill="url(#wood)" />
      <path d="M210 220V305L333 267L349 190Z" fill="#804024" />
      <path
        d="M104 202L208 237M108 230L208 265M229 238L337 207M227 266L334 234"
        stroke="#542A22"
        strokeWidth="5"
        opacity=".45"
      />
      <path d="M91 182L210 220L349 190L345 210L210 248L95 208Z" fill="url(#gold)" />
      <path d="M105 254L210 288L334 252L331 269L210 307L107 272Z" fill="url(#gold)" />
      <path
        d="M124 192L143 198L155 283L135 278ZM283 204L301 198L289 282L271 287Z"
        fill="url(#gold)"
      />
      <path d="M94 174L80 103Q150 44 239 63L339 116L346 176L216 213Z" fill="url(#wood)" />
      <path d="M80 103Q150 44 239 63L339 116L217 153Z" fill="#B96732" />
      <path d="M94 174L216 213L346 176L342 159L216 191L91 154Z" fill="url(#gold)" />
      <path d="M81 104L216 151L338 115L342 132L216 169L84 122Z" fill="url(#gold)" />
      <path d="M116 81L137 74L156 173L136 167ZM270 80L290 91L307 168L288 173Z" fill="url(#gold)" />
      <path d="M104 174L214 207L333 175Q268 133 218 166Q166 135 104 174Z" fill="#FFD558" />
      {[
        [137, 166],
        [168, 159],
        [198, 175],
        [229, 162],
        [264, 166],
        [295, 177],
        [172, 181],
        [240, 184],
      ].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="20" ry="9" fill="#EBA42A" stroke="#FFF0A1" strokeWidth="3" />
          <path d={`M${x - 7} ${y}h14`} stroke="#FFD45E" strokeWidth="3" />
        </g>
      ))}
      <rect
        x="196"
        y="225"
        width="29"
        height="36"
        rx="6"
        fill="#FFDD71"
        transform="rotate(3 196 225)"
      />
      <circle cx="210" cy="239" r="5" fill="#975329" />
      <path d="M210 240v9" stroke="#975329" strokeWidth="4" />
      <g fill="url(#gold)" stroke="#FFF0A1" strokeWidth="3">
        <ellipse cx="79" cy="251" rx="24" ry="10" transform="rotate(-22 79 251)" />
        <ellipse cx="324" cy="289" rx="24" ry="9" />
        <ellipse cx="351" cy="276" rx="22" ry="9" />
        <ellipse cx="310" cy="70" rx="15" ry="22" transform="rotate(25 310 70)" />
      </g>
      <g fill="#FFE6A0">
        <path d="M65 139l5-13 5 13 13 5-13 5-5 13-5-13-13-5Z" />
        <path d="M359 91l4-10 4 10 10 4-10 4-4 10-4-10-10-4Z" />
        <path d="M242 34l4-12 4 12 12 4-12 4-4 12-4-12-12-4Z" />
      </g>
    </svg>
  );
}
