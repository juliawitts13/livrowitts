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
      renderWordGoal();
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

  var edited  = ch.updated_at ? new Date(ch.updated_at).toLocaleDateString('pt-BR', {day:'2-digit',month:'short',year:'numeric'}) : '—';

  renderChapterStats(ch);
  setEl('ch-status-disp', st.label);
  setEl('ch-edited-disp', edited);
  loadSuggestions(ch.id);

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

var FALA_COLORS = ['#3E8E5A','#F4A93C','#14524A','#C2703D','#4A90A4','#7FB069','#9C5FA0','#B03A5B'];

function falaColor(charId) {
  var idx = allChars.findIndex(function(c){ return String(c.id) === String(charId); });
  return FALA_COLORS[(idx >= 0 ? idx : 0) % FALA_COLORS.length];
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fillMarkEntities() {
  var type = (document.getElementById('mark-type-sel') || {}).value || 'fala';
  var sel = document.getElementById('mark-entity-sel');
  if (!sel) return;
  var opts = '';
  if (type === 'fala' || type === 'pers') {
    opts = allChars.map(function(c) {
      return '<option value="' + c.id + '">' + escHtml(c.name) + '</option>';
    }).join('');
    if (type === 'pers') opts += '<option value="__new__">+ Criar personagem com o texto selecionado</option>';
    if (!opts) opts = '<option value="">Nenhum personagem</option>';
  } else if (type === 'local') {
    opts = allLocations.map(function(l) {
      return '<option value="' + l.id + '">' + escHtml(l.name) + '</option>';
    }).join('') + '<option value="__new__">+ Criar local com o texto selecionado</option>';
  } else { // evento
    opts = '<option value="__evento__">Criar evento com o texto selecionado</option>';
  }
  sel.innerHTML = opts;
}

function openWriting() {
  if (!currentChapter) { alert('Selecione um capítulo primeiro.'); return; }
  var wm = document.getElementById('write-mode');
  var ta = document.getElementById('write-area');
  var lbl = currentChapter.chapter_label || ('Cap. ' + currentChapter.chapter_number);
  setEl('write-title', lbl + ' — ' + currentChapter.title);
  setEl('write-page-title', currentChapter.title || lbl);

  var content = currentChapter.content || '';
  if (/<(span|div|br|p|h1|h2|h3|blockquote|ul|ol)\b/i.test(content)) {
    ta.innerHTML = content;
  } else {
    ta.innerHTML = escHtml(content).replace(/\n/g, '<br>');
  }

  if (allChars.length) fillMarkEntities();
  else loadCharacters().then(fillMarkEntities);

  // Papel do usuário atual: revisora não edita, só sugere
  var isReviewer = currentMemberRole() === 'revisor';
  ta.contentEditable = isReviewer ? 'false' : 'true';
  document.getElementById('write-fmtbar').style.display   = isReviewer ? 'none' : 'flex';
  document.getElementById('write-markbar').style.display  = isReviewer ? 'none' : 'flex';
  document.getElementById('write-suggestbar').style.display = isReviewer ? 'flex' : 'none';

  loadComments(currentChapter.id);
  var panel = document.getElementById('cmt-panel');
  panel.classList.toggle('closed', localStorage.getItem('sos_cmt_closed') === '1');
  document.getElementById('cmt-toggle-btn').textContent = panel.classList.contains('closed') ? '«' : '»';

  writeDirty = false;
  updateWriteWords();
  setEl('write-save-status', '');
  setEl('fala-hint', '');
  wm.classList.add('on');
  if (!isReviewer) ta.focus();
}

// ─── FORMATAÇÃO ─────────────────────────────────────────────────────────────
function fmt(cmd) {
  document.getElementById('write-area').focus();
  document.execCommand(cmd, false, null);
  onWriteInput();
}

function fmtBlock(v) {
  document.getElementById('write-area').focus();
  document.execCommand('formatBlock', false, v === 'p' ? 'div' : v);
  onWriteInput();
}

function getEditorSelection(hint) {
  var ta = document.getElementById('write-area');
  var s = window.getSelection();
  if (!s.rangeCount || s.isCollapsed) { hint.textContent = 'Selecione um trecho do texto primeiro.'; return null; }
  var range = s.getRangeAt(0);
  if (!ta.contains(range.commonAncestorContainer)) { hint.textContent = 'A seleção precisa estar dentro do texto.'; return null; }
  return { sel: s, range: range };
}

function wrapRange(range, span, hint) {
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
    return true;
  } catch (e) {
    hint.textContent = 'Não foi possível marcar essa seleção (evite selecionar através de parágrafos).';
    return false;
  }
}

function flashHint(hint, msg) {
  hint.textContent = msg;
  setTimeout(function(){ if (hint.textContent === msg) hint.textContent = ''; }, 4000);
}

function markSelection() {
  var hint = document.getElementById('fala-hint');
  var type = document.getElementById('mark-type-sel').value;
  var entityId = (document.getElementById('mark-entity-sel') || {}).value || '';

  var es = getEditorSelection(hint);
  if (!es) return;
  var selText = es.range.toString().trim();

  if (type === 'fala') {
    if (!entityId) { hint.textContent = 'Cadastre um personagem primeiro.'; return; }
    var ch = allChars.find(function(c){ return String(c.id) === String(entityId); });
    var span = document.createElement('span');
    span.className = 'fala';
    span.setAttribute('data-char-id', entityId);
    span.setAttribute('title', 'Fala: ' + (ch ? ch.name : ''));
    span.style.setProperty('--fc', falaColor(entityId));
    if (!wrapRange(es.range, span, hint)) return;
    es.sel.removeAllRanges();
    flashHint(hint, '✓ Fala de ' + (ch ? ch.name : '') + ' marcada');
    onWriteInput();
    return;
  }

  if (type === 'pers') {
    var doWrap = function(id, name) {
      var span = document.createElement('span');
      span.className = 'mk-pers';
      span.setAttribute('data-char-id', id);
      span.setAttribute('title', 'Personagem: ' + name);
      if (!wrapRange(es.range, span, hint)) return;
      es.sel.removeAllRanges();
      linkChapterCharacter(id);
      flashHint(hint, '✓ ' + name + ' vinculado ao capítulo');
      onWriteInput();
    };
    if (entityId === '__new__') {
      if (!selText) { hint.textContent = 'Selecione o nome do personagem no texto.'; return; }
      hint.textContent = 'Criando personagem...';
      sbPost('characters', { project_id: PID, name: selText, avatar_color: CHAR_COLORS[allChars.length % CHAR_COLORS.length], status: 'alive', sort_order: allChars.length })
        .then(function(rows) {
          var c = rows[0];
          allChars.push(c);
          renderCharList(allChars);
          setEl('nb-pers', allChars.length);
          fillMarkEntities();
          doWrap(c.id, c.name);
        })
        .catch(function(e){ hint.textContent = 'Erro ao criar personagem: ' + e.message; });
    } else {
      var c2 = allChars.find(function(c){ return String(c.id) === String(entityId); });
      if (!c2) { hint.textContent = 'Escolha um personagem.'; return; }
      doWrap(c2.id, c2.name);
    }
    return;
  }

  if (type === 'local') {
    var doWrapLoc = function(id, name) {
      var span = document.createElement('span');
      span.className = 'mk-local';
      span.setAttribute('data-loc-id', id);
      span.setAttribute('title', 'Local: ' + name);
      if (!wrapRange(es.range, span, hint)) return;
      es.sel.removeAllRanges();
      flashHint(hint, '✓ Local ' + name + ' marcado');
      onWriteInput();
    };
    if (entityId === '__new__') {
      if (!selText) { hint.textContent = 'Selecione o nome do local no texto.'; return; }
      hint.textContent = 'Criando local...';
      sbPost('locations', { project_id: PID, name: selText, thumb_emoji: '📍', thumb_gradient: 'linear-gradient(135deg,#1D7A4A,#35A96B)', sort_order: allLocations.length })
        .then(function(rows) {
          var l = rows[0];
          allLocations.push(l);
          locationsLoaded = false; // força recarregar a aba Locais na próxima visita
          fillMarkEntities();
          doWrapLoc(l.id, l.name);
        })
        .catch(function(e){ hint.textContent = 'Erro ao criar local: ' + e.message; });
    } else {
      var l2 = allLocations.find(function(l){ return String(l.id) === String(entityId); });
      if (!l2) { hint.textContent = 'Escolha um local.'; return; }
      doWrapLoc(l2.id, l2.name);
    }
    return;
  }

  // evento
  if (!selText) { hint.textContent = 'Selecione o trecho que descreve o evento.'; return; }
  var title = selText.length > 80 ? selText.slice(0, 77) + '…' : selText;
  var span2 = document.createElement('span');
  span2.className = 'mk-evento';
  span2.setAttribute('title', 'Evento: ' + title);
  if (!wrapRange(es.range, span2, hint)) return;
  es.sel.removeAllRanges();
  hint.textContent = 'Criando evento na linha do tempo...';
  var lbl = currentChapter.chapter_label || ('Cap. ' + currentChapter.chapter_number);
  sbPost('timeline_events', {
    project_id: PID,
    title: title,
    description: 'Marcado em ' + lbl + ' — ' + currentChapter.title,
    sort_order: (allTimelineEvents.length || 0) + 100,
    is_highlight: false
  })
  .then(function(rows) {
    if (rows && rows[0]) allTimelineEvents.push(rows[0]);
    timelineLoaded = false; // recarrega a aba Linha do Tempo na próxima visita
    flashHint(hint, '✓ Evento adicionado à Linha do Tempo');
  })
  .catch(function(e){ hint.textContent = 'Erro ao criar evento: ' + e.message; });
  onWriteInput();
}

function linkChapterCharacter(charId) {
  if (!currentChapter) return;
  sbFetch('chapter_characters?chapter_id=eq.' + currentChapter.id + '&character_id=eq.' + charId)
    .then(function(rows) {
      if (rows && rows.length) return;
      return sbPost('chapter_characters', { chapter_id: currentChapter.id, character_id: charId });
    })
    .catch(function(e){ console.error('link chapter_character', e); });
}

function unmarkFala() {
  var ta   = document.getElementById('write-area');
  var hint = document.getElementById('fala-hint');
  var s = window.getSelection();
  if (!s.rangeCount) { hint.textContent = 'Clique dentro de uma fala marcada.'; return; }

  var node = s.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType === 3) node = node.parentNode;
  var span = node.closest ? node.closest('.fala,.mk-pers,.mk-local,.mk-evento') : null;
  if (!span || !ta.contains(span)) {
    // também remove todas as falas dentro da seleção, se houver
    var range = s.getRangeAt(0);
    var removed = 0;
    ta.querySelectorAll('.fala,.mk-pers,.mk-local,.mk-evento').forEach(function(f) {
      if (range.intersectsNode(f)) { unwrapNode(f); removed++; }
    });
    hint.textContent = removed ? '✓ Marcação removida' : 'Clique dentro de uma fala marcada.';
    if (removed) onWriteInput();
    return;
  }
  unwrapNode(span);
  hint.textContent = '✓ Marcação removida';
  onWriteInput();
}

function unwrapNode(el) {
  var parent = el.parentNode;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function closeWriting() {
  if (writeDirty) saveWriting();
  document.getElementById('write-mode').classList.remove('on');
}

function updateWriteWords() {
  var ta = document.getElementById('write-area');
  setEl('write-words', countWords(ta.innerText).toLocaleString('pt-BR') + ' palavras');
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
  var content = ta.innerHTML;
  var words = countWords(ta.innerText);

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
    renderChapterStats(currentChapter);
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
    var thumb = (loc.photos && loc.photos.length)
      ? '<img class="loc-thumb-img" src="' + loc.photos[0] + '" loading="lazy"/>'
      : '<div style="width:38px;height:38px;border-radius:8px;background:' + (loc.thumb_gradient||'var(--sur2)') + ';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">' + (loc.thumb_emoji||'🌍') + '</div>';
    item.innerHTML = thumb +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (loc.name||'') + '</div>' +
        (loc.photos && loc.photos.length ? '<div style="font-size:10px;color:var(--tx3)">📷 ' + loc.photos.length + (loc.photos.length===1?' foto':' fotos') + '</div>' : '') +
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
  document.getElementById('lo-photo-status').textContent = '';
  renderPhotoGrid('lo-photos', 'locations');
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
  var sorted = events.slice().sort(function(a,b){ return (a.sort_order||0) - (b.sort_order||0); });
  var emptyState = document.getElementById('time-empty-state');
  if (emptyState) emptyState.style.display = sorted.length ? 'none' : 'block';
  container.innerHTML = '';

  sorted.forEach(function(ev, i) {
    var div = document.createElement('div');
    div.className = 'tle' + (ev.is_highlight ? ' hl' : '') + (ev.is_future ? ' fut' : '');
    div.id = 'time-item-' + ev.id;

    var thumb = (ev.photos && ev.photos.length)
      ? '<div class="tle-thumb"><img src="' + String(ev.photos[0]).replace(/"/g,'&quot;') + '" loading="lazy" title="Clique para ampliar"/>' +
        (ev.photos.length > 1 ? '<span class="more">+' + (ev.photos.length - 1) + '</span>' : '') + '</div>'
      : '';

    div.innerHTML =
      '<div class="tle-dot"></div>' +
      '<div class="tle-card" title="Clique para editar">' +
        thumb +
        '<div class="tle-body">' +
          '<div class="tle-date"><span>' + (ev.is_highlight ? '⚡ ' : '') + escHtml(ev.in_world_date || 'sem data') + '</span><span class="tle-ord">#' + (i+1) + '</span></div>' +
          '<div class="tle-title">' + escHtml(ev.title || '') + '</div>' +
          (ev.description ? '<div class="tle-desc">' + escHtml(ev.description) + '</div>' : '') +
        '</div>' +
        '<div class="tle-actions">' +
          '<button class="tle-mv" data-dir="-1" title="Mover para cima">↑</button>' +
          '<button class="tle-mv" data-dir="1" title="Mover para baixo">↓</button>' +
        '</div>' +
      '</div>';

    var thumbImg = div.querySelector('.tle-thumb img');
    if (thumbImg) thumbImg.addEventListener('click', function(evt) {
      evt.stopPropagation();
      openLightbox(ev.photos[0]);
    });

    (function(e, idx) {
      div.querySelector('.tle-card').addEventListener('click', function(evt) {
        if (evt.target.closest('.tle-mv')) return;
        openTimelineEditor(e);
      });
      div.querySelectorAll('.tle-mv').forEach(function(btn) {
        btn.addEventListener('click', function(evt) {
          evt.stopPropagation();
          moveTimelineEvent(e, parseInt(btn.dataset.dir), sorted, idx);
        });
      });
    })(ev, i);

    container.appendChild(div);
  });
}

function moveTimelineEvent(ev, dir, sorted, idx) {
  var target = sorted[idx + dir];
  if (!target) return;
  var a = ev.sort_order || 0, b = target.sort_order || 0;
  if (a === b) { b = a; a = a + dir; } // desempata se ordens iguais
  else { var tmp = a; a = b; b = tmp; }
  Promise.all([
    sbPatch('timeline_events', 'id=eq.' + ev.id,     { sort_order: a }),
    sbPatch('timeline_events', 'id=eq.' + target.id, { sort_order: b })
  ]).then(function() {
    ev.sort_order = a; target.sort_order = b;
    renderTimelineList(allTimelineEvents);
    renderDashboardTimeline();
  }).catch(function(e){ alert('Erro ao reordenar: ' + e.message); });
}

function openTimelineEditor(ev) {
  currentTimelineId = ev.id;
  document.getElementById('te-title').value     = ev.title || '';
  document.getElementById('te-date').value      = ev.in_world_date || '';
  document.getElementById('te-order').value     = ev.sort_order || 1;
  document.getElementById('te-desc').value      = ev.description || '';
  document.getElementById('te-highlight').value = ev.is_highlight ? 'true' : 'false';
  document.getElementById('te-future').checked  = !!ev.is_future;
  document.getElementById('te-save-status').textContent = '';
  document.getElementById('te-photo-status').textContent = '';
  renderPhotoGrid('te-photos', 'timeline_events');
  document.getElementById('te-modal').classList.add('open');
}

function closeTimelineEditor() {
  document.getElementById('te-modal').classList.remove('open');
  currentTimelineId = null;
}

function newTimelineEvent() {
  var maxOrd = allTimelineEvents.reduce(function(m,e){ return Math.max(m, e.sort_order||0); }, 0);
  var body = {
    project_id: PID,
    title: 'Novo evento',
    sort_order: maxOrd + 1
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
    sort_order:   parseInt(document.getElementById('te-order').value) || 1,
    description:  document.getElementById('te-desc').value.trim(),
    is_highlight: document.getElementById('te-highlight').value === 'true',
    is_future:    document.getElementById('te-future').checked,
    updated_at:   new Date().toISOString()
  };
  status.textContent = 'Salvando...'; status.style.color = 'var(--tx3)';

  sbPatch('timeline_events', 'id=eq.' + currentTimelineId, body)
  .then(function() {
    var idx = allTimelineEvents.findIndex(function(e){ return e.id === currentTimelineId; });
    if (idx >= 0) Object.assign(allTimelineEvents[idx], body);
    renderTimelineList(allTimelineEvents);
    renderDashboardTimeline();
    closeTimelineEditor();
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
    closeTimelineEditor();
    renderTimelineList(allTimelineEvents);
    setEl('time-count-badge', allTimelineEvents.length);
    renderDashboardTimeline();
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

  loadDialogueStats();
}

function loadDialogueStats() {
  var box = document.getElementById('st-dialogues');
  var emptyBox = document.getElementById('st-dialogues-empty');
  if (!box) return;

  var run = function() {
    var stats = {}; // charId -> { falas, words }
    var tmp = document.createElement('div');
    allChapters.forEach(function(ch) {
      if (!ch.content || ch.content.indexOf('class="fala"') === -1) return;
      tmp.innerHTML = ch.content;
      tmp.querySelectorAll('.fala[data-char-id]').forEach(function(f) {
        var id = f.getAttribute('data-char-id');
        if (!stats[id]) stats[id] = { falas: 0, words: 0 };
        stats[id].falas++;
        stats[id].words += countWords(f.textContent);
      });
    });
    tmp.innerHTML = '';

    var entries = Object.keys(stats).map(function(id) {
      return { id: id, name: charNameById(id), falas: stats[id].falas, words: stats[id].words, color: falaColor(id) };
    }).sort(function(a,b){ return b.words - a.words; });

    if (!entries.length) { box.innerHTML = ''; emptyBox.style.display = 'block'; return; }
    emptyBox.style.display = 'none';

    var max = entries[0].words || 1;
    box.innerHTML = '';
    entries.forEach(function(e) {
      var pct = Math.max(4, Math.round((e.words/max)*100));
      var row = document.createElement('div');
      row.innerHTML = '<div class="pm"><span class="pn">' + escHtml(e.name) + '</span><span class="pp">' +
                       e.falas + ' falas · ' + e.words.toLocaleString('pt-BR') + ' palavras</span></div>' +
                       '<div class="pb"><div class="pf" style="width:' + pct + '%;background:' + e.color + '"></div></div>';
      box.appendChild(row);
    });
  };

  if (allChars.length) run();
  else loadCharacters().then(run);
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

// ─── PROGRESSO DA OBRA (meta de palavras) ───────────────────────────────────
var projectMeta = null;

function loadProjectMeta() {
  return sbFetch('projects?id=eq.' + PID + '&select=target_word_count,total_chapters_planned')
    .then(function(rows) {
      projectMeta = (rows && rows[0]) || {};
      renderWordGoal();
    })
    .catch(function(e){ console.error('project meta', e); });
}

function renderWordGoal() {
  var bar = document.getElementById('goal-bar');
  if (!bar) return;

  var total = allChapters.reduce(function(s,c){ return s + (c.word_count||0); }, 0);
  var goal  = (projectMeta && projectMeta.target_word_count) || 0;

  if (!goal) {
    setEl('goal-pct', '—');
    bar.style.width = '0%';
    setEl('goal-detail', 'Nenhuma meta definida. Clique em "Editar meta" para escolher quantas palavras o livro deve ter.');
    setEl('goal-chapters', '');
    return;
  }

  var pct = Math.min(100, Math.round((total / goal) * 100));
  setEl('goal-pct', pct + '%');
  bar.style.width = pct + '%';
  setEl('goal-label', 'Meta de ' + goal.toLocaleString('pt-BR') + ' palavras');

  var falta = Math.max(0, goal - total);
  setEl('goal-detail', total.toLocaleString('pt-BR') + ' escritas · ' +
    (falta ? 'faltam ' + falta.toLocaleString('pt-BR') : 'meta alcançada 🎉'));

  var planned = projectMeta.total_chapters_planned || 0;
  var done = allChapters.filter(function(c){ return c.status === 'done'; }).length;
  setEl('goal-chapters', planned
    ? '📚 ' + allChapters.length + ' de ' + planned + ' capítulos criados · ' + done + ' finalizados'
    : '📚 ' + allChapters.length + ' capítulos · ' + done + ' finalizados');
}

function editWordGoal() {
  var atual = (projectMeta && projectMeta.target_word_count) || 80000;
  var v = prompt('Meta de palavras para o livro inteiro:', atual);
  if (v === null) return;
  var goal = parseInt(String(v).replace(/\D/g,'')) || 0;
  if (!goal) { alert('Informe um número de palavras.'); return; }

  sbPatch('projects', 'id=eq.' + PID, { target_word_count: goal })
    .then(function() {
      if (!projectMeta) projectMeta = {};
      projectMeta.target_word_count = goal;
      renderWordGoal();
    })
    .catch(function(e){ alert('Erro ao salvar a meta: ' + e.message); });
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

// ─── FOTOS (Supabase Storage) ───────────────────────────────────────────────
function photoCtx(table) {
  if (table === 'locations') {
    var loc = allLocations.find(function(l){ return l.id === currentLocationId; });
    return loc ? { row: loc, grid: 'lo-photos', status: 'lo-photo-status', rerender: function(){ renderLocaList(allLocations); var it=document.getElementById('loca-item-'+loc.id); if(it) it.classList.add('on'); } } : null;
  }
  var ev = allTimelineEvents.find(function(e){ return e.id === currentTimelineId; });
  return ev ? { row: ev, grid: 'te-photos', status: 'te-photo-status', rerender: function(){ renderTimelineList(allTimelineEvents); var it=document.getElementById('time-item-'+ev.id); if(it) it.classList.add('on'); } } : null;
}

function sbUploadPhoto(file) {
  var ext  = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
  var path = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.' + ext;
  return fetch(SB_URL + '/storage/v1/object/fotos/' + path, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': file.type || 'image/jpeg'
    },
    body: file
  }).then(function(r) {
    if (!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' ' + t.slice(0,120)); });
    return SB_URL + '/storage/v1/object/public/fotos/' + path;
  });
}

function uploadPhotos(input, table) {
  var ctx = photoCtx(table);
  if (!ctx) { input.value = ''; return; }
  var files = Array.from(input.files || []);
  input.value = '';
  if (!files.length) return;

  var tooBig = files.filter(function(f){ return f.size > 8 * 1024 * 1024; });
  if (tooBig.length) { alert('Cada foto pode ter no máximo 8 MB. Ignorando: ' + tooBig.map(function(f){return f.name;}).join(', ')); }
  files = files.filter(function(f){ return f.size <= 8 * 1024 * 1024; });
  if (!files.length) return;

  var st = document.getElementById(ctx.status);
  var done = 0;
  st.textContent = 'Enviando 0/' + files.length + '...';

  var uploads = files.map(function(f) {
    return sbUploadPhoto(f).then(function(url) {
      done++;
      st.textContent = 'Enviando ' + done + '/' + files.length + '...';
      return url;
    });
  });

  Promise.all(uploads)
    .then(function(urls) {
      var photos = (ctx.row.photos || []).concat(urls);
      return sbPatch(table, 'id=eq.' + ctx.row.id, { photos: photos })
        .then(function() {
          ctx.row.photos = photos;
          renderPhotoGrid(ctx.grid, table);
          ctx.rerender();
          st.textContent = '✓ ' + urls.length + (urls.length === 1 ? ' foto adicionada' : ' fotos adicionadas');
          setTimeout(function(){ st.textContent = ''; }, 3000);
        });
    })
    .catch(function(e) { st.textContent = 'Erro: ' + e.message; });
}

function renderPhotoGrid(gridId, table) {
  var ctx = photoCtx(table);
  var grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  if (!ctx) return;
  (ctx.row.photos || []).forEach(function(url, i) {
    var d = document.createElement('div');
    d.className = 'photo-thumb';
    var img = document.createElement('img');
    img.src = url; img.loading = 'lazy';
    img.onclick = function(){ openLightbox(url); };
    var del = document.createElement('button');
    del.className = 'photo-del'; del.textContent = '✕'; del.title = 'Remover foto';
    del.onclick = function(e) {
      e.stopPropagation();
      if (!confirm('Remover esta foto?')) return;
      removePhoto(table, i);
    };
    d.appendChild(img); d.appendChild(del);
    grid.appendChild(d);
  });
}

function removePhoto(table, index) {
  var ctx = photoCtx(table);
  if (!ctx) return;
  var url = (ctx.row.photos || [])[index];
  var photos = (ctx.row.photos || []).slice();
  photos.splice(index, 1);
  sbPatch(table, 'id=eq.' + ctx.row.id, { photos: photos })
    .then(function() {
      ctx.row.photos = photos;
      renderPhotoGrid(ctx.grid, table);
      ctx.rerender();
      // apaga o arquivo do storage (best-effort)
      var path = url && url.split('/object/public/fotos/')[1];
      if (path) fetch(SB_URL + '/storage/v1/object/fotos/' + path, {
        method: 'DELETE',
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
      }).catch(function(){});
    })
    .catch(function(e){ alert('Erro ao remover: ' + e.message); });
}

function openLightbox(url) {
  var lb = document.createElement('div');
  lb.className = 'photo-lightbox';
  var img = document.createElement('img');
  img.src = url;
  lb.appendChild(img);
  lb.onclick = function(){ lb.remove(); };
  document.body.appendChild(lb);
}

// ─── COMENTÁRIOS ANCORADOS ──────────────────────────────────────────────────
var chapterComments = [];

function toggleCmtPanel() {
  var panel = document.getElementById('cmt-panel');
  panel.classList.toggle('closed');
  var btn = document.getElementById('cmt-toggle-btn');
  btn.textContent = panel.classList.contains('closed') ? '«' : '»';
  localStorage.setItem('sos_cmt_closed', panel.classList.contains('closed') ? '1' : '');
}

function addComment() {
  if (!currentChapter) return;
  var hint = document.getElementById('fala-hint') || document.getElementById('suggest-hint');
  var ta = document.getElementById('write-area');
  var s = window.getSelection();
  if (!s.rangeCount || s.isCollapsed || !ta.contains(s.getRangeAt(0).commonAncestorContainer)) {
    if (hint) hint.textContent = 'Selecione um trecho do texto primeiro.'; return;
  }
  var range = s.getRangeAt(0);
  var excerpt = range.toString();
  var body = prompt('Comentário sobre:\n\n“' + excerpt.slice(0,180) + (excerpt.length > 180 ? '…' : '') + '”');
  if (!body || !body.trim()) return;

  var anchor = 'cmt-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
  var span = document.createElement('span');
  span.className = 'cmt';
  span.id = anchor;
  span.title = 'Comentário — clique para ver no painel';
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
  } catch (e) {
    if (hint) hint.textContent = 'Não foi possível ancorar nessa seleção (evite atravessar parágrafos).';
    return;
  }
  s.removeAllRanges();

  var m = currentMember();
  sbPost('chapter_comments', {
    project_id: PID,
    chapter_id: currentChapter.id,
    anchor: anchor,
    member_name: m ? m.name : 'Autora',
    excerpt: excerpt.slice(0, 300),
    body: body.trim()
  })
  .then(function(rows) {
    if (rows && rows[0]) chapterComments.push(rows[0]);
    renderCmtList();
    saveWriting(); // persiste o span no conteúdo
  })
  .catch(function(e) {
    unwrapAnchor(anchor);
    if (hint) hint.textContent = 'Erro ao salvar comentário: ' + e.message;
  });
}

function loadComments(chapterId) {
  chapterComments = [];
  renderCmtList();
  sbFetch('chapter_comments?chapter_id=eq.' + chapterId + '&order=created_at.asc')
    .then(function(rows) { chapterComments = rows || []; renderCmtList(); })
    .catch(function(e) { console.error('comments error', e); });
}

function renderCmtList() {
  var list = document.getElementById('cmt-list');
  var empty = document.getElementById('cmt-empty');
  if (!list) return;
  var open = chapterComments.filter(function(c){ return !c.resolved; });
  setEl('cmt-count', chapterComments.length ? String(open.length) : '');
  empty.style.display = chapterComments.length ? 'none' : 'block';
  list.innerHTML = '';

  chapterComments.forEach(function(c) {
    var d = new Date(c.created_at);
    var when = d.toLocaleDateString('pt-BR', {day:'2-digit',month:'short'}) + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    var div = document.createElement('div');
    div.className = 'cmt-item' + (c.resolved ? ' res' : '');
    div.innerHTML =
      '<div class="cmt-item-meta"><span>' + escHtml(c.member_name || '') + '</span><span>' + when + '</span></div>' +
      (c.excerpt ? '<div class="cmt-item-excerpt">' + escHtml(c.excerpt) + '</div>' : '') +
      '<div class="cmt-item-body">' + escHtml(c.body) + '</div>' +
      '<div class="cmt-item-actions">' +
        '<button class="cmt-res-btn">' + (c.resolved ? '↩ Reabrir' : '✓ Resolver') + '</button>' +
        '<button class="cmt-del-btn">Excluir</button>' +
      '</div>';

    div.addEventListener('click', function(e) {
      if (e.target.closest('button')) return;
      var span = document.getElementById(c.anchor);
      if (span) {
        span.scrollIntoView({ behavior: 'smooth', block: 'center' });
        span.classList.remove('flash'); void span.offsetWidth;
        span.classList.add('flash');
      }
    });

    div.querySelector('.cmt-res-btn').addEventListener('click', function() {
      sbPatch('chapter_comments', 'id=eq.' + c.id, { resolved: !c.resolved })
        .then(function() { c.resolved = !c.resolved; renderCmtList(); })
        .catch(function(e){ alert('Erro: ' + e.message); });
    });

    div.querySelector('.cmt-del-btn').addEventListener('click', function() {
      if (!confirm('Excluir este comentário?')) return;
      sbDelete('chapter_comments', c.id)
        .then(function() {
          chapterComments = chapterComments.filter(function(x){ return x.id !== c.id; });
          unwrapAnchor(c.anchor);
          renderCmtList();
          saveWriting();
        })
        .catch(function(e){ alert('Erro: ' + e.message); });
    });

    list.appendChild(div);
  });
}

function unwrapAnchor(anchor) {
  var span = document.getElementById(anchor);
  if (span) unwrapNode(span);
}

// ─── ESTATÍSTICAS DO CAPÍTULO ───────────────────────────────────────────────
function chapterPlainText(ch) {
  var tmp = document.createElement('div');
  tmp.innerHTML = ch.content || '';
  // <br> e blocos viram quebras de linha
  tmp.querySelectorAll('br').forEach(function(br){ br.replaceWith('\n'); });
  tmp.querySelectorAll('div,p,h1,h2,h3,blockquote,li').forEach(function(b){ b.append('\n'); });
  return tmp.textContent || '';
}

function renderChapterStats(ch) {
  var text = chapterPlainText(ch);
  var words = text.match(/\S+/g) || [];
  var nWords = words.length;

  setEl('ch-words-disp', nWords.toLocaleString('pt-BR'));
  setEl('ch-read-disp', Math.max(1, Math.round(nWords / 240)) + ' min');
  setEl('ch-chars-disp', text.replace(/\n/g,'').length.toLocaleString('pt-BR'));
  setEl('ch-charsns-disp', text.replace(/\s/g,'').length.toLocaleString('pt-BR'));

  var paras = text.split(/\n+/).map(function(p){ return p.trim(); }).filter(Boolean);
  setEl('ch-paras-disp', paras.length);

  var sentences = text.replace(/\n/g,' ').split(/[.!?…]+["'”’)]?\s/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 1; });
  setEl('ch-sents-disp', sentences.length);

  var lower = words.map(function(w){ return w.toLowerCase().replace(/[^\wÀ-ÿ'-]/g,''); }).filter(Boolean);
  var uniq = {};
  lower.forEach(function(w){ uniq[w] = 1; });
  var nUniq = Object.keys(uniq).length;
  setEl('ch-vocab-disp', lower.length ? Math.round((nUniq/lower.length)*100) + '%' : '—');
  setEl('ch-vocab-sub', nUniq.toLocaleString('pt-BR') + ' de ' + lower.length.toLocaleString('pt-BR'));

  // Diálogo: parágrafos com fala marcada, travessão ou aspas de fala
  var tmp = document.createElement('div');
  tmp.innerHTML = ch.content || '';
  var falaTexts = Array.from(tmp.querySelectorAll('.fala')).map(function(f){ return f.textContent.trim(); });
  var dialogParas = paras.filter(function(p) {
    if (/^[—–\-]\s?\S/.test(p) || /^["“]/.test(p)) return true;
    return falaTexts.some(function(f){ return f && p.indexOf(f.slice(0, 40)) !== -1; });
  });
  setEl('ch-dial-disp', paras.length ? Math.round((dialogParas.length/paras.length)*100) + '%' : '—');
  setEl('ch-dial-sub', dialogParas.length + ' de ' + paras.length + ' parágrafos');

  var wps = sentences.length ? (nWords/sentences.length) : 0;
  var spp = paras.length ? (sentences.length/paras.length) : 0;
  setEl('ch-rhythm-disp', 'Em média, ' + wps.toFixed(1).replace('.',',') + ' palavras por frase e ' + spp.toFixed(1).replace('.',',') + ' frases por parágrafo.');

  var longest = '', longestW = 0;
  sentences.forEach(function(s) {
    var n = (s.match(/\S+/g)||[]).length;
    if (n > longestW) { longestW = n; longest = s; }
  });
  setEl('ch-longest-count', longestW ? longestW + ' palavras' : '');
  setEl('ch-longest-disp', longest ? '“' + (longest.length > 140 ? longest.slice(0,137) + '…' : longest) + '”' : '—');
  var warn = document.getElementById('ch-longest-warn');
  if (warn) warn.style.display = longestW > 40 ? 'block' : 'none';
}

// ─── ADMINISTRAÇÃO: MEMBROS E PAPÉIS ────────────────────────────────────────
var allMembers = [];
var adminAvailable = null; // null = ainda não verificado

function currentMember() {
  var id = localStorage.getItem('sos_member_id');
  return allMembers.find(function(m){ return String(m.id) === String(id); }) || null;
}

function currentMemberRole() {
  var m = currentMember();
  return m ? m.role : 'autor'; // sem cadastro, comporta-se como autora
}

function loadMembers() {
  return sbFetch('project_members?project_id=eq.' + PID + '&order=created_at.asc')
    .then(function(rows) {
      adminAvailable = true;
      allMembers = rows || [];
      return allMembers;
    })
    .catch(function(e) {
      adminAvailable = false;
      allMembers = [];
      return [];
    });
}

function loadAdmin() {
  loadMembers().then(function() {
    document.getElementById('admin-setup-warn').style.display = adminAvailable ? 'none' : 'block';
    document.getElementById('admin-content').style.display    = adminAvailable ? 'block' : 'none';
    if (!adminAvailable) return;
    renderMembers();
    loadAdminSuggestions();
  });
}

function renderMembers() {
  var list = document.getElementById('member-list');
  var empty = document.getElementById('member-list-empty');
  var meSel = document.getElementById('admin-me-sel');
  list.innerHTML = '';
  empty.style.display = allMembers.length ? 'none' : 'block';

  allMembers.forEach(function(m) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--bd);border-radius:10px';
    row.innerHTML = '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--tx)">' + escHtml(m.name) + '</div>' +
      '<div style="font-size:11px;color:var(--tx3)">' + escHtml(m.email) + '</div></div>' +
      '<span class="ck ' + (m.role === 'autor' ? 'sd' : 'sr') + '">' + (m.role === 'autor' ? 'Autora' : 'Revisora') + '</span>';
    var del = document.createElement('button');
    del.className = 'btn'; del.style.cssText = 'padding:3px 8px;font-size:11px'; del.textContent = '🗑';
    del.onclick = function() {
      if (!confirm('Remover ' + m.name + ' do projeto?')) return;
      sbDelete('project_members', m.id).then(loadAdmin).catch(function(e){ alert('Erro: ' + e.message); });
    };
    row.appendChild(del);
    list.appendChild(row);
  });

  var meId = localStorage.getItem('sos_member_id') || '';
  meSel.innerHTML = '<option value="">— selecionar —</option>' + allMembers.map(function(m) {
    return '<option value="' + m.id + '"' + (String(m.id) === meId ? ' selected' : '') + '>' + escHtml(m.name) + '</option>';
  }).join('');
  updateMeRoleLabel();
}

function setCurrentMember(id) {
  if (id) localStorage.setItem('sos_member_id', id);
  else localStorage.removeItem('sos_member_id');
  updateMeRoleLabel();
}

function updateMeRoleLabel() {
  var m = currentMember();
  setEl('admin-me-role', m ? (m.role === 'autor' ? 'Papel: Autora — pode editar e aprovar sugestões' : 'Papel: Revisora — pode apenas sugerir alterações') : 'Ninguém selecionado — acesso completo (modo padrão)');
}

function addMember() {
  var name  = document.getElementById('member-name').value.trim();
  var email = document.getElementById('member-email').value.trim();
  var role  = document.getElementById('member-role').value;
  var st    = document.getElementById('member-add-status');
  if (!name || !email) { st.textContent = 'Preencha nome e e-mail.'; return; }
  st.textContent = 'Cadastrando...';
  sbPost('project_members', { project_id: PID, name: name, email: email, role: role })
    .then(function() {
      document.getElementById('member-name').value = '';
      document.getElementById('member-email').value = '';
      st.textContent = '✓ Cadastrado';
      setTimeout(function(){ st.textContent = ''; }, 3000);
      loadAdmin();
    })
    .catch(function(e){ st.textContent = 'Erro: ' + e.message; });
}

// ─── SUGESTÕES DE REVISÃO ───────────────────────────────────────────────────
function suggestFromSelection() {
  var hint = document.getElementById('suggest-hint');
  if (!currentChapter) return;
  var ta = document.getElementById('write-area');
  var s = window.getSelection();
  if (!s.rangeCount || s.isCollapsed || !ta.contains(s.getRangeAt(0).commonAncestorContainer)) {
    hint.textContent = 'Selecione o trecho que quer alterar.'; return;
  }
  var excerpt = s.getRangeAt(0).toString();
  var proposal = prompt('Trecho selecionado:\n\n“' + excerpt.slice(0,200) + (excerpt.length > 200 ? '…' : '') + '”\n\nDigite o texto sugerido no lugar:');
  if (proposal === null) return;
  var comment = prompt('Observação para a autora (opcional):') || null;
  var m = currentMember();
  hint.textContent = 'Enviando...';
  sbPost('suggestions', {
    project_id: PID,
    chapter_id: currentChapter.id,
    member_name: m ? m.name : 'Revisora',
    excerpt: excerpt,
    proposal: proposal,
    comment: comment,
    status: 'pendente'
  })
  .then(function() { flashHint(hint, '✓ Sugestão enviada para aprovação da autora'); })
  .catch(function(e) {
    hint.textContent = (String(e.message).indexOf('404') !== -1)
      ? 'Tabelas de administração não configuradas (veja a aba Administração).'
      : 'Erro: ' + e.message;
  });
}

function loadSuggestions(chapterId) {
  var box = document.getElementById('ch-suggestions');
  var empty = document.getElementById('ch-suggestions-empty');
  if (!box) return;
  sbFetch('suggestions?chapter_id=eq.' + chapterId + '&order=created_at.desc')
    .then(function(rows) {
      renderSuggestionList(box, empty, rows || [], true);
    })
    .catch(function() { box.innerHTML = ''; empty.style.display = 'block'; });
}

function loadAdminSuggestions() {
  var box = document.getElementById('admin-suggestions');
  var empty = document.getElementById('admin-suggestions-empty');
  sbFetch('suggestions?project_id=eq.' + PID + '&status=eq.pendente&order=created_at.desc')
    .then(function(rows) {
      renderSuggestionList(box, empty, rows || [], false);
    })
    .catch(function() { box.innerHTML = ''; empty.style.display = 'block'; });
}

function renderSuggestionList(box, empty, rows, chapterContext) {
  box.innerHTML = '';
  empty.style.display = rows.length ? 'none' : 'block';
  var isAuthor = currentMemberRole() === 'autor';

  rows.forEach(function(sg) {
    var chTitle = '';
    if (!chapterContext) {
      var ch = allChapters.find(function(c){ return c.id === sg.chapter_id; });
      chTitle = ch ? (ch.chapter_label || 'Cap. ' + ch.chapter_number) + ' — ' + ch.title : '';
    }
    var stColor = sg.status === 'aprovada' ? '#1D7A4A' : sg.status === 'recusada' ? '#C62828' : '#C2851A';
    var div = document.createElement('div');
    div.className = 'sugg';
    div.innerHTML =
      '<div class="sugg-meta"><span>' + escHtml(sg.member_name || 'Revisora') + (chTitle ? ' · ' + escHtml(chTitle) : '') + '</span>' +
      '<span class="sugg-status" style="color:' + stColor + '">' + sg.status + '</span></div>' +
      '<div class="sugg-old">' + escHtml(sg.excerpt) + '</div>' +
      '<div class="sugg-new">' + escHtml(sg.proposal) + '</div>' +
      (sg.comment ? '<div style="font-size:11px;color:var(--tx3);margin-top:6px">💬 ' + escHtml(sg.comment) + '</div>' : '');

    if (sg.status === 'pendente' && isAuthor) {
      var actions = document.createElement('div');
      actions.className = 'sugg-actions';
      var ok = document.createElement('button');
      ok.className = 'btn p'; ok.style.cssText = 'padding:4px 10px;font-size:12px'; ok.textContent = '✓ Aprovar e aplicar';
      ok.onclick = function() { resolveSuggestion(sg, true); };
      var no = document.createElement('button');
      no.className = 'btn'; no.style.cssText = 'padding:4px 10px;font-size:12px'; no.textContent = '✗ Recusar';
      no.onclick = function() { resolveSuggestion(sg, false); };
      actions.appendChild(ok); actions.appendChild(no);
      div.appendChild(actions);
    }
    box.appendChild(div);
  });
}

function resolveSuggestion(sg, approve) {
  if (!approve) {
    sbPatch('suggestions', 'id=eq.' + sg.id, { status: 'recusada' })
      .then(refreshSuggestionViews).catch(function(e){ alert('Erro: ' + e.message); });
    return;
  }
  var ch = allChapters.find(function(c){ return c.id === sg.chapter_id; });
  if (!ch) { alert('Capítulo não encontrado.'); return; }

  var content = ch.content || '';
  var applied = false;
  // tenta substituir no HTML direto; senão, via texto escapado
  if (content.indexOf(sg.excerpt) !== -1) {
    content = content.replace(sg.excerpt, sg.proposal);
    applied = true;
  } else {
    var escExcerpt = escHtml(sg.excerpt);
    if (content.indexOf(escExcerpt) !== -1) {
      content = content.replace(escExcerpt, escHtml(sg.proposal));
      applied = true;
    }
  }

  if (!applied) {
    if (!confirm('Não encontrei o trecho exato no texto atual (pode ter sido editado). Marcar como aprovada mesmo assim, sem aplicar automaticamente?')) return;
    sbPatch('suggestions', 'id=eq.' + sg.id, { status: 'aprovada' })
      .then(refreshSuggestionViews).catch(function(e){ alert('Erro: ' + e.message); });
    return;
  }

  var tmp = document.createElement('div');
  tmp.innerHTML = content;
  var words = (tmp.innerText.match(/\S+/g) || []).length;

  sbPatch('chapters', 'id=eq.' + sg.chapter_id, { content: content, word_count: words, updated_at: new Date().toISOString() })
    .then(function() {
      ch.content = content;
      ch.word_count = words;
      return sbPatch('suggestions', 'id=eq.' + sg.id, { status: 'aprovada' });
    })
    .then(function() {
      if (currentChapter && currentChapter.id === ch.id) renderChapterStats(ch);
      refreshSuggestionViews();
    })
    .catch(function(e){ alert('Erro ao aplicar: ' + e.message); });
}

function refreshSuggestionViews() {
  if (currentChapter) loadSuggestions(currentChapter.id);
  var adminBox = document.getElementById('admin-suggestions');
  if (adminBox && document.getElementById('v-admin').classList.contains('on')) loadAdminSuggestions();
}

// ─── NAVEGAÇÃO ──────────────────────────────────────────────────────────────
var timelineLoaded = false;
var locationsLoaded = false;
var relationshipsLoaded = false;

function toggleSb(open) {
  document.querySelector('.sb').classList.toggle('open', open);
}

function go(name, el) {
  toggleSb(false);
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('on'); });
  var t = document.getElementById('v-' + name);
  if (t) t.classList.add('on');
  document.querySelectorAll('.ni').forEach(function(i) { i.classList.remove('on'); });
  if (el) el.classList.add('on');

  if (name === 'stat') loadStats();
  if (name === 'time' && !timelineLoaded) { timelineLoaded = true; loadTimeline(); }
  if (name === 'loca' && !locationsLoaded) { locationsLoaded = true; loadLocations(); }
  if (name === 'rela' && !relationshipsLoaded) { relationshipsLoaded = true; loadRelationships(); }
  if (name === 'admin') loadAdmin();
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

  loadProjectMeta();
  loadChapters();
  loadIdeas();
  loadCharacters().then(function(){ loadLocations(); loadTimeline(); locationsLoaded = true; timelineLoaded = true; });
  loadMembers();
});
