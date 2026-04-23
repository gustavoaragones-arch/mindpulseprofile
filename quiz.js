/* MindPulseProfile — Phase 0.5: Quiz UX mechanics. No scoring, no storage, no tracking. */
(function () {
  'use strict';

  var TOTAL = 45;
  var MOTIVATION_AT = [10, 20, 30, 40];
  var TEASER_AT = 20;
  var ANALYZING_DURATION_MS = 1800;

  var questions = window.MPP_QUESTIONS || [];
  var labels = window.MPP_RESPONSE_LABELS || [];
  var answers = [];
  var currentIndex = 0;
  var container = null;
  var progressFill = null;
  var progressText = null;
  var progressPct = null;
  var questionWrap = null;
  var layoutVariants = ['quiz-q-layout-a', 'quiz-q-layout-b', 'quiz-q-layout-c'];

  function byId(id) { return document.getElementById(id); }

  /** Spanish hub: show a one-line hint on results when quiz was entered from /es/ */
  var COGNITIVE_STYLE_ES_PATH = {
    analytical: 'analitico',
    creative: 'creativo',
    strategic: 'estrategico',
    intuitive: 'intuitivo'
  };

  function getSpanishResultsPathForCognitive(cognitive) {
    if (typeof window.MPP_getCognitiveStylePageKey !== 'function' || !cognitive) return '/es/resultados/intuitivo/';
    var key = window.MPP_getCognitiveStylePageKey(cognitive);
    var slug = COGNITIVE_STYLE_ES_PATH[key] || 'intuitivo';
    return '/es/resultados/' + slug + '/';
  }

  function maybeRedirectToSpanishResults(result) {
    if (!result || !result.cognitive) return false;
    try {
      if (localStorage.getItem('mpp_pref_results_lang') !== 'es') return false;
    } catch (e) {
      return false;
    }
    if (typeof window.MPP_getCognitiveStylePageKey !== 'function') return false;
    var key = window.MPP_getCognitiveStylePageKey(result.cognitive);
    var slug = COGNITIVE_STYLE_ES_PATH[key] || 'intuitivo';
    window.location.replace('/es/resultados/' + slug + '/');
    return true;
  }

  function shouldShowEsResultsBanner() {
    try {
      if (/[?&]from=es(?:&|#|$)/.test(window.location.search || '')) return true;
    } catch (e) {}
    try {
      var ref = document.referrer || '';
      if (/mindpulseprofile\.com\/es\//i.test(ref)) return true;
    } catch (e2) {}
    return false;
  }

  function spanishResultsBannerHtml() {
    if (!shouldShowEsResultsBanner()) return '';
    return '<aside class="quiz-results-es-banner" role="note"><p class="quiz-results-es-banner-text">Puedes traducir esta página automáticamente al español usando tu navegador.</p></aside>';
  }

  function show(el) { if (el) el.classList.add('quiz-visible'); }
  function hide(el) { if (el) el.classList.remove('quiz-visible'); }
  function addClass(el, c) { if (el) el.classList.add(c); }
  function removeClass(el, c) { if (el) el.classList.remove(c); }

  function renderStart() {
    if (!container) return;
    container.innerHTML =
      '<div class="quiz-start quiz-visible" id="quiz-start">' +
        '<p class="quiz-start-text">45 questions, one at a time.</p>' +
        '<button type="button" class="cta quiz-cta" id="quiz-btn-begin">Begin</button>' +
      '</div>';
    byId('quiz-btn-begin').addEventListener('click', beginQuiz);
  }

  function beginQuiz() {
    answers = [];
    currentIndex = 0;
    renderQuizShell();
    renderQuestion(0);
    container.querySelector('#quiz-start').classList.remove('quiz-visible');
    show(byId('quiz-progress-wrap'));
    show(byId('quiz-questions-wrap'));
    updateProgress(0);
    requestAnimationFrame(function () {
      questionWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderQuizShell() {
    if (!container) return;
    var startEl = container.querySelector('#quiz-start');
    container.innerHTML = '';
    if (startEl) container.appendChild(startEl);

    var progressHtml =
      '<div class="quiz-progress-wrap" id="quiz-progress-wrap" aria-hidden="true">' +
        '<div class="quiz-progress-bar" role="presentation">' +
          '<div class="quiz-progress-fill" id="quiz-progress-fill"></div>' +
        '</div>' +
        '<div class="quiz-progress-meta">' +
          '<span class="quiz-progress-count" id="quiz-progress-count">Question 1 of 45</span>' +
          '<span class="quiz-progress-pct" id="quiz-progress-pct" aria-hidden="true">2%</span>' +
        '</div>' +
      '</div>' +
      '<div class="quiz-questions-wrap" id="quiz-questions-wrap">' +
        '<div class="quiz-question-anchor" id="quiz-question-anchor"></div>' +
        '<div class="quiz-question-inner" id="quiz-question-inner"></div>' +
      '</div>' +
      '<div class="quiz-overlay quiz-motivation" id="quiz-motivation" aria-live="polite">' +
        '<div class="quiz-overlay-inner">' +
          '<p class="quiz-motivation-text" id="quiz-motivation-text"></p>' +
          '<button type="button" class="cta quiz-cta" id="quiz-btn-motivation">Continue</button>' +
        '</div>' +
      '</div>' +
      '<div class="quiz-overlay quiz-teaser" id="quiz-teaser" aria-live="polite">' +
        '<div class="quiz-overlay-inner quiz-teaser-inner">' +
          '<h3 class="quiz-teaser-title">Mid-quiz snapshot</h3>' +
          '<p class="quiz-teaser-lean" id="quiz-teaser-lean">Based on your answers so far, you show an early lean toward reflective, structured thinking.</p>' +
          '<p class="quiz-teaser-cognitive" id="quiz-teaser-cognitive">Your cognitive style so far suggests a preference for pattern and order — the full profile will refine this.</p>' +
          '<button type="button" class="cta quiz-cta" id="quiz-btn-teaser">Continue to remaining questions</button>' +
        '</div>' +
      '</div>' +
      '<div class="quiz-overlay quiz-analyzing" id="quiz-analyzing" aria-live="polite">' +
        '<div class="quiz-overlay-inner">' +
          '<p class="quiz-analyzing-text">Analyzing patterns…</p>' +
          '<div class="quiz-analyzing-dots" aria-hidden="true"><span></span><span></span><span></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="quiz-results-placeholder" id="quiz-results-placeholder">' +
        '<h3 class="quiz-results-title">Your profile</h3>' +
        '<p class="quiz-results-intro">Your full snapshot will appear here once the scoring engine is implemented. For now, this is a placeholder.</p>' +
        '<ul class="quiz-results-modules">' +
          '<li><strong>Personality Pulse</strong> — Placeholder</li>' +
          '<li><strong>Cognitive Strengths</strong> — Placeholder</li>' +
          '<li><strong>Work &amp; Learning Style</strong> — Placeholder</li>' +
          '<li><strong>Collaboration Tendencies</strong> — Placeholder</li>' +
        '</ul>' +
      '</div>';

    container.insertAdjacentHTML('beforeend', progressHtml);

    progressFill = byId('quiz-progress-fill');
    progressText = byId('quiz-progress-count');
    progressPct = byId('quiz-progress-pct');
    questionWrap = byId('quiz-question-inner');

    byId('quiz-btn-motivation').addEventListener('click', hideMotivationAndContinue);
    byId('quiz-btn-teaser').addEventListener('click', hideTeaserAndContinue);
  }

  function updateProgress(answeredCount) {
    var pct = Math.round((answeredCount / TOTAL) * 100);
    if (progressFill) {
      progressFill.style.width = pct + '%';
    }
    if (progressText) {
      var next = answeredCount + 1;
      progressText.textContent = 'Question ' + (next > TOTAL ? TOTAL : next) + ' of ' + TOTAL;
    }
    if (progressPct) {
      progressPct.textContent = pct + '%';
    }
  }

  function getMotivationMessage(at) {
    var messages = {
      10: "You're a quarter of the way through. Your pattern is taking shape.",
      20: "", // teaser shown instead
      30: "Most of the way there. Your responses are building a consistent picture.",
      40: "Almost done. A few more questions and you'll see your full snapshot."
    };
    return messages[at] || "";
  }

  function showMotivation(at) {
    var el = byId('quiz-motivation');
    var textEl = byId('quiz-motivation-text');
    if (!el || !textEl) return;
    textEl.textContent = getMotivationMessage(at);
    show(el);
  }

  function hideMotivationAndContinue() {
    hide(byId('quiz-motivation'));
    advanceToNext();
  }

  function showTeaser() {
    show(byId('quiz-teaser'));
  }

  function hideTeaserAndContinue() {
    hide(byId('quiz-teaser'));
    advanceToNext();
  }

  function showAnalyzing() {
    show(byId('quiz-analyzing'));
  }

  function showResults(result) {
    hide(byId('quiz-analyzing'));
    hide(byId('quiz-progress-wrap'));
    hide(byId('quiz-questions-wrap'));
    var el = byId('quiz-results-placeholder');
    if (result && result.personality && result.cognitive) {
      if (maybeRedirectToSpanishResults(result)) return;
      renderResultsPage(el, result);
    } else {
      el.innerHTML =
        '<section id="results">' +
          spanishResultsBannerHtml() +
          '<section class="result-hero"><div class="content-wrap"><p class="result-hero-text">Complete all 45 questions to see your full snapshot.</p></div></section>' +
          '<section class="personality-pulse"></section>' +
          '<section class="cognitive-strengths"></section>' +
          '<section class="work-style"></section>' +
          '<section class="growth-edges"></section>' +
          '<section class="share-block"></section>' +
          '<section class="pdf-teaser"></section>' +
          '<section class="results-disclaimer"><div class="content-wrap"><h3 class="results-disclaimer-title">About This Snapshot</h3><p class="results-disclaimer-text">This cognitive-style profile reflects response patterns within the MindPulseProfile framework. It does not diagnose, rank intelligence, or replace professional evaluation. Cognitive tendencies are contextual and may vary across environments.</p></div></section>' +
        '</section>';
    }
    show(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderResultsPage(el, result) {
    var p = result.personality;
    var c = result.cognitive;
    var traitLabels = { O: 'Curiosity', C: 'Discipline', E: 'Social Energy', A: 'Cooperation', N: 'Emotional Reactivity' };
    var axisLabels = { pattern: 'Pattern Reasoning', verbal: 'Verbal Framing', strategic: 'Strategic Thinking' };

    var arch = result.archetype;
    var archName = (arch && arch.name) ? arch.name : (typeof arch === 'string' ? arch.split(' — ')[0] || arch : '');
    var archDesc = (arch && arch.descriptor) ? arch.descriptor : (typeof arch === 'string' ? arch.split(' — ')[1] || '' : '');
    var summary = result.summary || '';

    var esResultsPath = getSpanishResultsPathForCognitive(c);
    var langSwitchHtml = '<p class="result-lang-switch"><a class="cta cta-secondary" href="' + escapeHtml(esResultsPath) + '">Ver en español</a> <span class="result-lang-switch-meta">Misma orientación, guía en español.</span></p>';

    var heroHtml = '<div class="content-wrap">' +
      '<h2 class="result-hero-title">You\'re a ' + escapeHtml(archName) + '</h2>' +
      '<p class="result-hero-subheading">' + escapeHtml(archDesc) + '</p>' +
      '<p class="result-hero-summary">' + escapeHtml(summary) + '</p>' +
      langSwitchHtml +
      '</div>';

    var traitSummaries = result.traitSummaries || {};
    var personalityHtml = '<div class="content-wrap">' +
      '<h2 class="results-section-title">Personality Pulse</h2>';
    ['O', 'C', 'E', 'A', 'N'].forEach(function (t) {
      var v = p[t] != null ? p[t] : 0;
      var summaryText = traitSummaries[t] || '';
      personalityHtml += '<div class="trait">' +
        '<label class="trait-label">' + escapeHtml(traitLabels[t]) + '</label>' +
        '<div class="bar"><div class="fill" style="width:0" data-width="' + v + '"></div></div>' +
        '<p class="trait-summary">' + escapeHtml(summaryText) + '</p>' +
        '</div>';
    });
    personalityHtml += '</div>';

    var cognitiveExplanations = result.cognitiveExplanations || {};
    var cognitiveHtml = '<div class="content-wrap"><h2 class="results-section-title">Cognitive Strengths</h2>';
    ['pattern', 'verbal', 'strategic'].forEach(function (a) {
      var v = c[a] != null ? c[a] : 0;
      var title = axisLabels[a];
      var explanation = cognitiveExplanations[a] || 'Your thinking style on this dimension is reflected in your responses.';
      cognitiveHtml += '<div class="cognitive-module">' +
        '<h3>' + escapeHtml(title) + '</h3>' +
        '<div class="bar"><div class="fill" style="width:0" data-width="' + v + '"></div></div>' +
        '<p>' + escapeHtml(explanation) + '</p>' +
        '</div>';
    });
    cognitiveHtml += '</div>';

    var workModules = result.workStyleModules || {};
    var workStyleHtml = '<div class="content-wrap"><h2 class="results-section-title">Work & Learning Style</h2><ul class="work-style-list">' +
      '<li class="work-style-module"><h3>Decision Style</h3><p>' + escapeHtml(workModules.decisionStyle || '') + '</p></li>' +
      '<li class="work-style-module"><h3>Collaboration Preference</h3><p>' + escapeHtml(workModules.collaborationPreference || '') + '</p></li>' +
      '<li class="work-style-module"><h3>Learning Mode</h3><p>' + escapeHtml(workModules.learningMode || '') + '</p></li>' +
      '<li class="work-style-module"><h3>Problem-Solving Approach</h3><p>' + escapeHtml(workModules.problemSolvingApproach || '') + '</p></li>' +
      '</ul></div>';
    var growthEdges = result.growthEdges || [];
    var growthHtml = '<div class="content-wrap"><h2 class="results-section-title">Growth Edges</h2>';
    growthEdges.forEach(function (edge) {
      growthHtml += '<div class="growth-edge">' +
        '<h3>' + escapeHtml(edge.dimension || 'Growth Edge') + '</h3>' +
        '<p><strong>Strength:</strong> ' + escapeHtml(edge.strength || '') + '</p>' +
        '<p><strong>Watch for:</strong> ' + escapeHtml(edge.watchFor || '') + '</p>' +
        '</div>';
    });
    if (growthEdges.length === 0) growthHtml += '<p class="results-body">Complete the quiz to see growth edges based on your profile.</p>';
    growthHtml += '</div>';

    var shareSummaryText = 'I just took MindPulseProfile and got ' + (archName || 'my snapshot') + '. Surprisingly accurate.';
    var shareHtml = '<div class="content-wrap">' +
      '<h3 class="share-block-title">Share Your Snapshot</h3>' +
      '<p class="share-summary-text">' + escapeHtml(shareSummaryText) + '</p>' +
      '<button type="button" class="cta share-copy-btn">Copy Summary</button>' +
      '</div>';
    var pdfHtml = '<div class="content-wrap"><h3 class="pdf-teaser-title">Download Your Profile</h3><p class="pdf-teaser-text">Get a clean, printable version of your snapshot.</p></div>';

    var snapshotHtml = '<div class="content-wrap">' +
      '<h3 class="results-disclaimer-title">About This Snapshot</h3>' +
      '<p class="results-disclaimer-text">This cognitive-style profile reflects response patterns within the MindPulseProfile framework. It does not diagnose, rank intelligence, or replace professional evaluation. Cognitive tendencies are contextual and may vary across environments.</p>' +
      '</div>';

    el.innerHTML =
      '<section id="results">' +
        spanishResultsBannerHtml() +
        '<section class="result-hero">' + heroHtml + '</section>' +
        '<section class="personality-pulse">' + personalityHtml + '</section>' +
        '<section class="cognitive-strengths">' + cognitiveHtml + '</section>' +
        '<section class="work-style">' + workStyleHtml + '</section>' +
        '<section class="growth-edges">' + growthHtml + '</section>' +
        '<section class="share-block">' + shareHtml + '</section>' +
        '<section class="pdf-teaser">' + pdfHtml + '</section>' +
        '<section class="results-disclaimer">' + snapshotHtml + '</section>' +
      '</section>';
    attachShareCopy(el);
    animateResultBars(el);
  }

  function animateResultBars(resultsContainer) {
    if (!resultsContainer) return;
    var fills = resultsContainer.querySelectorAll('.fill[data-width]');
    if (!fills.length) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (var i = 0; i < fills.length; i++) {
          var w = fills[i].getAttribute('data-width');
          if (w !== null) fills[i].style.width = w + '%';
        }
      });
    });
  }

  function attachShareCopy(resultsContainer) {
    var shareSection = resultsContainer && resultsContainer.querySelector('.share-block');
    if (!shareSection) return;
    var shareP = shareSection.querySelector('.share-summary-text');
    var copyBtn = shareSection.querySelector('.share-copy-btn');
    if (copyBtn && shareP) {
      copyBtn.addEventListener('click', function () {
        var text = shareP.textContent || '';
        if (typeof navigator.clipboard !== 'undefined' && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = 'Copied';
            setTimeout(function () { copyBtn.textContent = 'Copy Summary'; }, 2000);
          });
        }
      });
    }
  }

  function advanceToNext() {
    if (currentIndex >= TOTAL) {
      showAnalyzing();
      setTimeout(showResults, ANALYZING_DURATION_MS);
      return;
    }
    renderQuestion(currentIndex);
    questionWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderQuestion(index) {
    if (index >= TOTAL) return;
    var q = questions[index];
    if (!q) return;

    var layoutClass = layoutVariants[index % layoutVariants.length];
    var html = '<div class="quiz-q ' + layoutClass + ' quiz-q-enter" data-index="' + index + '">' +
      '<p class="quiz-q-text">' + escapeHtml(q.text) + '</p>' +
      '<fieldset class="quiz-q-options">' +
        '<legend class="quiz-sr">Choose your response</legend>';

    labels.forEach(function (label, i) {
      var val = i + 1;
      html += '<label class="quiz-option">' +
        '<input type="radio" name="quiz-q" value="' + val + '" data-index="' + index + '">' +
        '<span class="quiz-option-label">' + escapeHtml(label) + '</span>' +
      '</label>';
    });

    html += '</fieldset></div>';
    questionWrap.innerHTML = html;
    questionWrap.querySelectorAll('input[name="quiz-q"]').forEach(function (radio) {
      radio.addEventListener('change', onAnswer);
    });
    currentIndex = index;
    requestAnimationFrame(function () {
      var card = questionWrap.querySelector('.quiz-q');
      if (card) card.classList.remove('quiz-q-enter');
    });
  }

  function onAnswer(ev) {
    var input = ev.target;
    var index = parseInt(input.dataset.index, 10);
    var value = parseInt(input.value, 10);
    answers[index] = value;
    updateProgress(index + 1);

    var card = questionWrap.querySelector('.quiz-q');
    if (card) {
      card.classList.remove('quiz-q-enter');
      card.classList.add('quiz-q-leave');
    }

    setTimeout(function () {
      var nextIndex = index + 1;
      if (MOTIVATION_AT.indexOf(nextIndex) >= 0 && nextIndex !== TEASER_AT) {
        showMotivation(nextIndex);
        currentIndex = nextIndex;
        return;
      }
      if (nextIndex === TEASER_AT) {
        showTeaser();
        currentIndex = nextIndex;
        return;
      }
      if (nextIndex >= TOTAL) {
        showAnalyzing();
        var result = (typeof window.MPP_runScoring === 'function') ? window.MPP_runScoring(answers) : null;
        setTimeout(function () { showResults(result); }, ANALYZING_DURATION_MS);
        return;
      }
      renderQuestion(nextIndex);
      questionWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 280);
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function init() {
    container = byId('quiz-engine-placeholder');
    if (!container) return;
    if (!questions.length) {
      container.innerHTML = '<p class="placeholder-text">No questions loaded.</p>';
      return;
    }
    renderStart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
