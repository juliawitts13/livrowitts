var SB_URL  = 'https://casxbqfhqejmsoydnoph.supabase.co';
var SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhc3hicWZocWVqbXNveWRub3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTUyNTksImV4cCI6MjA5ODIzMTI1OX0.kTYP2Ei9sIARW2qyCMLkpeimvjbL_Rc-HBHVWVr0BOM';
var PID     = '00000000-0000-0000-0000-000000002030';

function sbFetch(path) {
  var url = SB_URL + '/rest/v1/' + path;
  return fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Accept': 'application/json'
    }
  })
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.statusText);
    return r.json();
  });
}

function sbPatch(table, filter, body) {
  return fetch(SB_URL + '/rest/v1/' + table + '?' + filter, {
    method: 'PATCH',
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function sbPost(table, body) {
  return fetch(SB_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function sbDelete(table, id) {
  return fetch(SB_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'DELETE',
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY
    }
  }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  });
}

function setEl(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function statusInfo(s) {
  if (s === 'done')   return { cls:'sd', label:'Finalizado' };
  if (s === 'review') return { cls:'sr', label:'Em revisão' };
  if (s === 'outline')return { cls:'sf', label:'Esboço' };
  return                     { cls:'sf', label:'Rascunho'  };
}

// ─── ESTADO GLOBAL ──────────────────────────────────────────────────────────
var allChapters = [];
var allChars = [];
var allLocations = [];
var allTimelineEvents = [];
var allRelationships = [];
var currentChapter = null;
var currentCharId = null;
var currentLocationId = null;
var currentTimelineId = null;
var chSaveTimer = null;

var CHAR_COLORS = [
  'linear-gradient(135deg,#6B5FE4,#9B8FF8)',
  'linear-gradient(135deg,#C84B31,#E07B54)',
  'linear-gradient(135deg,#1D7A4A,#35A96B)',
  'linear-gradient(135deg,#8B4513,#CD853F)',
  'linear-gradient(135deg,#4A90D9,#7BB3E8)',
  'linear-gradient(135deg,#7B4FA0,#AF74D6)',
  'linear-gradient(135deg,#444,#888)'
];

var IDEA_CATEGORIES = ['Trama', 'Personagem', 'Worldbuilding', 'Cena', 'Diálogo', 'Presságio', 'Tema', 'Reviravolta na trama'];
var IDEA_EMOJIS = ['💡', '🎭', '🌍', '✨', '🔗', '⚡', '🎨', '🔮', '🗝️', '📖'];

var CHAR_FALLBACK = [
  {id:'1',name:'Alyssa Beckett',role:'Protagonista · Climatologista',initials:'AL',avatar_color:'linear-gradient(135deg,#6B5FE4,#9B8FF8)',status:'alive',age:30,nationality:'Australiana',occupation:'Dra. em Climatologia',description:'Carrega a culpa pelo acidente que matou Dr. Walter Shaw.',personality:'Disciplinada, intensa, fechada.',goals:'Concluir a missão do Dr. Walter.',fears:'Perder mais pessoas por suas decisões.',virtues:'',flaws:'',physical_desc:'1,70m, olhos verde-esmeralda, cabelos pretos.',arc_notes:''},
  {id:'2',name:'Larissa Moreira',role:'Protagonista · Oceanógrafa',initials:'LA',avatar_color:'linear-gradient(135deg,#C84B31,#E07B54)',status:'alive',age:null,nationality:'Brasileira',occupation:'Oceanógrafa e ativista',description:'Salvou Alyssa de se afogar no Cap. 7.',personality:'Empática, direta, corajosa.',goals:'Usar a ciência como ferramenta real.',fears:'Ser responsável por algo sair errado.',virtues:'',flaws:'',physical_desc:'Pele bronzeada, cabelo loiro ondulado.',arc_notes:''},
  {id:'3',name:'Dr. Ryan Walker',role:'Antagonista · Bioquímico',initials:'RY',avatar_color:'linear-gradient(135deg,#8B4513,#CD853F)',status:'alive',age:null,nationality:'Norte-americano',occupation:'Consultor de empresas privadas',description:'Culpa Alyssa pelo acidente com Dr. Walter.',personality:'Calculista, manipulador.',goals:'Roubar as pesquisas de Alyssa.',fears:'Ser desmascarado.',virtues:'',flaws:'',physical_desc:'Pele bronzeada, corpo atlético.',arc_notes:''}
];

// ─── CAPÍTULOS ──────────────────────────────────────────────────────────────
function loadChapters() {
  sbFetch('chapters?project_id=eq.' + PID + '&order=sort_order.asc&select=*')
    .then(function(rows) {
      var list = document.getElementById('ch-list');
      if (!list || !rows || !rows.length) return;
      allChapters = rows;
      list.innerHTML = '';
      var total = rows.reduce(function(s,r){ return s + (r.word_count||0); }, 0);
      document.querySelectorAll('.stat-total-w').forEach(function(el){ el.textContent = total.toLocaleString('pt-BR'); });
      document.querySelectorAll('.stat-total-c').forEach(function(el){ el.textContent = rows.length; });
      setEl('ch-count-badge', rows.length);

      rows.forEach(function(ch, i) {
        var st = statusInfo(ch.status);
        var lbl = ch.chapter_label || ('Cap. ' + ch.chapter_number);
        var div = document.createElement('div');
        div.className = 'cpi' + (i === 0 ? ' on' : '');
        var n = document.createElement('div'); n.className='cpn'; n.textContent=lbl;
        var t = document.createElement('div'); t.className='cpt'; t.textContent=ch.title;
        var m = document.createElement('div'); m.className='cpm';
        var w = document.createElement('span'); w.className='cpw'; w.textContent=(ch.word_count||0).toLocaleString('pt-BR')+' palavras';
        var b = document.createElement('span'); b.className='ck '+st.cls; b.style.cssText='font-size:9px;padding:1px 6px;'; b.textContent=st.label;
        m.appendChild(w); m.appendChild(b);
        div.appendChild(n); div.appendChild(t); div.appendChild(m);
        (function(c) {
          div.onclick = function() { openCap(div, c); };
        })(ch);
        list.appendChild(div);
      });

      // Dashboard: capítulos recentes
      var rec = document.getElementById('recent-list');
      if (rec) {
        var sorted = rows.slice().sort(function(a,b){ return new Date(b.updated_at)-new Date(a.updated_at); });
        rec.innerHTML = '';
        sorted.slice(0,4).forEach(function(ch,i) {
          var st = statusInfo(ch.status);
          var d = Math.floor((Date.now()-new Date(ch.updated_at))/86400000);
          var ta = d===0?'hoje':d===1?'ontem':'há '+d+' dias';
          var item = document.createElement('div'); item.className='chi'; item.style.cursor='pointer';
          item.onclick = function(){ go('caps',document.querySelectorAll('.ni')[2]); };
          item.innerHTML = '<div class="cn">'+(i+1)+'</div><div class="ci"><div class="ct">'+ch.title+'</div><div class="cm">'+(ch.word_count||0).toLocaleString('pt-BR')+' palavras · '+ta+'</div></div><div class="ck '+st.cls+'">'+st.label+'</div>';
          rec.appendChild(item);
        });
      }

      openCap(list.firstChild, rows[0]);
    })
    .catch(function(e){ console.error('chapters error', e); });
}

function openCap(el, ch) {
  document.querySelectorAll('.cpi').forEach(function(i) { i.classList.remove('on'); });
  if (el) el.classList.add('on');
  currentChapter = ch;

  var st = statusInfo(ch.status);

  var ti = document.getElementById('etit');
  if (ti) ti.value = ch.chapter_label ? ch.chapter_label + ' — ' + ch.title : ch.title;

  var bd = document.getElementById('ebdg');
  if (bd) { bd.textContent = st.label; bd.className = 'ck ' + st.cls; bd.style.display = 'inline-flex'; }

  document.getElementById('ee').style.display         = 'none';
  document.getElementById('ch-detail').style.display  = 'flex';
  document.getElementById('ch-detail').style.flexDirection = 'column';

  var words   = (ch.word_count || 0).toLocaleString('pt-BR');
  var edited  = ch.updated_at ? new Date(ch.updated_at).toLocaleDateString('pt-BR', {day:'2-digit',month:'short',year:'numeric'}) : '—';

  setEl('ch-words-disp', words + ' palavras');
  setEl('ch-status-disp', st.label);
  setEl('ch-edited-disp', edited);

  var sel = document.getElementById('ch-status-sel');
  if (sel) sel.value = ch.status || 'draft';

  var syn = document.getElementById('ch-synopsis');
  if (syn) syn.value = ch.synopsis || '';

  var not = document.getElementById('ch-notes');
  if (not) not.value = ch.notes || '';

  setEl('ch-save-status', '');
}

// ─── PÁGINA DE ESCRITA ──────────────────────────────────────────────────────
var writeSaveTimer = null;
var writeDirty = false;

function countWords(txt) {
  var m = (txt || '').trim().match(/\S+/g);
  return m ? m.length : 0;
}

function openWriting() {
  if (!currentChapter) { alert('Selecione um capítulo primeiro.'); return; }
  var wm = document.getElementById('write-mode');
  var ta = document.getElementById('write-area');
  var lbl = currentChapter.chapter_label || ('Cap. ' + currentChapter.chapter_number);
  setEl('write-title', lbl + ' — ' + currentChapter.title);
  ta.value = currentChapter.content || '';
  writeDirty = false;
  updateWriteWords();
  setEl('write-save-status', '');
  wm.classList.add('on');
  ta.focus();
}

function closeWriting() {
  if (writeDirty) saveWriting();
  document.getElementById('write-mode').classList.remove('on');
}

function updateWriteWords() {
  var ta = document.getElementById('write-area');
  setEl('write-words', countWords(ta.value).toLocaleString('pt-BR') + ' palavras');
}

function onWriteInput() {
  writeDirty = true;
  updateWriteWords();
  var st = document.getElementById('write-save-status');
  if (st) { st.textContent = '· editando...'; st.style.color = 'var(--tx3)'; }
  clearTimeout(writeSaveTimer);
  writeSaveTimer = setTimeout(saveWriting, 2500);
}

function saveWriting() {
  if (!currentChapter) return;
  clearTimeout(writeSaveTimer);
  var ta = document.getElementById('write-area');
  var st = document.getElementById('write-save-status');
  var content = ta.value;
  var words = countWords(content);

  if (st) { st.textContent = '· salvando...'; st.style.color = 'var(--tx3)'; }

  sbPatch('chapters', 'id=eq.' + currentChapter.id, {
    content: content,
    word_count: words,
    updated_at: new Date().toISOString()
  })
  .then(function() {
    writeDirty = false;
    currentChapter.content = content;
    currentChapter.word_count = words;
    if (st) { st.textContent = '✓ salvo'; st.style.color = 'var(--ac)'; }
    setEl('ch-words-disp', words.toLocaleString('pt-BR') + ' palavras');
  })
  .catch(function(e) {
    if (st) { st.textContent = '✗ erro: ' + e.message; st.style.color = '#C62828'; }
  });
}

function updateChapterStatus() {
  if (!currentChapter) return;
  var sel = document.getElementById('ch-status-sel');
  if (!sel) return;
  currentChapter.status = sel.value;
  scheduleChapterSave();
}

function scheduleChapterSave() {
  clearTimeout(chSaveTimer);
  chSaveTimer = setTimeout(saveChapterMeta, 2000);
}

function saveChapterMeta() {
  if (!currentChapter) return;
  clearTimeout(chSaveTimer);

  var sel     = document.getElementById('ch-status-sel');
  var syn     = document.getElementById('ch-synopsis');
  var not     = document.getElementById('ch-notes');
  var status  = document.getElementById('ch-save-status');

  var body = {
    status:     sel ? sel.value : currentChapter.status,
    synopsis:   syn ? syn.value : '',
    notes:      not ? not.value : '',
    updated_at: new Date().toISOString()
  };

  if (status) { status.textContent = 'Salvando...'; status.style.color = 'var(--tx3)'; }

  sbPatch('chapters', 'id=eq.' + currentChapter.id, body)
  .then(function() {
    Object.assign(currentChapter, body);
    var st = statusInfo(body.status);
    var bd = document.getElementById('ebdg');
    if (bd) { bd.textContent = st.label; bd.className = 'ck ' + st.cls; }
    setEl('ch-status-disp', st.label);
    if (status) { status.textContent = '✓ Salvo'; status.style.color = 'var(--ac)'; }
    setTimeout(function(){ if (status) status.textContent = ''; }, 3000);
  })
  .catch(function(e) {
    if (status) { status.textContent = '✗ Erro: ' + e.message; status.style.color = '#C62828'; }
  });
}

// ─── IDEIAS ─────────────────────────────────────────────────────────────────
function loadIdeas() {
  sbFetch('ideas?project_id=eq.' + PID + '&is_archived=eq.false&order=sort_order.asc')
    .then(function(rows) {
      if (!rows) return;
      var list = document.getElementById('il');
      if (!list) return;
      list.innerHTML = '';
      rows.forEach(function(idea) {
        var d = document.createElement('div'); d.className='ii';
        var em = document.createElement('div'); em.style.cssText='font-size:16px;flex-shrink:0'; em.textContent=idea.emoji||'💡';
        var bd = document.createElement('div');
        var t = document.createElement('div'); t.className='it'; t.textContent=idea.content;
        var m = document.createElement('div'); m.className='im'; m.textContent=(idea.category||'Trama');
        bd.appendChild(t); bd.appendChild(m); d.appendChild(em); d.appendChild(bd);
        list.appendChild(d);
      });
    })
    .catch(function(e){ console.error('ideas error', e); });
}

function addI() {
  var inp = document.getElementById('ii');
  if (!inp || !inp.value.trim()) return;
  var txt = inp.value.trim();
  var cat = IDEA_CATEGORIES[Math.floor(Math.random()*IDEA_CATEGORIES.length)];
  var emoji = IDEA_EMOJIS[Math.floor(Math.random()*IDEA_EMOJIS.length)];
  inp.value = '';

  sbPost('ideas', { project_id: PID, content: txt, category: cat, emoji: emoji })
    .then(function() { loadIdeas(); })
    .catch(function(e){ console.error('insert idea error', e); });
}

// ─── PERSONAGENS ────────────────────────────────────────────────────────────
function loadCharacters() {
  return sbFetch('characters?project_id=eq.' + PID + '&order=sort_order.asc')
    .then(function(rows) {
      if (!rows) return;
      allChars = rows;
      renderCharList(rows);
      setEl('nb-pers', rows.length);
      var sub = document.getElementById('pers-sub');
      if (sub) sub.textContent = rows.length + ' personagens em 2030';
      renderDashboardChars();
    })
    .catch(function(e) { console.error('chars error', e); allChars = CHAR_FALLBACK; renderCharList(CHAR_FALLBACK); });
}

function renderCharList(chars) {
  var container = document.getElementById('char-cards');
  if (!container) return;
  container.innerHTML = '';
  chars.forEach(function(ch) {
    var item = document.createElement('div');
    item.className = 'char-list-item';
    item.id = 'char-item-' + ch.id;
    var initials = ch.initials || (ch.name || '?').split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
    var color = ch.avatar_color || CHAR_COLORS[0];
    item.innerHTML =
      '<div style="width:38px;height:38px;border-radius:50%;background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">' + initials + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (ch.name||'') + '</div>' +
        '<div style="font-size:11px;color:var(--tx3)">' + (ch.role||'') + '</div>' +
      '</div>';
    (function(c) { item.onclick = function() { openCharEditor(c); }; })(ch);
    container.appendChild(item);
  });
}

function openCharEditor(ch) {
  currentCharId = ch.id;
  document.querySelectorAll('.char-list-item').forEach(function(i){ i.classList.remove('on'); });
  var item = document.getElementById('char-item-' + ch.id);
  if (item) item.classList.add('on');

  document.getElementById('char-empty').style.display = 'none';
  document.getElementById('char-editor').style.display = 'block';

  var initials = ch.initials || (ch.name||'?').split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
  var color = ch.avatar_color || CHAR_COLORS[0];

  var av = document.getElementById('ce-avatar');
  av.textContent = initials;
  av.style.background = color;

  document.getElementById('ce-name').value        = ch.name         || '';
  document.getElementById('ce-role').value        = ch.role         || '';
  document.getElementById('ce-status').value      = ch.status       || 'alive';
  document.getElementById('ce-age').value         = ch.age          || '';
  document.getElementById('ce-nationality').value = ch.nationality  || '';
  document.getElementById('ce-occupation').value  = ch.occupation   || '';
  document.getElementById('ce-physical').value    = ch.physical_desc|| '';
  document.getElementById('ce-desc').value        = ch.description  || '';
  document.getElementById('ce-personality').value = ch.personality  || '';
  document.getElementById('ce-goals').value       = ch.goals        || '';
  document.getElementById('ce-fears').value       = ch.fears        || '';
  document.getElementById('ce-virtues').value     = ch.virtues      || '';
  document.getElementById('ce-flaws').value       = ch.flaws        || '';
  document.getElementById('ce-arc').value         = ch.arc_notes    || '';

  document.getElementById('ce-save-status').textContent = '';

  document.getElementById('ce-name').oninput = function() {
    var words = this.value.trim().split(' ');
    var ini = words.map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();
    document.getElementById('ce-avatar').textContent = ini || '?';
  };
}

function saveChar() {
  if (!currentCharId) return;
  var btn = document.getElementById('ce-save-btn');
  var status = document.getElementById('ce-save-status');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  var body = {
    name:          document.getElementById('ce-name').value.trim(),
    role:          document.getElementById('ce-role').value.trim(),
    status:        document.getElementById('ce-status').value,
    age:           parseInt(document.getElementById('ce-age').value) || null,
    nationality:   document.getElementById('ce-nationality').value.trim(),
    occupation:    document.getElementById('ce-occupation').value.trim(),
    physical_desc: document.getElementById('ce-physical').value.trim(),
    description:   document.getElementById('ce-desc').value.trim(),
    personality:   document.getElementById('ce-personality').value.trim(),
    goals:         document.getElementById('ce-goals').value.trim(),
    fears:         document.getElementById('ce-fears').value.trim(),
    virtues:       document.getElementById('ce-virtues').value.trim(),
    flaws:         document.getElementById('ce-flaws').value.trim(),
    arc_notes:     document.getElementById('ce-arc').value.trim(),
    updated_at:    new Date().toISOString()
  };

  sbPatch('characters', 'id=eq.' + currentCharId, body)
  .then(function() {
    status.textContent = '✓ Salvo';
    status.style.color = 'var(--ac)';
    btn.textContent = 'Salvar alterações';
    btn.disabled = false;
    var idx = allChars.findIndex(function(c){ return c.id === currentCharId; });
    if (idx >= 0) { Object.assign(allChars[idx], body); renderCharList(allChars); document.getElementById('char-item-'+currentCharId).classList.add('on'); }
    setTimeout(function(){ status.textContent = ''; }, 3000);
  })
  .catch(function(e) {
    status.textContent = '✗ Erro ao salvar';
    status.style.color = '#C62828';
    btn.textContent = 'Salvar alterações';
    btn.disabled = false;
    console.error(e);
  });
}

function newChar() {
  var body = {
    project_id:   PID,
    name:         'Novo Personagem',
    role:         '',
    status:       'alive',
    avatar_color: CHAR_COLORS[Math.floor(Math.random()*CHAR_COLORS.length)],
    sort_order:   allChars.length + 1
  };

  sbPost('characters', body)
  .then(function(rows) {
    if (rows && rows[0]) {
      allChars.push(rows[0]);
      renderCharList(allChars);
      openCharEditor(rows[0]);
    }
  })
  .catch(function(e){ console.error(e); });
}

function deleteChar() {
  if (!currentCharId) return;
  if (!confirm('Excluir este personagem permanentemente?')) return;

  sbDelete('characters', currentCharId)
  .then(function() {
    allChars = allChars.filter(function(c){ return c.id !== currentCharId; });
    currentCharId = null;
    renderCharList(allChars);
    document.getElementById('char-editor').style.display = 'none';
    document.getElementById('char-empty').style.display = 'flex';
  })
  .catch(function(e){ console.error(e); });
}

function closeCharEditor() {
  document.getElementById('char-editor').style.display = 'none';
  document.getElementById('char-empty').style.display = 'flex';
  document.querySelectorAll('.char-list-item').forEach(function(i){ i.classList.remove('on'); });
  currentCharId = null;
}

// ─── LOCAIS ─────────────────────────────────────────────────────────────────
function loadLocations() {
  return sbFetch('locations?project_id=eq.' + PID + '&order=sort_order.asc')
    .then(function(rows) {
      if (!rows) return;
      allLocations = rows;
      renderLocaList(rows);
      setEl('nb-loca', rows.length);
      var sub = document.getElementById('loca-sub');
      if (sub) sub.textContent = rows.length + ' locais em 2030';
      renderDashboardLocations();
    })
    .catch(function(e){ console.error('locations error', e); });
}

function renderLocaList(locs) {
  var container = document.getElementById('loca-cards');
  if (!container) return;
  container.innerHTML = '';
  locs.forEach(function(loc) {
    var item = document.createElement('div');
    item.className = 'char-list-item';
    item.id = 'loca-item-' + loc.id;
    item.innerHTML =
      '<div style="width:38px;height:38px;border-radius:8px;background:' + (loc.thumb_gradient||'var(--sur2)') + ';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">' + (loc.thumb_emoji||'🌍') + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (loc.name||'') + '</div>' +
      '</div>';
    (function(l) { item.onclick = function() { openLocationEditor(l); }; })(loc);
    container.appendChild(item);
  });
}

function openLocationEditor(loc) {
  currentLocationId = loc.id;
  document.querySelectorAll('#loca-cards .char-list-item').forEach(function(i){ i.classList.remove('on'); });
  var item = document.getElementById('loca-item-' + loc.id);
  if (item) item.classList.add('on');

  document.getElementById('loca-empty').style.display = 'none';
  document.getElementById('loca-editor').style.display = 'block';

  document.getElementById('lo-emoji').value = loc.thumb_emoji || '🌍';
  document.getElementById('lo-name').value  = loc.name || '';
  document.getElementById('lo-desc').value  = loc.description || '';
  document.getElementById('lo-notes').value = loc.notes || '';
  document.getElementById('lo-save-status').textContent = '';
}

function newLocation() {
  var body = {
    project_id: PID,
    name: 'Novo local',
    thumb_emoji: '🌍',
    sort_order: allLocations.length + 1
  };
  sbPost('locations', body)
  .then(function(rows) {
    if (rows && rows[0]) {
      allLocations.push(rows[0]);
      renderLocaList(allLocations);
      openLocationEditor(rows[0]);
    }
  })
  .catch(function(e){ console.error(e); });
}

function saveLocation() {
  if (!currentLocationId) return;
  var status = document.getElementById('lo-save-status');
  var body = {
    name:        document.getElementById('lo-name').value.trim(),
    thumb_emoji: document.getElementById('lo-emoji').value.trim() || '🌍',
    description: document.getElementById('lo-desc').value.trim(),
    notes:       document.getElementById('lo-notes').value.trim(),
    updated_at:  new Date().toISOString()
  };
  status.textContent = 'Salvando...'; status.style.color = 'var(--tx3)';

  sbPatch('locations', 'id=eq.' + currentLocationId, body)
  .then(function() {
    status.textContent = '✓ Salvo'; status.style.color = 'var(--ac)';
    var idx = allLocations.findIndex(function(l){ return l.id === currentLocationId; });
    if (idx >= 0) { Object.assign(allLocations[idx], body); renderLocaList(allLocations); document.getElementById('loca-item-'+currentLocationId).classList.add('on'); }
    setTimeout(function(){ status.textContent = ''; }, 3000);
  })
  .catch(function(e) {
    status.textContent = '✗ Erro ao salvar'; status.style.color = '#C62828';
    console.error(e);
  });
}

function deleteLocation() {
  if (!currentLocationId) return;
  if (!confirm('Excluir este local permanentemente?')) return;

  sbDelete('locations', currentLocationId)
  .then(function() {
    allLocations = allLocations.filter(function(l){ return l.id !== currentLocationId; });
    currentLocationId = null;
    renderLocaList(allLocations);
    document.getElementById('loca-editor').style.display = 'none';
    document.getElementById('loca-empty').style.display = 'flex';
  })
  .catch(function(e){ console.error(e); });
}

// ─── LINHA DO TEMPO ─────────────────────────────────────────────────────────
function loadTimeline() {
  return sbFetch('timeline_events?project_id=eq.' + PID + '&order=sort_order.asc')
    .then(function(rows) {
      if (!rows) return;
      allTimelineEvents = rows;
      renderTimelineList(rows);
      setEl('time-count-badge', rows.length);
      renderDashboardTimeline();
    })
    .catch(function(e){ console.error('timeline error', e); });
}

function renderTimelineList(events) {
  var container = document.getElementById('time-list');
  if (!container) return;
  container.innerHTML = '';
  events.forEach(function(ev) {
    var div = document.createElement('div');
    div.className = 'cpi';
    div.id = 'time-item-' + ev.id;
    var n = document.createElement('div'); n.className='cpn'; n.textContent = ev.in_world_date || '—';
    var t = document.createElement('div'); t.className='cpt'; t.textContent = (ev.is_highlight ? '⚡ ' : '') + ev.title;
    div.appendChild(n); div.appendChild(t);
    (function(e){ div.onclick = function(){ openTimelineEditor(e); }; })(ev);
    container.appendChild(div);
  });
}

function openTimelineEditor(ev) {
  currentTimelineId = ev.id;
  document.querySelectorAll('#time-list .cpi').forEach(function(i){ i.classList.remove('on'); });
  var item = document.getElementById('time-item-' + ev.id);
  if (item) item.classList.add('on');

  document.getElementById('time-empty').style.display = 'none';
  document.getElementById('time-editor').style.display = 'flex';

  document.getElementById('te-title').value     = ev.title || '';
  document.getElementById('te-date').value      = ev.in_world_date || '';
  document.getElementById('te-desc').value      = ev.description || '';
  document.getElementById('te-highlight').value = ev.is_highlight ? 'true' : 'false';
  document.getElementById('te-future').checked  = !!ev.is_future;
  document.getElementById('te-save-status').textContent = '';
}

function newTimelineEvent() {
  var body = {
    project_id: PID,
    title: 'Novo evento',
    sort_order: allTimelineEvents.length + 1
  };
  sbPost('timeline_events', body)
  .then(function(rows) {
    if (rows && rows[0]) {
      allTimelineEvents.push(rows[0]);
      renderTimelineList(allTimelineEvents);
      setEl('time-count-badge', allTimelineEvents.length);
      openTimelineEditor(rows[0]);
    }
  })
  .catch(function(e){ console.error(e); });
}

function saveTimelineEvent() {
  if (!currentTimelineId) return;
  var status = document.getElementById('te-save-status');
  var body = {
    title:        document.getElementById('te-title').value.trim(),
    in_world_date:document.getElementById('te-date').value.trim(),
    description:  document.getElementById('te-desc').value.trim(),
    is_highlight: document.getElementById('te-highlight').value === 'true',
    is_future:    document.getElementById('te-future').checked,
    updated_at:   new Date().toISOString()
  };
  status.textContent = 'Salvando...'; status.style.color = 'var(--tx3)';

  sbPatch('timeline_events', 'id=eq.' + currentTimelineId, body)
  .then(function() {
    status.textContent = '✓ Salvo'; status.style.color = 'var(--ac)';
    var idx = allTimelineEvents.findIndex(function(e){ return e.id === currentTimelineId; });
    if (idx >= 0) { Object.assign(allTimelineEvents[idx], body); renderTimelineList(allTimelineEvents); document.getElementById('time-item-'+currentTimelineId).classList.add('on'); }
    setTimeout(function(){ status.textContent = ''; }, 3000);
  })
  .catch(function(e) {
    status.textContent = '✗ Erro ao salvar'; status.style.color = '#C62828';
    console.error(e);
  });
}

function deleteTimelineEvent() {
  if (!currentTimelineId) return;
  if (!confirm('Excluir este evento permanentemente?')) return;

  sbDelete('timeline_events', currentTimelineId)
  .then(function() {
    allTimelineEvents = allTimelineEvents.filter(function(e){ return e.id !== currentTimelineId; });
    currentTimelineId = null;
    renderTimelineList(allTimelineEvents);
    setEl('time-count-badge', allTimelineEvents.length);
    document.getElementById('time-editor').style.display = 'none';
    document.getElementById('time-empty').style.display = 'flex';
  })
  .catch(function(e){ console.error(e); });
}

// ─── RELAÇÕES ───────────────────────────────────────────────────────────────
function loadRelationships() {
  return sbFetch('character_relationships?project_id=eq.' + PID)
    .then(function(rows) {
      allRelationships = rows || [];
      renderRelationshipsList();
    })
    .catch(function(e){ console.error('relationships error', e); });
}

function charNameById(id) {
  var c = allChars.find(function(c){ return c.id === id; });
  return c ? c.name : '—';
}

function renderRelationshipsList() {
  var list = document.getElementById('rela-list');
  var empty = document.getElementById('rela-empty');
  if (!list) return;
  list.innerHTML = '';
  if (!allRelationships.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  var sentimentColor = { positive:'#2E7D32', negative:'#C62828', neutral:'#5C5C58', complex:'#7B1FA2' };

  allRelationships.forEach(function(rel) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:14px;background:var(--sur2);border-radius:8px;display:flex;align-items:center;gap:14px';
    row.innerHTML =
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
          '<span style="font-size:13px;font-weight:600;color:var(--tx)">' + charNameById(rel.character_a_id) + '</span>' +
          '<span style="font-size:11px;color:var(--tx3)">↔</span>' +
          '<span style="font-size:13px;font-weight:600;color:var(--tx)">' + charNameById(rel.character_b_id) + '</span>' +
          '<span class="tag" style="margin-left:6px">' + (rel.relationship_type||'') + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--tx2)">' + (rel.description||'') + '</div>' +
      '</div>' +
      '<span style="font-size:10px;font-weight:600;color:' + (sentimentColor[rel.sentiment]||'#5C5C58') + '">' + (rel.sentiment||'') + '</span>';
    var delBtn = document.createElement('button');
    delBtn.className = 'btn';
    delBtn.style.cssText = 'color:#C62828;border-color:#FCE4E4;background:#FCE4E4;flex-shrink:0';
    delBtn.textContent = 'Excluir';
    (function(id){ delBtn.onclick = function(){ deleteRelationship(id); }; })(rel.id);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function newRelationship() {
  var selA = document.getElementById('re-char-a');
  var selB = document.getElementById('re-char-b');
  var opts = allChars.map(function(c){ return '<option value="'+c.id+'">'+c.name+'</option>'; }).join('');
  selA.innerHTML = opts;
  selB.innerHTML = opts;
  document.getElementById('re-type').value = '';
  document.getElementById('re-desc').value = '';
  document.getElementById('re-strength').value = 'medium';
  document.getElementById('re-sentiment').value = 'neutral';
  document.getElementById('re-save-status').textContent = '';
  document.getElementById('rela-form').style.display = 'block';
}

function saveRelationship() {
  var status = document.getElementById('re-save-status');
  var body = {
    project_id: PID,
    character_a_id: document.getElementById('re-char-a').value,
    character_b_id: document.getElementById('re-char-b').value,
    relationship_type: document.getElementById('re-type').value.trim() || 'Conexão',
    strength: document.getElementById('re-strength').value,
    sentiment: document.getElementById('re-sentiment').value,
    description: document.getElementById('re-desc').value.trim()
  };
  if (body.character_a_id === body.character_b_id) {
    status.textContent = '✗ Escolha dois personagens diferentes'; status.style.color = '#C62828';
    return;
  }
  status.textContent = 'Salvando...'; status.style.color = 'var(--tx3)';

  sbPost('character_relationships', body)
  .then(function(rows) {
    if (rows && rows[0]) allRelationships.push(rows[0]);
    renderRelationshipsList();
    document.getElementById('rela-form').style.display = 'none';
  })
  .catch(function(e) {
    status.textContent = '✗ Erro ao salvar'; status.style.color = '#C62828';
    console.error(e);
  });
}

function deleteRelationship(id) {
  if (!confirm('Excluir esta relação permanentemente?')) return;
  sbDelete('character_relationships', id)
  .then(function() {
    allRelationships = allRelationships.filter(function(r){ return r.id !== id; });
    renderRelationshipsList();
  })
  .catch(function(e){ console.error(e); });
}

// ─── ESTATÍSTICAS ───────────────────────────────────────────────────────────
function loadStats() {
  var totalWords = allChapters.reduce(function(s,c){ return s + (c.word_count||0); }, 0);
  setEl('st-total-words', totalWords.toLocaleString('pt-BR'));
  setEl('st-total-chapters', allChapters.length);
  setEl('st-avg-words', allChapters.length ? Math.round(totalWords/allChapters.length).toLocaleString('pt-BR') : '0');
  setEl('st-total-chars', allChars.length);
  buildChart();

  sbFetch('chapter_characters?select=character_id')
    .then(function(rows) {
      var box = document.getElementById('st-char-appearances');
      var emptyBox = document.getElementById('st-char-appearances-empty');
      if (!rows || !rows.length) { box.innerHTML = ''; emptyBox.style.display = 'block'; return; }
      emptyBox.style.display = 'none';

      var counts = {};
      rows.forEach(function(r){ counts[r.character_id] = (counts[r.character_id]||0) + 1; });
      var entries = Object.keys(counts).map(function(id){
        return { id: id, name: charNameById(id), count: counts[id] };
      }).sort(function(a,b){ return b.count - a.count; });

      var max = entries.length ? entries[0].count : 1;
      box.innerHTML = '';
      entries.forEach(function(e) {
        var pct = Math.round((e.count/max)*100);
        var row = document.createElement('div');
        row.innerHTML = '<div class="pm"><span class="pn">' + e.name + '</span><span class="pp">' + e.count + ' caps.</span></div>' +
                         '<div class="pb"><div class="pf" style="width:' + pct + '%"></div></div>';
        box.appendChild(row);
      });
    })
    .catch(function(e){ console.error('chapter_characters error', e); });
}

function buildChart() {
  var c = document.getElementById('bc');
  if (!c) return;
  c.innerHTML = '';
  if (!allChapters.length) return;
  var max = Math.max.apply(null, allChapters.map(function(ch) { return ch.word_count||0; }));
  allChapters.forEach(function(ch, i) {
    var col = document.createElement('div'); col.className='bcl';
    var f = document.createElement('div'); f.className='bcf';
    f.style.height = max ? Math.round(((ch.word_count||0)/max)*88)+'px' : '3px';
    f.title = ch.title+': '+(ch.word_count||0).toLocaleString('pt-BR')+' palavras';
    var l = document.createElement('div'); l.className='bcb'; l.textContent = ch.chapter_number != null ? String(ch.chapter_number) : String(i);
    col.appendChild(f); col.appendChild(l); c.appendChild(col);
  });
}

// ─── DASHBOARD (auxiliares) ─────────────────────────────────────────────────
function renderDashboardChars() {
  var box = document.getElementById('dash-active-chars');
  var sample = document.getElementById('dash-chars-sample');
  document.querySelectorAll('.stat-total-chars').forEach(function(el){ el.textContent = allChars.length; });
  if (sample) sample.textContent = allChars.slice(0,4).map(function(c){ return c.name; }).join(', ') || '—';
  if (!box) return;
  box.innerHTML = '';
  allChars.slice(0,3).forEach(function(ch) {
    var initials = ch.initials || (ch.name || '?').split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
    var div = document.createElement('div'); div.className = 'cmw';
    div.onclick = function(){ go('pers',document.querySelectorAll('.ni')[1]); };
    div.innerHTML = '<div class="cm2" style="background:' + (ch.avatar_color||CHAR_COLORS[0]) + '">' + initials + '</div>' +
                     '<div class="cmn">' + (ch.name||'') + '</div><div class="cmr">' + (ch.role||'') + '</div>';
    box.appendChild(div);
  });
}

function renderDashboardLocations() {
  var box = document.getElementById('dash-locations');
  if (!box) return;
  if (!allLocations.length) { box.innerHTML = '<div style="font-size:12px;color:var(--tx3)">Nenhum local cadastrado.</div>'; return; }
  box.innerHTML = '';
  allLocations.slice(0,3).forEach(function(loc) {
    var div = document.createElement('div'); div.className = 'tli';
    div.innerHTML = '<div class="tld"></div><div class="tldt">' + (loc.thumb_emoji||'🌍') + ' ' + (loc.name||'') + '</div><div class="tltl" style="font-size:12px;font-weight:400;color:var(--tx2)">' + (loc.description||'') + '</div>';
    box.appendChild(div);
  });
}

function renderDashboardTimeline() {
  var box = document.getElementById('dash-next-events');
  if (!box) return;
  var upcoming = allTimelineEvents.filter(function(e){ return e.is_future; });
  var show = upcoming.length ? upcoming : allTimelineEvents.slice(-2);
  if (!show.length) { box.innerHTML = '<div style="font-size:12px;color:var(--tx3)">Nenhum evento cadastrado.</div>'; return; }
  box.innerHTML = '';
  show.slice(0,3).forEach(function(ev) {
    var div = document.createElement('div'); div.className = 'tli';
    div.innerHTML = '<div class="tld' + (ev.is_future?' s':'') + '"></div><div class="tldt">' + (ev.in_world_date||'') + '</div><div class="tltl">' + (ev.title||'') + '</div>';
    box.appendChild(div);
  });
}

// ─── NAVEGAÇÃO ──────────────────────────────────────────────────────────────
var timelineLoaded = false;
var locationsLoaded = false;
var relationshipsLoaded = false;

function go(name, el) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('on'); });
  var t = document.getElementById('v-' + name);
  if (t) t.classList.add('on');
  document.querySelectorAll('.ni').forEach(function(i) { i.classList.remove('on'); });
  if (el) el.classList.add('on');

  if (name === 'stat') loadStats();
  if (name === 'time' && !timelineLoaded) { timelineLoaded = true; loadTimeline(); }
  if (name === 'loca' && !locationsLoaded) { locationsLoaded = true; loadLocations(); }
  if (name === 'rela' && !relationshipsLoaded) { relationshipsLoaded = true; loadRelationships(); }
}

// ─── MODO ESCURO ────────────────────────────────────────────────────────────
var dk = localStorage.getItem('dk') === '1';
if (dk) { document.body.setAttribute('data-dark',''); }
function dark() {
  dk = !dk;
  dk ? document.body.setAttribute('data-dark','') : document.body.removeAttribute('data-dark');
  var btn = document.getElementById('tbtn');
  if (btn) btn.textContent = dk ? '☀️' : '🌙';
  localStorage.setItem('dk', dk ? '1' : '0');
}

document.addEventListener('DOMContentLoaded', function() {
  var d = new Date();
  var el = document.getElementById('ds-date');
  if (el) el.textContent = d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})+' · Júlia Witts';
  var btn = document.getElementById('tbtn');
  if (btn) btn.textContent = dk ? '☀️' : '🌙';

  loadChapters();
  loadIdeas();
  loadCharacters().then(function(){ loadLocations(); loadTimeline(); locationsLoaded = true; timelineLoaded = true; });
});
