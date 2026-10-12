/**
 * FMP VESTIBULAR – app.js
 * SPA em JavaScript Vanilla (ES6+)
 * Mobile-First | LocalStorage | Fetch API | Banco Completo de 467 Questões
 */

'use strict';

/* ═══════════════════════════════════════════════════
   1. APP STATE
═══════════════════════════════════════════════════ */
const State = {
  theme: 'dark',
  fontSize: 16,
  reviewedLessons: new Set(),
  totalLessons: 0,

  // Question bank
  questions: [],          // all 467 normalized questions
  textsById: {},          // id -> { id, title, author, content }
  questionStates: {},     // { id: { answered: bool, correct: bool, selected: str } }
  filteredQuestions: [],  // questions after active filters & search

  // Pagination & Simulado
  currentPage: 1,
  pageSize: 25,           // 25 per page or Infinity
  simuladoMode: false,
  simuladoQuestions: [],

  // External data
  notasData: null,
  redacaoData: null,

  activeTab: 'estudar',
  dataLoaded: { praticar: false, redacao: false, notas: false },
};

/* ═══════════════════════════════════════════════════
   2. DOM HELPERS
═══════════════════════════════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const el = (tag, props = {}, ...children) => {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'className') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.flat().forEach(c => c && e.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
};

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  const toast = el('div', { className: `toast ${type}` },
    el('span', {}, icon),
    el('span', {}, message)
  );
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ═══════════════════════════════════════════════════
   3. THEME & FONT SIZE
═══════════════════════════════════════════════════ */
function initTheme() {
  const saved = localStorage.getItem('fmp_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  State.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const icon = $('#theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('fmp_theme', theme);
}

function toggleTheme() {
  applyTheme(State.theme === 'dark' ? 'light' : 'dark');
  showToast(`Tema ${State.theme === 'dark' ? 'escuro' : 'claro'} ativado`, 'info');
}

function initFontSize() {
  const saved = parseInt(localStorage.getItem('fmp_font_size') || '16', 10);
  applyFontSize(saved);
}

function applyFontSize(size) {
  const clamped = Math.min(22, Math.max(12, size));
  State.fontSize = clamped;
  document.documentElement.style.fontSize = clamped + 'px';
  localStorage.setItem('fmp_font_size', clamped);
}

/* ═══════════════════════════════════════════════════
   4. TABS NAVIGATION
═══════════════════════════════════════════════════ */
function initTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tabName) {
  // Always close any modal/overlays when switching tabs to avoid locks
  hideResultModal();
  if (typeof closeLightbox === 'function') closeLightbox();
  document.body.classList.remove('modal-open');

  if (State.activeTab === tabName) return;
  State.activeTab = tabName;

  $$('.tab-btn').forEach(b => {
    const isActive = b.dataset.tab === tabName;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive);
  });

  $$('.tab-panel').forEach(p => {
    p.classList.remove('active');
  });

  const panel = $(`#panel-${tabName}`);
  if (panel) {
    panel.classList.add('active');
    panel.style.filter = 'none';
    panel.style.backdropFilter = 'none';
    panel.style.pointerEvents = 'auto';
    panel.style.animation = 'none';
    panel.offsetHeight; // reflow
    panel.style.animation = '';
  }

  // Lazy load data
  if (tabName === 'praticar' && !State.dataLoaded.praticar) loadPracticeData();
  if (tabName === 'redacao'  && !State.dataLoaded.redacao)  loadRedacaoData();
  if (tabName === 'notas'    && !State.dataLoaded.notas)    loadNotasData();

  // Scroll tab button into view on mobile
  const activeBtn = $(`#tab-${tabName}`);
  if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

/* ═══════════════════════════════════════════════════
   5. ESTUDAR TAB – ACCORDION & PROGRESS
═══════════════════════════════════════════════════ */
function initAccordion() {
  const triggers = $$('.accordion-trigger');
  State.totalLessons = $$('.review-check').length;
  updateProgress();

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      const contentId = trigger.getAttribute('aria-controls');
      const content = $(`#${contentId}`);

      // Close all others
      triggers.forEach(t => {
        if (t !== trigger) {
          t.setAttribute('aria-expanded', 'false');
          const c = $(`#${t.getAttribute('aria-controls')}`);
          if (c) c.classList.remove('open');
        }
      });

      trigger.setAttribute('aria-expanded', String(!isOpen));
      if (content) content.classList.toggle('open', !isOpen);
    });
  });

  // Review checkboxes
  $$('.review-check').forEach(chk => {
    const lessonId = chk.dataset.lesson;
    if (localStorage.getItem(`fmp_lesson_${lessonId}`) === '1') {
      chk.checked = true;
      State.reviewedLessons.add(lessonId);
    }
    chk.addEventListener('change', () => {
      if (chk.checked) {
        State.reviewedLessons.add(lessonId);
        localStorage.setItem(`fmp_lesson_${lessonId}`, '1');
        showToast('Tópico marcado como revisado! ✅', 'success');
      } else {
        State.reviewedLessons.delete(lessonId);
        localStorage.removeItem(`fmp_lesson_${lessonId}`);
      }
      updateProgress();
    });
  });
}

function updateProgress() {
  const total = State.totalLessons;
  const reviewed = State.reviewedLessons.size;
  const pct = total === 0 ? 0 : Math.round((reviewed / total) * 100);

  const fill = $('#progress-bar-fill');
  const val  = $('#progress-value');
  const det  = $('#progress-detail');
  const aria = $('#progress-bar-aria');

  if (fill) fill.style.width = pct + '%';
  if (val)  val.textContent  = pct + '%';
  if (det)  det.textContent  = `${reviewed} de ${total} tópicos revisados`;
  if (aria) aria.setAttribute('aria-valuenow', pct);
}

/* ═══════════════════════════════════════════════════
   6. SEARCH (Study Tab)
═══════════════════════════════════════════════════ */
function initSearch() {
  const input = $('#study-search');
  const clearBtn = $('#search-clear');
  if (!input) return;

  input.addEventListener('input', debounce(() => {
    const query = input.value.trim();
    if (clearBtn) clearBtn.hidden = !query;
    filterAccordion(query);
  }, 220));

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    clearBtn.hidden = true;
    filterAccordion('');
    input.focus();
  });
}

function filterAccordion(query) {
  const q = query.toLowerCase().trim();
  const items = $$('.accordion-item');

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const match = !q || text.includes(q);
    item.classList.toggle('hidden', !match);

    const bodies = $$('.content-body', item);
    if (match && q) {
      bodies.forEach(body => highlightText(body, q));
    } else if (!q) {
      bodies.forEach(body => removeHighlights(body));
    }
  });

  $$('.accordion-group').forEach(group => {
    const hasVisible = $$('.accordion-item:not(.hidden)', group).length > 0;
    group.style.display = hasVisible ? '' : 'none';
  });
}

function highlightText(element, query) {
  removeHighlights(element);
  if (!query) return;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  nodes.forEach(textNode => {
    if (!textNode.textContent.toLowerCase().includes(query)) return;
    const span = document.createElement('span');
    span.innerHTML = textNode.textContent.replace(regex, '<mark>$1</mark>');
    textNode.parentNode?.replaceChild(span, textNode);
  });
}

function removeHighlights(element) {
  $$('mark', element).forEach(mark => {
    const text = document.createTextNode(mark.textContent);
    mark.parentNode?.replaceChild(text, mark);
  });
  $$('span', element).forEach(span => {
    if (!span.children.length && span.parentNode) {
      span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    }
  });
}

/* ═══════════════════════════════════════════════════
   7. PRATICAR TAB – QUESTION BANK LOADER
═══════════════════════════════════════════════════ */
const QUESTION_FILES = [
  './data/banco_questoes/banco_atualidades_fmp_atualizado.json',
  './data/banco_questoes/banco_questoes_fmp_atualidades_historia_geografia_palhoca_informatica.json',
  './data/banco_questoes/banco_questoes_fmp_portugues.json',
  './data/banco_questoes/banco_questoes_informatica_fmp.json',
  './data/banco_questoes/banco_questoes_matematica_fmp.json',
  './data/banco_questoes/banco_questoes_palhoca_fmp.json',
];

async function loadPracticeData() {
  State.dataLoaded.praticar = true;
  const loading = $('#questions-loading');

  try {
    const results = await Promise.all(QUESTION_FILES.map(f =>
      fetch(f).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} on ${f}`);
        return r.json();
      }).then(data => ({ filename: f, data }))
    ));

    const allQuestions = [];
    State.textsById = {};

    results.forEach(({ filename, data }) => {
      // Store reading support texts
      if (Array.isArray(data.texts)) {
        data.texts.forEach(t => {
          if (t && t.id) State.textsById[t.id] = t;
        });
      }

      // Normalize questions
      if (Array.isArray(data.questions)) {
        data.questions.forEach(q => {
          allQuestions.push(normalizeQuestion(q, filename));
        });
      }
    });

    State.questions = allQuestions;

    // Restore answer history from localStorage
    const saved = JSON.parse(localStorage.getItem('fmp_question_states') || '{}');
    State.questionStates = saved;

    initPracticeFilters();
    applyQuestionFilters();
    updatePracticeStats();

    if (loading) loading.style.display = 'none';
  } catch (err) {
    console.error('[FMP] Error loading questions:', err);
    if (loading) loading.style.display = 'none';
    const list = $('#questions-list');
    if (list) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">⚠️</span>
          <p>Erro ao carregar o banco de questões.</p>
          <small style="opacity:0.7">${err.message}</small>
        </div>`;
    }
  }
}

function normalizeQuestion(q, filename) {
  const id = q.id;
  const tags = Array.isArray(q.tags) ? q.tags : [];
  const textId = q.textId || q.text_id || null;
  const enunciado = q.question || q.statement || '';
  const explanation = q.explanation || '';
  const resposta_correta = (q.correctKey || q.correct_answer || '').toUpperCase().trim();

  // Normalize alternatives
  let alternativas = [];
  if (Array.isArray(q.options)) {
    alternativas = q.options.map(opt => ({
      letra: (opt.key || '').toUpperCase().trim(),
      texto: String(opt.text || '')
    }));
  } else if (q.options && typeof q.options === 'object') {
    alternativas = Object.entries(q.options).map(([k, v]) => ({
      letra: k.toUpperCase().trim(),
      texto: String(v || '')
    }));
  }

  // Determine materia
  const materia = detectMateria(q, filename, tags);

  // Determine exam year / origin
  const exam = detectExam(q, tags);

  return {
    id,
    materia,
    exam,
    enunciado,
    alternativas,
    resposta_correta,
    explanation,
    textId,
    tags
  };
}

function detectMateria(q, filename, tags) {
  const qid = (q.id || '').toLowerCase();
  const lowerTags = tags.map(t => t.toLowerCase());

  if (lowerTags.some(t => t.includes('portugues') || t.includes('literatura') || t.includes('gramatica')) || qid.startsWith('lp_')) {
    return 'Português';
  }
  if (lowerTags.some(t => t.includes('matematica')) || qid.startsWith('mat')) {
    return 'Matemática';
  }
  if (lowerTags.some(t => t.includes('informatica') || t.includes('office')) || qid.startsWith('itd') || qid.startsWith('info_')) {
    return 'Informática';
  }
  if (lowerTags.some(t => t.includes('palhoca') || t.includes('historia-local') || t.includes('geografia-local') || t.includes('cultura-local')) || qid.startsWith('pf') || qid.includes('palhoca')) {
    return 'Palhoça';
  }
  if (lowerTags.some(t => t.includes('atualidades') || t.includes('geopolitica')) || qid.startsWith('atu')) {
    return 'Atualidades';
  }

  // Fallback by filename
  const fn = filename.toLowerCase();
  if (fn.includes('portugues')) return 'Português';
  if (fn.includes('matematica')) return 'Matemática';
  if (fn.includes('informatica')) return 'Informática';
  if (fn.includes('palhoca')) return 'Palhoça';
  if (fn.includes('atualidades')) return 'Atualidades';
  return 'Geral';
}

function detectExam(q, tags) {
  for (const t of tags) {
    if (t.includes('2026-2')) return '2026/2';
    if (t.includes('2026-1')) return '2026/1';
    if (t.includes('2025-2')) return '2025/2';
    if (t.includes('2025-1')) return '2025/1';
    if (t.includes('2024-2')) return '2024/2';
    if (t.includes('2023-1')) return '2023/1';
    if (t.includes('2019-1')) return '2019/1';
    if (t.includes('ia') || t.includes('inedita')) return 'IA Inédita';
  }
  const qid = (q.id || '').toUpperCase();
  if (qid.includes('2026-2')) return '2026/2';
  if (qid.includes('2026-1')) return '2026/1';
  if (qid.includes('2025-2')) return '2025/2';
  if (qid.includes('2025-1')) return '2025/1';
  if (qid.includes('2024-2')) return '2024/2';
  return 'FMP';
}

/* ═══════════════════════════════════════════════════
   8. PRATICAR TAB – FILTERS, SEARCH & PAGINATION
═══════════════════════════════════════════════════ */
function initPracticeFilters() {
  $('#filter-subject')?.addEventListener('change', () => { State.currentPage = 1; applyQuestionFilters(); });
  $('#filter-exam')?.addEventListener('change', () => { State.currentPage = 1; applyQuestionFilters(); });
  $('#filter-status')?.addEventListener('change', () => { State.currentPage = 1; applyQuestionFilters(); });
  $('#shuffle-alts')?.addEventListener('change', () => renderCurrentPage());

  const qsearch = $('#filter-qsearch');
  if (qsearch) {
    qsearch.addEventListener('input', debounce(() => {
      State.currentPage = 1;
      applyQuestionFilters();
    }, 200));
  }

  $('#reset-practice')?.addEventListener('click', resetPractice);
  $('#btn-show-result')?.addEventListener('click', showResultModal);
  $('#btn-simulado-40')?.addEventListener('click', startSimuladoMode);
}

function applyQuestionFilters() {
  if (State.simuladoMode) {
    State.filteredQuestions = State.simuladoQuestions;
    renderCurrentPage();
    return;
  }

  const subject = $('#filter-subject')?.value || 'all';
  const exam    = $('#filter-exam')?.value    || 'all';
  const status  = $('#filter-status')?.value  || 'all';
  const query   = ($('#filter-qsearch')?.value || '').toLowerCase().trim();

  State.filteredQuestions = State.questions.filter(q => {
    const matMatch = subject === 'all' || q.materia === subject;
    const examMatch = exam === 'all' ? true :
      exam === '2026' ? q.exam.includes('2026') :
      exam === '2025' ? q.exam.includes('2025') :
      exam === '2024' ? q.exam.includes('2024') :
      exam === 'ia'   ? (q.exam.includes('IA') || q.tags.some(t => t.toLowerCase().includes('ia'))) : true;

    const qs = State.questionStates[q.id];
    const statusMatch =
      status === 'all'        ? true :
      status === 'unanswered' ? !qs?.answered :
      status === 'wrong'      ? (qs?.answered && !qs?.correct) : true;

    const queryMatch = !query ||
      q.enunciado.toLowerCase().includes(query) ||
      q.alternativas.some(a => a.texto.toLowerCase().includes(query)) ||
      q.tags.some(t => t.toLowerCase().includes(query));

    return matMatch && examMatch && statusMatch && queryMatch;
  });

  renderCurrentPage();
}

function renderCurrentPage() {
  const list = $('#questions-list');
  if (!list) return;

  const total = State.filteredQuestions.length;

  if (total === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>Nenhuma questão encontrada com os filtros atuais.</p>
        <button class="btn-reset-practice" style="margin-top:1rem" onclick="document.getElementById('filter-subject').value='all';document.getElementById('filter-exam').value='all';document.getElementById('filter-status').value='all';document.getElementById('filter-qsearch').value='';State.simuladoMode=false;applyQuestionFilters();">Limpar Filtros</button>
      </div>`;
    renderPaginationBar(0, 1, State.pageSize);
    return;
  }

  // Slice questions for pagination
  const pageSize = State.pageSize;
  const totalPages = Math.ceil(total / pageSize);
  if (State.currentPage > totalPages) State.currentPage = totalPages;
  if (State.currentPage < 1) State.currentPage = 1;

  const startIdx = (State.currentPage - 1) * pageSize;
  const pageQuestions = State.filteredQuestions.slice(startIdx, startIdx + pageSize);

  list.innerHTML = '';

  // Simulado Mode Header Banner
  if (State.simuladoMode) {
    const banner = el('div', {
      style: 'background:linear-gradient(135deg,rgba(108,155,255,0.15),rgba(95,224,200,0.15));border:1px solid var(--accent-blue);border-radius:var(--radius-md);padding:1rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem;'
    });
    banner.innerHTML = `
      <div>
        <strong style="color:var(--accent-blue);font-size:1.05rem;">⚡ MODO SIMULADO FMP ATIVO (40 Questões)</strong>
        <div style="font-size:.8rem;color:var(--text-muted);margin-top:2px;">10 Português • 10 Matemática • 5 Informática • 10 Palhoça • 5 Atualidades</div>
      </div>
      <button class="btn-reset-practice" id="btn-exit-simulado" style="background:var(--bg-card);border:1px solid var(--border-color);">Sair do Simulado</button>
    `;
    list.appendChild(banner);
    banner.querySelector('#btn-exit-simulado')?.addEventListener('click', exitSimuladoMode);
  }

  pageQuestions.forEach((q, idx) => {
    const card = buildQuestionCard(q, startIdx + idx + 1);
    list.appendChild(card);
  });

  renderPaginationBar(total, State.currentPage, pageSize);
}

function renderPaginationBar(total, current, pageSize) {
  const bar = $('#pagination-bar');
  if (!bar) return;

  if (total <= pageSize || State.simuladoMode) {
    bar.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(total / pageSize);
  bar.innerHTML = '';

  // Prev button
  const prevBtn = el('button', { className: 'page-btn', disabled: current === 1 }, '‹ Anterior');
  prevBtn.addEventListener('click', () => {
    State.currentPage = Math.max(1, current - 1);
    renderCurrentPage();
    scrollToQuestions();
  });
  bar.appendChild(prevBtn);

  // Page numbers (show window)
  const maxButtons = 5;
  let start = Math.max(1, current - 2);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start < maxButtons - 1) {
    start = Math.max(1, end - maxButtons + 1);
  }

  for (let p = start; p <= end; p++) {
    const pBtn = el('button', { className: `page-btn ${p === current ? 'active' : ''}` }, String(p));
    const pageNum = p;
    pBtn.addEventListener('click', () => {
      State.currentPage = pageNum;
      renderCurrentPage();
      scrollToQuestions();
    });
    bar.appendChild(pBtn);
  }

  // Next button
  const nextBtn = el('button', { className: 'page-btn', disabled: current === totalPages }, 'Próxima ›');
  nextBtn.addEventListener('click', () => {
    State.currentPage = Math.min(totalPages, current + 1);
    renderCurrentPage();
    scrollToQuestions();
  });
  bar.appendChild(nextBtn);

  // Page info
  const info = el('span', { className: 'page-info' }, `${startIdxDisplay(total, current, pageSize)} de ${total} questões`);
  bar.appendChild(info);
}

function startIdxDisplay(total, current, pageSize) {
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(total, current * pageSize);
  return `${start}–${end}`;
}

function scrollToQuestions() {
  const target = $('#practice-filters');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ═══════════════════════════════════════════════════
   9. QUESTION CARD BUILDER & INTERACTION
═══════════════════════════════════════════════════ */
function buildQuestionCard(q, num) {
  const qs = State.questionStates[q.id] || {};
  const isAnswered = qs.answered;

  const card = el('div', {
    className: `question-card ${isAnswered ? (qs.correct ? 'answered-correct' : 'answered-wrong') : ''}`,
    id: `qcard-${q.id}`,
  });

  // Header
  const subjectEmoji = {
    'Português': '📝',
    'Matemática': '➕',
    'Informática': '💻',
    'Palhoça': '🌊',
    'Atualidades': '🌍'
  };

  const header = el('div', { className: 'question-header' });
  const badgeWrap = el('div', { style: 'display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;' });
  badgeWrap.append(
    el('span', { className: 'question-badge' }, `${subjectEmoji[q.materia] || '📌'} ${q.materia}`),
    el('span', { className: 'exam-tag' }, `📅 ${q.exam}`)
  );

  header.append(
    badgeWrap,
    el('span', { className: 'question-number' }, `Q${num}`)
  );
  card.appendChild(header);

  // Body
  const body = el('div', { className: 'question-body' });

  // Associated Reading Support Text (if question has a linked text)
  if (q.textId && State.textsById[q.textId]) {
    const textObj = State.textsById[q.textId];
    const textToggleBtn = el('button', {
      className: 'q-text-toggle-btn',
      'aria-expanded': 'false',
    }, `📖 Ler Texto de Apoio: "${textObj.title || 'Texto de Leitura'}" ▾`);

    const textBox = el('div', { className: 'q-associated-text collapsed' });
    textBox.innerHTML = `
      <div class="q-text-header">
        <div class="q-text-title">${textObj.title || 'Texto de Apoio'}</div>
        ${textObj.author ? `<div class="q-text-author">Autor: ${textObj.author}</div>` : ''}
      </div>
      <div class="q-text-body">${textObj.content || ''}</div>
    `;

    textToggleBtn.addEventListener('click', () => {
      const isCollapsed = textBox.classList.contains('collapsed');
      textBox.classList.toggle('collapsed', !isCollapsed);
      textToggleBtn.setAttribute('aria-expanded', String(isCollapsed));
      textToggleBtn.textContent = isCollapsed
        ? `📖 Ocultar Texto: "${textObj.title || 'Texto de Leitura'}" ▴`
        : `📖 Ler Texto de Apoio: "${textObj.title || 'Texto de Leitura'}" ▾`;
    });

    body.append(textToggleBtn, textBox);
  }

  // Question statement
  const qText = el('p', { className: 'question-text' }, q.enunciado);
  body.appendChild(qText);

  // Alternatives
  const shuffle = $('#shuffle-alts')?.checked;
  const alts = shuffle ? shuffleArray([...q.alternativas]) : [...q.alternativas];
  const altsList = el('ul', { className: 'alternatives-list', 'aria-label': 'Alternativas' });

  alts.forEach(alt => {
    const li = el('li', { className: 'alt-item' });
    const btn = el('button', {
      className: `alt-btn${isAnswered ? ' ' + getAltClass(q, alt.letra, qs.selected) : ''}`,
      id: `alt-${q.id}-${alt.letra}`,
      'aria-label': `Alternativa ${alt.letra}: ${alt.texto}`,
    });
    if (isAnswered) btn.disabled = true;

    const letterSpan = el('span', { className: 'alt-letter' }, alt.letra);
    const textSpan   = el('span', { className: 'alt-text' }, alt.texto);
    btn.append(letterSpan, textSpan);

    btn.addEventListener('click', () => handleAnswer(q, alt.letra, card));
    li.appendChild(btn);
    altsList.appendChild(li);
  });

  body.appendChild(altsList);

  // If already answered, show explanation
  if (isAnswered) {
    body.appendChild(buildExplanationBox(q));
  }

  card.appendChild(body);
  return card;
}

function getAltClass(q, letra, selected) {
  if (letra === q.resposta_correta) return 'correct-reveal';
  if (letra === selected && letra !== q.resposta_correta) return 'selected-wrong';
  return '';
}

function handleAnswer(q, selected, card) {
  const isCorrect = selected === q.resposta_correta;

  State.questionStates[q.id] = { answered: true, correct: isCorrect, selected };
  saveQuestionStates();

  // Update card styling
  card.classList.toggle('answered-correct', isCorrect);
  card.classList.toggle('answered-wrong', !isCorrect);

  // Update buttons
  $$('.alt-btn', card).forEach(btn => {
    btn.disabled = true;
    const letra = btn.querySelector('.alt-letter')?.textContent;
    if (!letra) return;
    btn.className = 'alt-btn ' + getAltClass(q, letra, selected);
  });

  // Reveal explanation box
  const body = $('.question-body', card);
  const existingExp = $('.explanation-box', card);
  if (!existingExp && body) {
    body.appendChild(buildExplanationBox(q));
  }

  updatePracticeStats();
  showToast(isCorrect ? '✅ Resposta correta!' : `❌ Incorreto! Gabarito: ${q.resposta_correta}`, isCorrect ? 'success' : 'error');
}

function buildExplanationBox(q) {
  const box = el('div', { className: 'explanation-box' });
  box.innerHTML = `<strong>💡 Explicação</strong>${q.explanation || `A alternativa correta é a <strong>${q.resposta_correta}</strong>.`}`;
  return box;
}

function saveQuestionStates() {
  localStorage.setItem('fmp_question_states', JSON.stringify(State.questionStates));
}

function updatePracticeStats() {
  const activeQuestions = State.simuladoMode ? State.simuladoQuestions : State.questions;
  const states = State.questionStates;
  const correctCount = activeQuestions.filter(q => states[q.id]?.correct).length;
  const wrongCount   = activeQuestions.filter(q => states[q.id]?.answered && !states[q.id]?.correct).length;
  const total        = activeQuestions.length;

  const setCount = (id, val) => { const e = $(`#${id}`); if (e) e.textContent = val; };
  setCount('count-correct', correctCount);
  setCount('count-wrong', wrongCount);
  setCount('count-total', total);
}

function resetPractice() {
  if (!confirm('Deseja reiniciar seu progresso de questões? Todas as respostas serão limpas.')) return;
  State.questionStates = {};
  localStorage.removeItem('fmp_question_states');
  applyQuestionFilters();
  updatePracticeStats();
  showToast('Progresso de questões reiniciado!', 'info');
}

/* ═══════════════════════════════════════════════════
   10. MODO SIMULADO OFICIAL (40 Questões FMP)
═══════════════════════════════════════════════════ */
function startSimuladoMode() {
  const byMat = {
    'Português': State.questions.filter(q => q.materia === 'Português'),
    'Matemática': State.questions.filter(q => q.materia === 'Matemática'),
    'Informática': State.questions.filter(q => q.materia === 'Informática'),
    'Palhoça': State.questions.filter(q => q.materia === 'Palhoça'),
    'Atualidades': State.questions.filter(q => q.materia === 'Atualidades'),
  };

  // Official distribution: 10 Port, 10 Mat, 5 Info, 10 Palhoca, 5 Atu = 40 questions
  const pick = (arr, n) => shuffleArray(arr).slice(0, n);
  const selected = [
    ...pick(byMat['Português'], 10),
    ...pick(byMat['Matemática'], 10),
    ...pick(byMat['Informática'], 5),
    ...pick(byMat['Palhoça'], 10),
    ...pick(byMat['Atualidades'], 5),
  ];

  State.simuladoMode = true;
  State.simuladoQuestions = selected;
  State.currentPage = 1;
  State.pageSize = 40; // show all 40 questions of mock exam

  applyQuestionFilters();
  updatePracticeStats();
  scrollToQuestions();
  showToast('🎯 Simulado Oficial de 40 questões gerado! Boa prova!', 'success');
}

function exitSimuladoMode() {
  State.simuladoMode = false;
  State.simuladoQuestions = [];
  State.pageSize = 25;
  State.currentPage = 1;
  applyQuestionFilters();
  updatePracticeStats();
  showToast('Você saiu do modo simulado.', 'info');
}

/* ═══════════════════════════════════════════════════
   11. RESULT COMPARISON MODAL (0–40 Acertos vs Corte)
   CRÍTICO: NUNCA calcula nota de redação.
═══════════════════════════════════════════════════ */
async function showResultModal() {
  const overlay = $('#result-overlay');
  if (!overlay) return;

  // Load notas if not yet loaded
  if (!State.notasData) {
    await loadNotasData(true);
  }

  // Calculate score in current set (capped at 40)
  const pool = State.simuladoMode ? State.simuladoQuestions : State.questions;
  const correctCount = Math.min(40, pool.filter(q => State.questionStates[q.id]?.correct).length);

  const numEl = $('#result-score-number');
  if (numEl) numEl.textContent = correctCount;

  renderResultComparison(correctCount);

  $('#result-course-select')?.addEventListener('change', () => {
    renderResultComparison(correctCount);
  });

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');

  $('#result-close')?.addEventListener('click', hideResultModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideResultModal();
  });
}

function hideResultModal() {
  const overlay = $('#result-overlay');
  if (overlay) {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function renderResultComparison(correctCount) {
  if (!State.notasData || !State.notasData.cursos) return;
  const grid = $('#result-comparison-grid');
  if (!grid) return;

  const selectedCourse = ($('#result-course-select')?.value || 'ADS').toUpperCase();
  const cursoData = State.notasData.cursos[selectedCourse] || State.notasData.cursos['ADS'];
  if (!cursoData) return;

  grid.innerHTML = '';

  cursoData.historico.forEach(h => {
    const pc = h.primeira_chamada;
    const uc = h.ultima_chamada;

    const passFirstMin = pc.ultimo_lugar_chamada.acertos;
    const passLastMin  = uc ? uc.ultimo_convocado.acertos : passFirstMin;

    const passFirst = correctCount >= passFirstMin;
    const passLast  = correctCount >= passLastMin;

    const card = el('div', { className: 'comparison-card' });

    const edicaoBar = el('div', { className: 'comparison-edicao' });
    edicaoBar.innerHTML = `<span>📅 Vestibular ${h.edicao}</span><span style="font-size:.75rem;color:var(--text-muted)">${cursoData.nome} (${h.vagas} vagas)</span>`;
    card.appendChild(edicaoBar);

    const calls = el('div', { className: 'comparison-calls' });

    // Primeira Chamada
    const firstCall = el('div', { className: 'comparison-call' });
    firstCall.innerHTML = `
      <div class="call-label">${pc.faixa}</div>
      <div class="call-result ${passFirst ? 'pass' : 'fail'}">${passFirst ? '✅ PASSARIA' : '❌ NÃO PASSARIA'}</div>
      <div class="call-detail">
        Corte: <strong>${passFirstMin} acertos</strong><br>
        <span style="opacity:.7;font-size:.75rem">1º Lugar: ${pc.primeiro_lugar.acertos} acertos (nota ${pc.primeiro_lugar.nota_final.toFixed(2)})<br>Ref. Redação: ${pc.ultimo_lugar_chamada.redacao_referencia.toFixed(1)}</span>
      </div>`;

    // Última Chamada
    const lastCall = el('div', { className: 'comparison-call' });
    if (uc) {
      lastCall.innerHTML = `
        <div class="call-label chamada-label ultima">${uc.nome_chamada} (${uc.faixa})</div>
        <div class="call-result ${passLast ? 'pass' : 'fail'}">${passLast ? '✅ PASSARIA' : '❌ NÃO PASSARIA'}</div>
        <div class="call-detail">
          Corte final: <strong>${passLastMin} acertos</strong><br>
          <span style="opacity:.7;font-size:.75rem">Nota final: ${uc.ultimo_convocado.nota_final.toFixed(2)}<br>Ref. Redação: ${uc.ultimo_convocado.redacao_referencia.toFixed(1)}</span>
        </div>`;
    } else {
      lastCall.innerHTML = `
        <div class="call-label chamada-label ultima">Chamada Única</div>
        <div class="call-result ${passFirst ? 'pass' : 'fail'}">${passFirst ? '✅ PASSARIA' : '❌ NÃO PASSARIA'}</div>
        <div class="call-detail">
          Vagas preenchidas integralmente na 1ª chamada.<br>
          <span style="opacity:.7;font-size:.75rem">Mínimo necessário: ${passFirstMin} acertos</span>
        </div>`;
    }

    calls.append(firstCall, lastCall);
    card.appendChild(calls);
    grid.appendChild(card);
  });
}

/* ═══════════════════════════════════════════════════
   12. REDAÇÃO TAB
═══════════════════════════════════════════════════ */
async function loadRedacaoData() {
  State.dataLoaded.redacao = true;
  const list = $('#redacao-list');
  if (!list) return;

  try {
    const res = await fetch('./data/banco_questoes/propostas_redacao_fmp.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    State.redacaoData = data;
    renderRedacao(data);
  } catch (err) {
    console.error('[FMP] Error loading redacao:', err);
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar propostas de redação.</p></div>`;
  }
}

function renderRedacao(data) {
  const list = $('#redacao-list');
  if (!list) return;
  list.innerHTML = '';

  const proposals = data.essay_proposals || [];

  proposals.forEach((item, idx) => {
    const itemEl = el('div', { className: 'redacao-accordion-item', id: `redacao-item-${item.id}` });
    itemEl.style.animationDelay = `${idx * 0.05}s`;

    // Persistência: recupera estado salvo
    const storageKey = `fmp_redacao_open_${item.id}`;
    const isSavedOpen = localStorage.getItem(storageKey) === 'true';
    if (isSavedOpen) {
      itemEl.classList.add('open');
    }

    // 1. Cabeçalho Interativo Compacto
    const header = el('div', {
      className: 'redacao-accordion-header',
      role: 'button',
      tabIndex: 0,
      id: `redacao-header-${item.id}`,
      'aria-expanded': isSavedOpen ? 'true' : 'false',
      'aria-controls': `redacao-content-${item.id}`
    });

    header.innerHTML = `
      <div class="redacao-header-top">
        <div class="redacao-badges">
          <span class="redacao-edicao">Vestibular ${item.exam}</span>
          <span class="exam-tag">${item.genre || 'Dissertativo-argumentativo'}</span>
          <span class="exam-tag" style="color:var(--accent-blue)">${item.min_lines || 10} a ${item.max_lines || 30} linhas</span>
        </div>
        <button class="redacao-toggle-btn" type="button" tabindex="-1" aria-hidden="true">
          <span class="toggle-text">${isSavedOpen ? 'Recolher' : 'Ver proposta completa'}</span>
          <span class="redacao-chevron">▼</span>
        </button>
      </div>
      <h3 class="redacao-theme-title">${item.theme}</h3>
    `;

    // 2. Conteúdo Colapsável
    const content = el('div', {
      className: 'redacao-accordion-content',
      id: `redacao-content-${item.id}`,
      role: 'region',
      'aria-labelledby': `redacao-header-${item.id}`
    });

    const inner = el('div', { className: 'redacao-accordion-inner' });

    // 2.1 Instruções Oficiais
    if (Array.isArray(item.instructions) && item.instructions.length > 0) {
      const instrucoes = el('div', { className: 'redacao-instrucoes' });
      instrucoes.innerHTML = '<h3>Instruções Oficiais</h3>';
      const instrList = el('ul', { className: 'instrucoes-list' });
      item.instructions.forEach(i => {
        instrList.appendChild(el('li', {}, i));
      });
      instrucoes.appendChild(instrList);
      inner.appendChild(instrucoes);
    }

    // 2.2 Textos Motivadores
    if (Array.isArray(item.motivating_texts) && item.motivating_texts.length > 0) {
      const motivadores = el('div', { className: 'redacao-motivadores' });
      motivadores.innerHTML = '<h3>Textos Motivadores</h3>';
      const mGrid = el('div', { className: 'motivadores-grid' });

      item.motivating_texts.forEach(m => {
        const mCard = el('div', { className: 'motivador-card' });
        mCard.innerHTML = `
          <h4>${m.title || 'Texto de Apoio'}</h4>
          <p>${m.content || ''}</p>
          ${m.author ? `<span class="motivador-fonte">Fonte / Autor: ${m.author}</span>` : ''}
        `;
        mGrid.appendChild(mCard);
      });
      motivadores.appendChild(mGrid);
      inner.appendChild(motivadores);
    }

    // 2.3 Botão Funcional: Iniciar Rascunho
    const draftActionWrap = el('div', { style: 'padding: 0.75rem 1.5rem 0.25rem;' });
    const btnDraft = el('button', {
      className: 'btn-start-draft',
      type: 'button',
      style: 'margin: 0;'
    }, '✍️ Iniciar Rascunho neste Tema');
    draftActionWrap.appendChild(btnDraft);
    inner.appendChild(draftActionWrap);

    // 2.4 Workspace Interativo de Rascunho
    const workspace = el('div', { className: 'redacao-workspace' });
    workspace.innerHTML = `
      <div class="workspace-header">
        <span class="workspace-title">✍️ Espaço de Rascunho Oficial</span>
        <div class="workspace-stats">
          <span class="counter-badge" id="lines-badge-${item.id}">0 linhas</span>
          <span class="counter-badge" id="words-badge-${item.id}">0 palavras</span>
        </div>
      </div>
      <textarea class="redacao-textarea" id="textarea-${item.id}" placeholder="Escreva seu texto dissertativo-argumentativo aqui (mínimo ${item.min_lines || 10}, máximo ${item.max_lines || 30} linhas)..."></textarea>
      <div class="workspace-actions">
        <button class="btn-copy-essay" id="btn-copy-${item.id}">📋 Copiar Redação</button>
      </div>
    `;

    const textarea = workspace.querySelector(`#textarea-${item.id}`);
    const linesBadge = workspace.querySelector(`#lines-badge-${item.id}`);
    const wordsBadge = workspace.querySelector(`#words-badge-${item.id}`);
    const copyBtn = workspace.querySelector(`#btn-copy-${item.id}`);

    // Restaura rascunho salvo do localStorage
    const savedDraft = localStorage.getItem(`fmp_draft_${item.id}`);
    if (savedDraft && textarea) {
      textarea.value = savedDraft;
      updateTextareaCounts(textarea.value, item, linesBadge, wordsBadge);
    }

    textarea?.addEventListener('input', () => {
      const val = textarea.value;
      localStorage.setItem(`fmp_draft_${item.id}`, val);
      updateTextareaCounts(val, item, linesBadge, wordsBadge);
    });

    copyBtn?.addEventListener('click', () => {
      if (!textarea?.value.trim()) {
        showToast('Nenhum texto digitado para copiar.', 'error');
        return;
      }
      navigator.clipboard.writeText(textarea.value).then(() => {
        showToast('Redação copiada para a área de transferência! 📋', 'success');
      }).catch(() => {
        showToast('Não foi possível copiar o texto.', 'error');
      });
    });

    inner.appendChild(workspace);
    content.appendChild(inner);
    itemEl.appendChild(header);
    itemEl.appendChild(content);
    list.appendChild(itemEl);

    // Toggle de expansão/colapso
    const toggleAccordion = () => {
      const isOpen = itemEl.classList.toggle('open');
      header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const toggleText = header.querySelector('.toggle-text');
      if (toggleText) toggleText.textContent = isOpen ? 'Recolher' : 'Ver proposta completa';
      try {
        localStorage.setItem(storageKey, isOpen ? 'true' : 'false');
      } catch (err) {}
    };

    header.addEventListener('click', () => {
      toggleAccordion();
    });

    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAccordion();
      }
    });

    // Ação de iniciar rascunho
    btnDraft.addEventListener('click', () => {
      if (!itemEl.classList.contains('open')) {
        toggleAccordion();
      }
      setTimeout(() => {
        if (textarea) {
          textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          textarea.focus();
          showToast('✍️ Espaço de rascunho focado! Bom treino.');
        }
      }, 100);
    });
  });
}

function updateTextareaCounts(val, item, linesBadge, wordsBadge) {
  const minLines = item.min_lines || 10;
  const maxLines = item.max_lines || 30;

  const lines = val ? val.split('\n').filter(l => l.trim().length > 0).length : 0;
  const words = val.trim() ? val.trim().split(/\s+/).length : 0;

  if (linesBadge) {
    linesBadge.textContent = `${lines} linha${lines === 1 ? '' : 's'}`;
    const isValid = lines >= minLines && lines <= maxLines;
    linesBadge.className = `counter-badge ${isValid ? 'valid' : lines > maxLines ? 'invalid' : ''}`;
  }
  if (wordsBadge) {
    wordsBadge.textContent = `${words} palavra${words === 1 ? '' : 's'}`;
  }
}

/* ═══════════════════════════════════════════════════
   13. NOTAS DE CORTE TAB
═══════════════════════════════════════════════════ */
async function loadNotasData(silent = false) {
  State.dataLoaded.notas = true;
  const grid = $('#notas-grid');

  try {
    const res = await fetch('./data/notas/notas_vestibulares.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    State.notasData = data;
    if (!silent) {
      renderNotas(data, 'all');
      initNotasFilters();
    }
  } catch (err) {
    console.error('[FMP] Error loading notas:', err);
    if (!silent && grid) {
      grid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar notas de corte.</p></div>`;
    }
  }
}

function initNotasFilters() {
  $$('#notas-course-btns .course-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#notas-course-btns .course-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotas(State.notasData, btn.dataset.course);
    });
  });
}

function renderNotas(data, courseFilter) {
  const grid = $('#notas-grid');
  if (!grid || !data.cursos) return;
  grid.innerHTML = '';

  const allKeys = ['ADS', 'TPG', 'ADM', 'PEDAGOGIA'];
  const filterKey = courseFilter ? courseFilter.toUpperCase() : 'ALL';
  const selectedKeys = filterKey === 'ALL' ? allKeys : [filterKey];

  const editions = ['2026/2', '2026/1', '2025/2', '2025/1', '2024/2'];

  editions.forEach((edicao, idx) => {
    // Calcula totais de vagas e cursos disponíveis nesta edição
    let totalVagasEdicao = 0;
    let validCoursesCount = 0;

    selectedKeys.forEach(ck => {
      const c = data.cursos[ck];
      if (!c) return;
      const hist = c.historico.find(h => h.edicao === edicao);
      if (hist) {
        totalVagasEdicao += hist.vagas;
        validCoursesCount++;
      }
    });

    if (validCoursesCount === 0) return;

    // Nível 1: Accordion de Edição
    const edicaoAccordion = el('div', {
      className: 'notas-edicao-accordion',
      id: `notas-edicao-${edicao.replace('/', '-')}`
    });
    edicaoAccordion.style.animationDelay = `${idx * 0.05}s`;

    // A edição mais recente (2026/2) vem expandida por padrão, ou recupera do localStorage
    const storageKey = `fmp_notas_open_${edicao}`;
    const savedState = localStorage.getItem(storageKey);
    const isOpen = savedState !== null ? savedState === 'true' : edicao === '2026/2';

    if (isOpen) {
      edicaoAccordion.classList.add('open');
    }

    const trigger = el('button', {
      className: 'notas-edicao-trigger',
      type: 'button',
      'aria-expanded': isOpen ? 'true' : 'false',
      'aria-controls': `notas-content-${edicao.replace('/', '-')}`,
      id: `notas-trigger-${edicao.replace('/', '-')}`
    });

    trigger.innerHTML = `
      <div class="notas-edicao-trigger-left">
        <span class="notas-edicao-title">📅 Vestibular ${edicao}</span>
        <span class="notas-edicao-badge">🪑 ${totalVagasEdicao} Vagas Totais</span>
        <span class="notas-edicao-badge">📚 ${validCoursesCount} Curso(s) Ofertados</span>
      </div>
      <span class="notas-chevron">▼</span>
    `;

    const content = el('div', {
      className: 'notas-edicao-content',
      id: `notas-content-${edicao.replace('/', '-')}`,
      role: 'region',
      'aria-labelledby': `notas-trigger-${edicao.replace('/', '-')}`
    });

    const inner = el('div', { className: 'notas-edicao-inner' });

    // Nível 2: Renderiza Cartões de Cursos em Tabela KPI
    selectedKeys.forEach(ck => {
      const c = data.cursos[ck];
      if (!c) return;

      const hist = c.historico.find(h => h.edicao === edicao);
      if (!hist) return;

      const pc = hist.primeira_chamada;
      const uc = hist.ultima_chamada;

      const kpiCard = el('div', { className: 'notas-kpi-card' });

      // Cabeçalho do Curso
      const kpiHeader = el('div', { className: 'notas-kpi-header' });
      kpiHeader.innerHTML = `
        <div class="notas-kpi-curso">🎓 ${c.nome} (${ck})</div>
        <div class="notas-kpi-vagas">🪑 ${hist.vagas} Vagas</div>
      `;
      kpiCard.appendChild(kpiHeader);

      // Tabela Comparativa em Tabela KPI
      const tableWrap = el('div', { className: 'notas-kpi-table-wrap' });
      const table = el('table', {
        className: 'notas-kpi-table',
        'aria-label': `Notas de corte para ${c.nome} - Vestibular ${edicao}`
      });

      table.innerHTML = `
        <thead>
          <tr>
            <th scope="col">Métrica / Convocação</th>
            <th scope="col">Acertos (0–40)</th>
            <th scope="col">Nota Redação</th>
            <th scope="col">Pontuação Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="kpi-row-label">
                <span class="kpi-badge first-place">🥇 1º Lugar</span>
                <span>Desempenho Máximo (${pc.primeiro_lugar.posicao})</span>
              </div>
            </td>
            <td><span class="kpi-pill acertos">${pc.primeiro_lugar.acertos}</span></td>
            <td><span class="kpi-pill redacao">${pc.primeiro_lugar.redacao_referencia.toFixed(1)}</span></td>
            <td><span class="kpi-pill total">${pc.primeiro_lugar.nota_final.toFixed(2)}</span></td>
          </tr>
          <tr>
            <td>
              <div class="kpi-row-label">
                <span class="kpi-badge first-call">🎯 1ª Chamada</span>
                <span>Corte Direto (${pc.ultimo_lugar_chamada.posicao})</span>
              </div>
            </td>
            <td><span class="kpi-pill acertos">${pc.ultimo_lugar_chamada.acertos}</span></td>
            <td><span class="kpi-pill redacao">${pc.ultimo_lugar_chamada.redacao_referencia.toFixed(1)}</span></td>
            <td><span class="kpi-pill total">${pc.ultimo_lugar_chamada.nota_final.toFixed(2)}</span></td>
          </tr>
          ${uc ? `
          <tr>
            <td>
              <div class="kpi-row-label">
                <span class="kpi-badge last-call">🚩 ${uc.nome_chamada}</span>
                <span>Último Convocado (${uc.ultimo_convocado.posicao})</span>
              </div>
            </td>
            <td><span class="kpi-pill acertos">${uc.ultimo_convocado.acertos}</span></td>
            <td><span class="kpi-pill redacao">${uc.ultimo_convocado.redacao_referencia.toFixed(1)}</span></td>
            <td><span class="kpi-pill total">${uc.ultimo_convocado.nota_final.toFixed(2)}</span></td>
          </tr>
          ` : ''}
        </tbody>
      `;
      tableWrap.appendChild(table);
      kpiCard.appendChild(tableWrap);

      // Alerta informativo quando 100% preenchido na 1ª chamada
      if (!uc) {
        const singleCallAlert = el('div', { className: 'kpi-alert-single' });
        singleCallAlert.innerHTML = `
          <span>ℹ️</span>
          <span>Vagas preenchidas integralmente na 1ª chamada. Não houve convocação de chamadas complementares para este curso nesta edição.</span>
        `;
        kpiCard.appendChild(singleCallAlert);
      }

      inner.appendChild(kpiCard);
    });

    content.appendChild(inner);
    edicaoAccordion.appendChild(trigger);
    edicaoAccordion.appendChild(content);
    grid.appendChild(edicaoAccordion);

    // Toggle do Nível 1
    trigger.addEventListener('click', () => {
      const openNow = edicaoAccordion.classList.toggle('open');
      trigger.setAttribute('aria-expanded', openNow ? 'true' : 'false');
      try {
        localStorage.setItem(storageKey, openNow ? 'true' : 'false');
      } catch (err) {}
    });
  });
}

/* ═══════════════════════════════════════════════════
   14. LIGHTBOX VISUALIZADOR DE IMAGENS & MAPAS
═══════════════════════════════════════════════════ */
let currentLightboxZoom = 1;

function initLightbox() {
  const overlay = $('#lightbox-overlay');
  if (!overlay) return;

  // Delegação de evento para cliques em imagens com lightbox-trigger
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.lightbox-trigger');
    if (trigger) {
      e.preventDefault();
      const src = trigger.getAttribute('src');
      const caption = trigger.getAttribute('data-caption') || trigger.getAttribute('alt') || 'Mapa das Praias de Palhoça';
      openLightbox(src, caption);
    }
  });

  // Fechar no botão ✕
  $('#lightbox-close')?.addEventListener('click', closeLightbox);

  // Fechar ao clicar fora da imagem
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'lightbox-view') {
      closeLightbox();
    }
  });

  // Ferramentas de zoom
  $('#lightbox-zoom-in')?.addEventListener('click', () => adjustLightboxZoom(0.25));
  $('#lightbox-zoom-out')?.addEventListener('click', () => adjustLightboxZoom(-0.25));
  $('#lightbox-zoom-reset')?.addEventListener('click', () => setLightboxZoom(1));
}

function openLightbox(src, caption) {
  const overlay = $('#lightbox-overlay');
  const img = $('#lightbox-img');
  const captionEl = $('#lightbox-caption');
  const externalLink = $('#lightbox-external');
  if (!overlay || !img) return;

  setLightboxZoom(1);
  img.src = src;
  img.alt = caption;
  if (captionEl) captionEl.textContent = caption;
  if (externalLink) externalLink.href = src;

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeLightbox() {
  const overlay = $('#lightbox-overlay');
  if (overlay) {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    setLightboxZoom(1);
  }
}

function setLightboxZoom(scale) {
  currentLightboxZoom = Math.min(3, Math.max(0.5, scale));
  const img = $('#lightbox-img');
  if (img) {
    img.style.transform = `scale(${currentLightboxZoom})`;
  }
}

function adjustLightboxZoom(delta) {
  setLightboxZoom(currentLightboxZoom + delta);
}

/* ═══════════════════════════════════════════════════
   15. KEYBOARD SHORTCUTS
═══════════════════════════════════════════════════ */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Tecla Escape fecha modais ativos
    if (e.key === 'Escape') {
      const resultOverlay = $('#result-overlay');
      if (resultOverlay && !resultOverlay.hidden) hideResultModal();

      const lightboxOverlay = $('#lightbox-overlay');
      if (lightboxOverlay && !lightboxOverlay.hidden) closeLightbox();
    }
    // Ctrl/Cmd+T: Alterna tema
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      toggleTheme();
    }
  });
}

/* ═══════════════════════════════════════════════════
   16. INITIALIZATION
═══════════════════════════════════════════════════ */
function init() {
  initTheme();
  initFontSize();
  initTabs();
  initAccordion();
  initSearch();
  initLightbox();
  initKeyboardShortcuts();

  // Header controls
  $('#theme-toggle')?.addEventListener('click', toggleTheme);
  $('#font-decrease')?.addEventListener('click', () => applyFontSize(State.fontSize - 1));
  $('#font-increase')?.addEventListener('click', () => applyFontSize(State.fontSize + 1));

  // If initial tab is not estudar, load appropriately
  if (State.activeTab === 'praticar') loadPracticeData();

  console.log('[FMP] Plataforma de Estudos inicializada com sucesso! ✅');
}

// Auto-run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
