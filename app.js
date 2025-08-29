/* ============================================================
   Agro-Farm Development Project — Strong RBAC + PDF + Branding
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------- Elements ---------- */
const els = {
  projectType: $('#projectType'),
  farmArea: $('#farmArea'),
  region: $('#region'),
  applyPreset: $('#applyPreset'),
  resetAll: $('#resetAll'),

  kpiYield: $('#kpiYield'),
  kpiWater: $('#kpiWater'),
  kpiCost:  $('#kpiCost'),
  kpiProfit:$('#kpiProfit'),
  kpiYieldDelta: $('#kpiYieldDelta'),
  kpiWaterDelta: $('#kpiWaterDelta'),

  trendCanvas: $('#trendChart'),
  resourceCanvas: $('#resourceChart'),

  taskInput: $('#taskInput'),
  addTask: $('#addTask'),
  taskList: $('#taskList'),

  equipInput: $('#equipInput'),
  addEquip: $('#addEquip'),
  equipList: $('#equipList'),

  notes: $('#notes'),

  exportBtn: $('#exportBtn'),
  importFile: $('#importFile'),

  themeToggle: $('#themeToggle'),
  year: $('#year'),

  // Auth & Branding
  loginBtn: $('#loginBtn'),
  logoutBtn: $('#logoutBtn'),
  loginModal: $('#loginModal'),
  doLogin: $('#doLogin'),
  loginName: $('#loginName'),
  loginRole: $('#loginRole'),
  adminPassWrap: $('#adminPassWrap'),
  adminPass: $('#adminPass'),
  roleBadge: $('#roleBadge'),

  settingsBtn: $('#settingsBtn'),
  settingsModal: $('#settingsModal'),
  saveBranding: $('#saveBranding'),
  clearBranding: $('#clearBranding'),
  brandName: $('#brandName'),
  brandTagline: $('#brandTagline'),
  brandColor: $('#brandColor'),
  logoUrl: $('#logoUrl'),
  adminCode: $('#adminCode'),
  orgName: $('#orgName'),
  orgTagline: $('#orgTagline'),
  orgNameFooter: $('#orgNameFooter'),
  orgLogo: $('#orgLogo'),
  fallbackEmoji: $('#fallbackEmoji'),

  // PDF
  btnPDF: $('#btnPDF'),

  // Audit
  auditList: $('#auditList'),
};

/* ---------- Data ---------- */
const BASELINE = {
  yield_t_ha: 4.2,
  water_m3_ha: 3200,
  cost_inr_ha: 38000,
  price_inr_t: 22000,
};

const SCENARIOS = {
  sustainable: { name: 'Sustainable Agriculture', yieldMult: 1.10, waterMult: 0.82, costMult: 0.97, notes: 'Soil health + precision irrigation + IPM.', resource: { water: 40, energy: 25, fertilizer: 20, labor: 15 } },
  diversification: { name: 'Crop Diversification', yieldMult: 1.15, waterMult: 0.95, costMult: 1.02, notes: 'Split acreage across 3–4 crops to reduce risk.', resource: { water: 35, energy: 20, fertilizer: 25, labor: 20 } },
  automation: { name: 'Farm Automation', yieldMult: 1.08, waterMult: 0.88, costMult: 0.92, notes: 'IoT soil sensors, VFD pumps, GPS guidance.', resource: { water: 32, energy: 28, fertilizer: 18, labor: 22 } },
  organic: { name: 'Organic Farming', yieldMult: 0.92, waterMult: 0.90, costMult: 1.10, notes: 'Organic inputs; premium market prices.', pricePremium: 1.35, resource: { water: 38, energy: 18, fertilizer: 14, labor: 30 } },
  agroforestry: { name: 'Agroforestry', yieldMult: 1.05, waterMult: 0.85, costMult: 1.00, notes: 'Trees + crops; long-term carbon & microclimate.', resource: { water: 30, energy: 22, fertilizer: 18, labor: 30 } },
};

/* ---------- RBAC ---------- */
/** Actions controlled by role */
const RBAC_POLICY = {
  guest:    [],
  viewer:   ['pdf:generate', 'audit:view'],
  field:    ['pdf:generate', 'task:complete', 'equip:complete', 'audit:view'],
  manager:  ['pdf:generate','task:add','task:delete','task:complete','equip:add','equip:delete','equip:complete','notes:edit','preset:apply','data:exportimport','audit:view'],
  admin:    ['pdf:generate','task:add','task:delete','task:complete','equip:add','equip:delete','equip:complete','notes:edit','preset:apply','data:exportimport','admin:branding','admin:reset','audit:view'],
};

function currentRole(){ return state.session?.user?.role || 'guest'; }
function authorize(action){
  const allowed = RBAC_POLICY[currentRole()] || [];
  return allowed.includes(action);
}
function requireAuth(action, fn){
  return (...args)=>{
    if(!authorize(action)){
      toast(`Action not permitted for role: ${currentRole()}`, 'warn');
      audit(`DENY ${action}`);
      return;
    }
    audit(`ALLOW ${action}`);
    fn(...args);
  };
}

/* ---------- Storage ---------- */
const KEY = 'agrofarm.v3';
const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };

/* ---------- State ---------- */
let state = {
  projectType: 'sustainable',
  farmArea: 75,
  region: 'monsoon',
  tasks: [
    { id: crypto.randomUUID(), text: 'Soil testing & mapping', done: false },
    { id: crypto.randomUUID(), text: 'Install drip irrigation (Field A)', done: true },
  ],
  equipment: [
    { id: crypto.randomUUID(), text: 'Soil moisture sensors x10', done: false },
    { id: crypto.randomUUID(), text: 'VFD irrigation pump', done: false },
  ],
  notes: '',
  trend: [3.9, 4.1, 4.4, 4.6, 4.8, 5.0], // t/ha

  org: { name:'Agro-Farm Development Project', tagline:'Boost capacity, resource efficiency & profitability', color:'#38bdf8', logoUrl:'', adminCode:'admin123' },

  session: null, // { token, user:{name, role}, expiresAtISO }
  audit: [],     // array of {ts, msg}
};

/* ---------- Utils ---------- */
let trendChart, resourceChart;
function fmtNumber(n, d=1){ return Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }); }
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function nowISO(){ return new Date().toISOString(); }
function toast(msg, level='info'){
  console.log(`[${level}]`, msg);
  // quick visual toast
  const t = document.createElement('div');
  t.className = `toast toast-${level}`;
  t.textContent = msg;
  Object.assign(t.style,{position:'fixed',right:'16px',bottom:'16px',padding:'10px 12px',background:'rgba(2,6,23,.9)',color:'#fff',border:'1px solid rgba(148,163,184,.35)',borderRadius:'12px',zIndex:1000});
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 2200);
}

/* ---------- Audit ---------- */
function audit(message){
  const item = { ts: nowISO(), msg: message, role: currentRole() };
  state.audit.unshift(item);
  renderAudit();
  save(state);
}
function renderAudit(){
  if(!els.auditList) return;
  els.auditList.innerHTML = '';
  (state.audit || []).slice(0,100).forEach(a=>{
    const li = document.createElement('li');
    li.className='list-item';
    li.innerHTML = `<div class="left"><span class="txt">[${a.ts}] (${a.role}) ${a.msg}</span></div>`;
    els.auditList.appendChild(li);
  });
}

/* ---------- KPIs ---------- */
function computeKPIs(){
  const scenario = SCENARIOS[state.projectType];
  const price = scenario.pricePremium ? BASELINE.price_inr_t * scenario.pricePremium : BASELINE.price_inr_t;
  const yieldTHa = BASELINE.yield_t_ha * scenario.yieldMult;
  const water = BASELINE.water_m3_ha * scenario.waterMult;
  const cost = BASELINE.cost_inr_ha * scenario.costMult;
  const revenue = yieldTHa * price;
  const profit = revenue - cost;
  const yieldDelta = (scenario.yieldMult - 1) * 100;
  const waterDelta = (scenario.waterMult - 1) * 100;
  return { yieldTHa, water, cost, profit, yieldDelta, waterDelta };
}
function renderKPIs(){
  const k = computeKPIs();
  els.kpiYield.textContent = fmtNumber(k.yieldTHa);
  els.kpiWater.textContent = fmtNumber(k.water, 0);
  els.kpiCost.textContent  = fmtNumber(k.cost, 0);
  els.kpiProfit.textContent= fmtNumber(k.profit, 0);
  els.kpiYieldDelta.textContent = `${k.yieldDelta>=0?'+':''}${fmtNumber(k.yieldDelta,0)}%`;
  els.kpiWaterDelta.textContent = `${k.waterDelta>=0?'+':''}${fmtNumber(k.waterDelta,0)}%`;
}

/* ---------- Lists with RBAC ---------- */
function renderList(container, items, { completeAction, deleteAction }){
  container.innerHTML = '';
  items.forEach(item=>{
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="left">
        <input type="checkbox" ${item.done?'checked':''} aria-label="toggle" />
        <span class="txt ${item.done?'strike':''}">${item.text}</span>
      </div>
      <div class="actions">
        <button class="btn outline icon btn-del"><i data-lucide="trash-2"></i></button>
      </div>`;
    const [checkbox] = li.getElementsByTagName('input');
    const delBtn = li.querySelector('.btn-del');

    checkbox.disabled = !authorize(completeAction);
    if(!authorize(deleteAction)) delBtn.classList.add('hidden');

    checkbox.addEventListener('change', requireAuth(completeAction,()=>{
      item.done = checkbox.checked;
      audit(`${completeAction} -> ${item.text}`);
      save(state); renderLists();
    }));

    delBtn.addEventListener('click', requireAuth(deleteAction,()=>{
      const listKey = container === els.taskList ? 'tasks' : 'equipment';
      state[listKey] = state[listKey].filter(x=>x.id!==item.id);
      audit(`${deleteAction} -> ${item.text}`);
      save(state); renderLists();
    }));

    container.appendChild(li);
  });
  lucide.createIcons();
}

const addTask = requireAuth('task:add', ()=>{
  const txt = els.taskInput.value.trim();
  if(!txt) return;
  state.tasks.unshift({ id: crypto.randomUUID(), text: txt, done: false });
  els.taskInput.value=''; audit('task:add');
  save(state); renderLists();
});
const addEquip = requireAuth('equip:add', ()=>{
  const txt = els.equipInput.value.trim();
  if(!txt) return;
  state.equipment.unshift({ id: crypto.randomUUID(), text: txt, done: false });
  els.equipInput.value=''; audit('equip:add');
  save(state); renderLists();
});

function renderLists(){
  renderList(els.taskList, state.tasks, { completeAction:'task:complete', deleteAction:'task:delete' });
  renderList(els.equipList, state.equipment, { completeAction:'equip:complete', deleteAction:'equip:delete' });

  // Inputs editable?
  $$('.can-edit').forEach(el=>{
    const ok = authorize('notes:edit') || el !== els.notes; // notes specifically
    const isAddRow = el.closest('[data-action="task:add"],[data-action="equip:add"]');
    if(isAddRow) {
      el.disabled = !authorize(isAddRow.dataset.action);
      el.classList.toggle('readonly', !authorize(isAddRow.dataset.action));
    } else if (el === els.notes) {
      el.disabled = !authorize('notes:edit');
      el.classList.toggle('readonly', !authorize('notes:edit'));
    } else {
      el.disabled = !authorize('preset:apply'); // farmArea change considered edit permission (manager+)
    }
  });

  // Toggle visibility for any data-action block/button
  $$('[data-action]').forEach(node=>{
    const action = node.dataset.action;
    const show = action==='pdf:generate' ? true : authorize(action) || ['audit:view'].includes(action);
    node.classList.toggle('hidden', !show && node !== els.notes);
  });
}

/* ---------- Charts ---------- */
function initCharts(){
  const labels = ['S1','S2','S3','S4','S5','S6'];
  const { yieldTHa } = computeKPIs();
  const trendData = state.trend.map((v,i)=> i===state.trend.length-1 ? yieldTHa : v);

  trendChart = new Chart(els.trendCanvas.getContext('2d'), {
    type:'line',
    data:{ labels, datasets:[{ label:'Yield (t/ha)', data:trendData, tension:.3, fill:false, borderWidth:3, pointRadius:3 }]},
    options:{ responsive:true, plugins:{ legend:{display:true}, tooltip:{mode:'index',intersect:false} }, scales:{ x:{grid:{display:false}}, y:{beginAtZero:false} } }
  });

  const scenario = SCENARIOS[state.projectType];
  resourceChart = new Chart(els.resourceCanvas.getContext('2d'), {
    type:'doughnut',
    data:{ labels:['Water','Energy','Fertilizer','Labor'], datasets:[{ label:'Share (%)', data:[scenario.resource.water, scenario.resource.energy, scenario.resource.fertilizer, scenario.resource.labor] }]},
    options:{ responsive:true, plugins:{ legend:{position:'bottom'} }, cutout:'60%' }
  });
}
function updateCharts(){
  const { yieldTHa } = computeKPIs();
  trendChart.data.datasets[0].data[trendChart.data.datasets[0].data.length-1] = yieldTHa;
  trendChart.update();
  const s = SCENARIOS[state.projectType];
  resourceChart.data.datasets[0].data = [s.resource.water, s.resource.energy, s.resource.fertilizer, s.resource.labor];
  resourceChart.update();
}

/* ---------- Preset ---------- */
const applyPreset = requireAuth('preset:apply', ()=>{
  const type = els.projectType.value;
  state.projectType = type;
  const { yieldTHa } = computeKPIs();
  state.trend = state.trend.map((v,i)=> i<state.trend.length-1 ? v : yieldTHa);
  const regionMods = { temperate:1.00, tropical:1.04, arid:0.92, monsoon:1.02 };
  const r = regionMods[els.region.value] || 1;
  state.trend = state.trend.map(v=> v*r);
  state.farmArea = clamp(parseFloat(els.farmArea.value || '0'), 0, 100000);
  state.region = els.region.value;
  audit('preset:apply');
  save(state); renderKPIs(); updateCharts();
});

/* ---------- Import/Export ---------- */
const exportData = requireAuth('data:exportimport', ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'agro-farm-project.json'; a.click();
  URL.revokeObjectURL(url);
  audit('data:export');
});
function importData(file){
  if(!authorize('data:exportimport')) return toast('Not permitted', 'warn');
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const parsed = JSON.parse(e.target.result);
      if(!parsed || typeof parsed!=='object') throw new Error('Invalid file');
      // keep current session, but import everything else
      const keepSession = state.session;
      state = { ...state, ...parsed, session: keepSession };
      hydrateFormFromState(); applyBranding(); renderKPIs(); renderLists(); updateCharts(); save(state);
      audit('data:import');
    }catch(err){ alert('Import failed: ' + err.message); }
  };
  reader.readAsText(file);
}

/* ---------- Theme ---------- */
function getTheme(){ return localStorage.getItem('theme') || 'auto'; }
function setTheme(mode){
  if(mode==='dark'){ document.documentElement.style.colorScheme='dark'; }
  if(mode==='light'){ document.documentElement.style.colorScheme='light'; }
  if(mode==='auto'){ document.documentElement.style.colorScheme='normal'; }
  localStorage.setItem('theme', mode);
  const icon = getTheme()==='dark' ? 'moon' : 'sun';
  $('#themeToggle').innerHTML = `<i data-lucide="${icon}"></i>`;
  lucide.createIcons();
}
function toggleTheme(){
  const cur = getTheme();
  const next = cur==='dark' ? 'light' : (cur==='light' ? 'auto' : 'dark');
  setTheme(next);
}

/* ---------- Branding ---------- */
function applyBranding(){
  document.documentElement.style.setProperty('--brand', state.org.color || '#38bdf8');
  els.orgName.textContent = state.org.name || 'Agro-Farm Development Project';
  els.orgTagline.textContent = state.org.tagline || 'Boost capacity, resource efficiency & profitability';
  els.orgNameFooter.textContent = state.org.name || 'Agro-Farm Dev';
  if(state.org.logoUrl){
    els.orgLogo.src = state.org.logoUrl; els.orgLogo.classList.remove('hidden'); els.fallbackEmoji.classList.add('hidden');
  } else {
    els.orgLogo.classList.add('hidden'); els.fallbackEmoji.classList.remove('hidden');
  }
}
function saveBranding(){
  if(!authorize('admin:branding')) return toast('Not permitted', 'warn');
  state.org.name = els.brandName.value.trim() || 'Agro-Farm Development Project';
  state.org.tagline = els.brandTagline.value.trim();
  state.org.color = els.brandColor.value || '#38bdf8';
  state.org.logoUrl = els.logoUrl.value.trim();
  state.org.adminCode = els.adminCode.value.trim() || 'admin123';
  save(state); applyBranding(); closeSettings(); audit('admin:branding save');
}
function clearBranding(){
  if(!authorize('admin:branding')) return toast('Not permitted', 'warn');
  state.org = { name:'Agro-Farm Development Project', tagline:'Boost capacity, resource efficiency & profitability', color:'#38bdf8', logoUrl:'', adminCode:'admin123' };
  save(state); hydrateFormFromState(); applyBranding(); audit('admin:branding clear');
}

/* ---------- Auth ---------- */
function openLogin(){ els.loginModal.classList.remove('hidden'); }
function closeLogin(){ els.loginModal.classList.add('hidden'); }
function openSettings(){
  if(!authorize('admin:branding')) return toast('Not permitted', 'warn');
  hydrateFormFromState(); els.settingsModal.classList.remove('hidden');
}
function closeSettings(){ els.settingsModal.classList.add('hidden'); }

function startSession(user){
  const token = crypto.randomUUID();
  const expires = new Date(Date.now()+8*60*60*1000).toISOString(); // 8h
  state.session = { token, user, expiresAtISO: expires };
  save(state);
}
function endSession(){
  state.session = null;
  save(state);
}

function sessionValid(){
  if(!state.session) return false;
  return new Date(state.session.expiresAtISO) > new Date();
}

function updateAuthUI(){
  const user = state.session?.user;
  els.loginBtn.classList.toggle('hidden', !!user);
  els.logoutBtn.classList.toggle('hidden', !user);
  els.roleBadge.textContent = user ? `${user.role[0].toUpperCase()}${user.role.slice(1)} — ${user.name}` : 'Guest';
  // Color hint by role
  const roleColors = { admin:'#ef4444', manager:'#38bdf8', field:'#22c55e', viewer:'#a3b1c2', guest:'#a3b1c2' };
  els.roleBadge.style.borderColor = roleColors[user?.role || 'guest'];
  renderLists();
}

function doLogin(){
  const name = els.loginName.value.trim();
  const role = els.loginRole.value;
  if(!name) return alert('Please enter your name.');
  if(role==='admin'){
    const code = els.adminPass.value;
    if(code !== (state.org.adminCode || 'admin123')) return alert('Invalid admin passcode.');
  }
  startSession({ name, role });
  audit(`login as ${role}`);
  updateAuthUI();
  closeLogin();
}

function logout(){
  audit('logout');
  endSession();
  updateAuthUI();
}

/* Show admin pass field only if "admin" chosen */
els.loginRole?.addEventListener('change', ()=>{
  els.adminPassWrap.style.display = (els.loginRole.value==='admin') ? 'block' : 'none';
});

/* ---------- PDF ---------- */
const generatePDF = requireAuth('pdf:generate', async ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const margin = 36; let y = margin;

  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text(state.org.name || 'Agro-Farm Development Project', margin, y);
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text((state.org.tagline || ''), margin, y+16);
  doc.text(`Report Date: ${todayISO()}`, 450, y+16, { align:'right' });
  y += 40;

  const k = computeKPIs();
  const rows = [
    ['Focus Area', SCENARIOS[state.projectType].name],
    ['Farm Area (ha)', String(state.farmArea)],
    ['Region', String(state.region)],
    ['Yield (t/ha)', fmtNumber(k.yieldTHa)],
    ['Water (m³/ha)', fmtNumber(k.water,0)],
    ['Cost (₹/ha)', fmtNumber(k.cost,0)],
    ['Profit (₹/ha)', fmtNumber(k.profit,0)],
  ];
  doc.setFont('helvetica','bold'); doc.text('Key Metrics', margin, y); y+=10;
  doc.setFont('helvetica','normal');
  rows.forEach((r,i)=>{ doc.text(`${r[0]}:`, margin, y+18*i); doc.text(`${r[1]}`, 200, y+18*i); });
  y += 18*rows.length + 18;

  // Charts
  const tImg = els.trendCanvas.toDataURL('image/png', 1.0);
  const rImg = els.resourceCanvas.toDataURL('image/png', 1.0);
  doc.setFont('helvetica','bold'); doc.text('Charts', margin, y); y+=8;
  doc.addImage(tImg, 'PNG', margin, y, 520, 180); y+=192;
  doc.addImage(rImg, 'PNG', margin, y, 260, 180); y+=192;

  // Tasks & Equipment
  doc.addPage(); y = margin;
  doc.setFont('helvetica','bold'); doc.text('Tasks', margin, y); y+=14;
  doc.setFont('helvetica','normal');
  state.tasks.forEach(t=>{ if(y>770){ doc.addPage(); y=margin; } doc.text(`${t.done?'[x]':'[ ]'} ${t.text}`, margin, y); y+=16; });
  if(y>720){ doc.addPage(); y=margin; }
  doc.setFont('helvetica','bold'); doc.text('Equipment & Automation', margin, y); y+=14;
  doc.setFont('helvetica','normal');
  state.equipment.forEach(e=>{ if(y>770){ doc.addPage(); y=margin; } doc.text(`${e.done?'[x]':'[ ]'} ${e.text}`, margin, y); y+=16; });

  if(y>680){ doc.addPage(); y=margin; }
  doc.setFont('helvetica','bold'); doc.text('Notes', margin, y); y+=14;
  doc.setFont('helvetica','normal');
  const lines = doc.splitTextToSize(state.notes || '—', 520);
  lines.forEach(line=>{ if(y>780){ doc.addPage(); y=margin; } doc.text(line, margin, y); y+=16; });

  doc.save(`AgroFarm_Report_${todayISO()}.pdf`);
  audit('pdf:generate');
});

/* ---------- Form Sync ---------- */
function hydrateFormFromState(){
  els.projectType.value = state.projectType;
  els.farmArea.value = state.farmArea;
  els.region.value = state.region;
  els.notes.value = state.notes || '';

  // Branding form
  els.brandName.value = state.org.name || '';
  els.brandTagline.value = state.org.tagline || '';
  els.brandColor.value = state.org.color || '#38bdf8';
  els.logoUrl.value = state.org.logoUrl || '';
  els.adminCode.value = state.org.adminCode || 'admin123';
}
function renderAll(){
  state.projectType = els.projectType.value;
  state.farmArea = clamp(parseFloat(els.farmArea.value || '0'), 0, 100000);
  state.region = els.region.value;
  renderKPIs(); updateCharts(); save(state);
}

/* ---------- Events ---------- */
function attachEvents(){
  els.applyPreset.addEventListener('click', applyPreset);
  els.resetAll.addEventListener('click', requireAuth('admin:reset', ()=>{
    if(confirm('Reset all data?')) { localStorage.removeItem(KEY); location.reload(); }
  }));

  els.addTask.addEventListener('click', addTask);
  els.taskInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addTask(); });

  els.addEquip.addEventListener('click', addEquip);
  els.equipInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addEquip(); });

  els.notes.addEventListener('input', ()=> {
    if(!authorize('notes:edit')) { els.notes.value = state.notes; return toast('Not permitted','warn'); }
    state.notes = els.notes.value; save(state);
  });

  els.exportBtn.addEventListener('click', exportData);
  els.importFile.addEventListener('change', (e)=>{ if(e.target.files?.[0]) importData(e.target.files[0]); });

  els.themeToggle.addEventListener('click', toggleTheme);
  ['change','input'].forEach(evt => {
    els.projectType.addEventListener(evt, renderAll);
    els.farmArea.addEventListener(evt, renderAll);
    els.region.addEventListener(evt, renderAll);
  });

  // Auth & Settings
  els.loginBtn.addEventListener('click', openLogin);
  els.logoutBtn.addEventListener('click', logout);
  els.doLogin.addEventListener('click', doLogin);
  $("[data-close-login]")?.addEventListener('click', closeLogin);
  $("#settingsBtn")?.addEventListener('click', openSettings);
  $("[data-close-settings]")?.addEventListener('click', closeSettings);
  els.saveBranding.addEventListener('click', saveBranding);
  els.clearBranding.addEventListener('click', clearBranding);

  // PDF
  els.btnPDF.addEventListener('click', generatePDF);
}

/* ---------- Boot ---------- */
function boot(){
  els.year.textContent = new Date().getFullYear();

  const saved = load();
  if(saved){ state = { ...state, ...saved }; }

  // session expiry check
  if(state.session && !sessionValid()){
    audit('session expired');
    endSession();
  }

  hydrateFormFromState();
  renderKPIs();
  initCharts();
  attachEvents();
  setTheme(getTheme());
  applyBranding();
  updateAuthUI();
  renderLists();
  renderAudit();
  lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', boot);
