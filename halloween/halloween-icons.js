// Small original vector props; no font or emoji dependency.
const svg=body=>'<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+body+'</svg>';
export const icons=[
 svg('<path d="M12 56V27C12 1 52 1 52 27v29l-10-7-10 8-10-8z" fill="#fff1df" stroke="#bd9cd4" stroke-width="2"/><ellipse cx="24" cy="28" rx="4" ry="6" fill="#392051"/><ellipse cx="41" cy="28" rx="4" ry="6" fill="#392051"/><path d="M27 42q5 7 11 0" fill="none" stroke="#392051" stroke-width="3" stroke-linecap="round"/>'),
 svg('<path d="M30 17q-2-10 9-13l3 5q-9 1-8 10" fill="#7a9b49"/><ellipse cx="32" cy="38" rx="29" ry="23" fill="#f99a2c" stroke="#9b3e19" stroke-width="2"/><ellipse cx="32" cy="38" rx="14" ry="23" fill="#f57a20"/><path d="m14 32 11-9 3 13zm36 0-11-9-3 13zM13 44l8 5 5-5 6 6 6-6 5 5 8-5q-4 14-19 14T13 44" fill="#412038"/>'),
 svg('<path d="M29 27 8 9Q13 29 2 39q11-2 14 12 8-13 16-4 8-9 16 4 3-14 14-12Q51 29 56 9L35 27" fill="#a87ce0" stroke="#3a1b58" stroke-width="2"/><path d="m24 20 1-13 8 10 8-10-1 13q9 24-8 29-16-7-8-29" fill="#51256a"/><circle cx="29" cy="28" r="2" fill="#ffe49d"/><circle cx="37" cy="28" r="2" fill="#ffe49d"/>'),
 svg('<path d="m17 29-13-9 2 15-2 15 16-10m27-7 13-13-2 15 2 15-15-8" fill="#b99bf0" stroke="#644492" stroke-width="2"/><rect x="15" y="22" width="35" height="26" rx="13" fill="#ffc988" stroke="#954b4c" stroke-width="2" transform="rotate(-18 32 35)"/><path d="m21 27 23 15m-13-19 14 12" stroke="#f57379" stroke-width="5"/>')
];

export const nightIcons=[icons[0],icons[2],
 svg('<path d="M12 50V25q0-18 20-18t20 18v25l-10 7-10-7-10 7z" fill="#94beba" stroke="#e2d9fb" stroke-width="2"/><path d="m17 13-6-9 15 4m21 5 6-9-15 4" fill="#bda5ed"/><ellipse cx="32" cy="27" rx="12" ry="10" fill="#fff5d6"/><ellipse cx="32" cy="27" rx="5" ry="8" fill="#4d285d"/><path d="M21 44h22l-6 8-5-7-5 7z" fill="#442a57"/>'),
 svg('<path d="M15 29C11 6 53 6 49 29l-6 13v13H21V42z" fill="#ebe1f6" stroke="#aa91ce" stroke-width="2"/><path d="M19 29q7-12 11 0m4 0q6-12 11 0" fill="#393056"/><path d="m29 38 3-7 4 7M23 49h18m-12-7v13m7-13v13" stroke="#5a476d" stroke-width="2"/>')];
