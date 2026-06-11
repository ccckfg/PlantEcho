const check = '<path d="M20 6 9 17l-5-5"/>';
const close = '<path d="M18 6 6 18M6 6l12 12"/>';
const leaf = '<path d="M5 19c9 1 14-4 14-14C9 5 4 10 5 19Z"/><path d="M7 17c3-4 6-6 10-8"/>';
const photo = '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><path d="m21 16-5-5L5 19"/>';
const plant = '<path d="M12 21V10"/><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8Z"/><path d="M12 12c5 0 8-3 8-8-5 0-8 3-8 8Z"/>';
const sensor = '<path d="M7 12a5 5 0 0 1 10 0"/><path d="M4 12a8 8 0 0 1 16 0"/><circle cx="12" cy="15" r="2"/>';
const arrowUp = '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>';
const arrowBack = '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>';
const upload = '<path d="M12 16V4"/><path d="m5 11 7-7 7 7"/><path d="M5 20h14"/>';
const refresh = '<path d="M20 12a8 8 0 0 1-14 5"/><path d="M4 12a8 8 0 0 1 14-5"/><path d="M18 3v4h-4M6 21v-4h4"/>';
const alert = '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/>';
const key = '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m16 7 2 2"/><path d="m14 9 2 2"/>';
const book = '<path d="M4 5a3 3 0 0 1 3-3h13v18H7a3 3 0 0 0-3 3V5Z"/><path d="M4 19a3 3 0 0 1 3-3h13"/>';
const chat = '<path d="M21 12a8 8 0 0 1-8 8H6l-3 3v-7a8 8 0 1 1 18-4Z"/>';
const tune = '<path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h2"/><path d="M10 12h10"/><circle cx="8" cy="12" r="2"/><path d="M4 18h10"/><path d="M18 18h2"/><circle cx="16" cy="18" r="2"/>';

export const iconPaths: Record<string, string> = {
  remove: '<path d="M5 12h14"/>', crop_square: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  add_photo_alternate: photo, photo_camera: photo, photo_library: photo, hide_image: photo,
  eco: leaf, energy_savings_leaf: leaf, local_florist: plant, potted_plant: plant,
  sensors: sensor, sensors_off: sensor, monitor_heart: sensor, dns: '<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/><path d="M8 7h.01M8 17h.01"/>',
  water_drop: '<path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11Z"/>',
  light_mode: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  thermostat: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/>',
  air: '<path d="M3 8h12a3 3 0 1 0-3-3"/><path d="M3 12h16"/><path d="M3 16h12a3 3 0 1 1-3 3"/>',
  arrow_back: arrowBack, arrow_forward: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', arrow_upward: arrowUp,
  upload, cloud_upload: upload, move_to_inbox: '<path d="M12 3v10"/><path d="m7 8 5 5 5-5"/><path d="M4 14v5h16v-5"/>',
  check, check_circle: '<circle cx="12" cy="12" r="9"/>' + check, close, error: alert, info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  key, lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  visibility: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  visibility_off: '<path d="m3 3 18 18"/><path d="M10.6 10.6a3 3 0 0 0 4 4"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.8"/><path d="M6.7 6.7C3.7 8.7 2 12 2 12s4 7 10 7c1.3 0 2.5-.3 3.6-.8"/>',
  delete: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/>', delete_forever: '<path d="M4 7h16"/><path d="m10 11 4 4M14 11l-4 4"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/>',
  progress_activity: '<path d="M21 12a9 9 0 0 1-9 9"/><path d="M12 3a9 9 0 0 1 9 9"/>',
  refresh, sync_alt: refresh, schedule: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', calendar_month: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  forum: chat, menu_book: book, history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m14 6 4 4"/>', edit_note: '<path d="M4 6h10M4 10h8M4 14h7"/><path d="M14 19h6"/><path d="m16 17 3-3 2 2-3 3h-2v-2Z"/>',
  content_cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  more_vert: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  zoom_in: '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6M10 7v6M7 10h6"/>',
  cloud_off: '<path d="m3 3 18 18"/><path d="M8 18H6a4 4 0 1 1 1-7 6 6 0 0 1 9-4"/><path d="M17 18h1a3 3 0 0 0 1.7-5.5"/>',
  auto_awesome: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>',
  psychiatry: '<path d="M12 21V10"/><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8Z"/><path d="M12 12c5 0 8-3 8-8-5 0-8 3-8 8Z"/><path d="M7 21h10"/>',
  rule: '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>' + check, tune,
  place: '<path d="M12 21s7-5 7-11a7 7 0 1 0-14 0c0 6 7 11 7 11Z"/><circle cx="12" cy="10" r="2"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 5 2 5H5"/>', straighten: '<path d="M4 17 17 4l3 3L7 20 4 17Z"/><path d="m8 16-2-2M12 12l-2-2M16 8l-2-2"/>',
  bedtime: '<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>',
  tips_and_updates: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/>',
  verified: '<path d="m9 12 2 2 4-5"/><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z"/>',
  content_copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><rect x="4" y="4" width="11" height="11" rx="2"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  send: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/>', save: '<path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8"/><path d="M8 21v-7h8v7"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
};

