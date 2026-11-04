// A light native map model. The operator remains at home; this is the scout.
export function scoutMapFigure(facing=1){
 return `<g class="army-march-company scout-company" transform="scale(${facing} 1)"><rect class="army-company-hit" x="-30" y="-49" width="62" height="61"/><ellipse class="army-march-shadow" cx="0" cy="8" rx="28" ry="5"/><g class="scout-horse">
 <path class="scout-tail" d="M-17-14Q-29-19-26 1l-4 5q13-3 12-17"/>
 <g class="scout-leg scout-leg-far"><path d="m-12-8 1 10-7 7m24-18 9 8-2 10"/></g>
 <path class="scout-horse-body" d="M-19-14q7-8 25-3l9-17 9 3-2 12 6 4-2 5-10-2-5 9q-12 6-26-1Z"/>
 <path class="scout-mane" d="m8-17 7-19 6-1-3 7-5 18Z"/>
 <path class="scout-horse-body" d="m16-33 1-9 4 7 5-4-2 10"/>
 <circle class="scout-eye" cx="22" cy="-28" r="1"/>
 <path class="scout-bridle" d="m18-31 6 9-4 5M25-18 7-21"/>
 <g class="scout-leg scout-leg-near"><path d="m-14-5-3 8 4 6m20-15 3 9 8 6"/></g>
 <path class="scout-saddle" d="M-12-19H5l-1 12h-15Z"/>
 <g class="scout-rider"><path class="scout-cloak" d="M-6-34q-3 7-15 12l10 4 10-8Z"/>
 <path class="scout-rider-coat" d="m-5-35 8 1 5 13-14 2Z"/><path class="scout-rider-boot" d="m0-20-2 12 6 1"/>
 <path class="scout-arm" d="m1-31 8 7 8-1"/><circle class="army-face" cx="-1" cy="-40" r="4"/>
 <path class="scout-hood" d="M-6-39q-1-11 9-6l3 6-6-2Z"/>
 <path class="scout-bow" d="M-10-38q-12 9-6 20m6-20-6 20"/>
 </g></g></g>`;
}
