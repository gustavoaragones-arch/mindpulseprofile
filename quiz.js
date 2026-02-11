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

  function show(el) { if (el) el.classList.add('quiz-visible'); }
  function hide(el) { if (el) el.classList.remove('quiz-visible'); }
  function addClass(el, c) { if (el) el.classList.add(c); }
  function removeClass(el, c) { if (el) el.classList.remove(c); }

  function renderStart() {
    if (!container) return;
    container.innerHTML =
      '<div class="quiz-start quiz-visible" id="quiz-start">' +
        '<p class="quiz-start-text">45 short questions. One at a time. Your answers stay in your browser.</p>' +
        '<button type="button" class="cta quiz-cta" id="quiz-btn-begin">Begin the quiz</button>' +
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
      renderResultContent(el, result);
    } else {
      el.innerHTML =
        '<h3 class="quiz-results-title">Your profile</h3>' +
        '<p class="quiz-results-intro">Your full snapshot will appear here once the scoring engine is implemented.</p>' +
        '<ul class="quiz-results-modules"><li><strong>Personality Pulse</strong> — Placeholder</li><li><strong>Cognitive Strengths</strong> — Placeholder</li></ul>';
    }
    show(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderResultContent(el, result) {
    var p = result.personality;
    var c = result.cognitive;
    var traitLabels = { O: 'Curiosity', C: 'Discipline', E: 'Social Energy', A: 'Cooperation', N: 'Emotional Reactivity' };
    var axisLabels = { pattern: 'Pattern Reasoning', verbal: 'Verbal Framing', strategic: 'Strategic Thinking' };
    var html = '<h3 class="quiz-results-title">Your profile</h3>' +
      '<p class="quiz-results-archetype">' + escapeHtml(result.archetype || '') + '</p>' +
      '<section class="quiz-results-section" aria-labelledby="quiz-results-personality-head">' +
        '<h4 id="quiz-results-personality-head" class="quiz-results-head">Personality Pulse</h4>' +
        '<ul class="quiz-results-scores">';
    ['O', 'C', 'E', 'A', 'N'].forEach(function (t) {
      var v = p[t] != null ? p[t] : 0;
      html += '<li class="quiz-result-row"><span class="quiz-result-label">' + escapeHtml(traitLabels[t]) + '</span><div class="quiz-result-bar-wrap"><div class="quiz-result-bar" style="width:' + v + '%"></div></div><span class="quiz-result-pct">' + v + '%</span></li>';
    });
    html += '</ul></section>' +
      '<section class="quiz-results-section" aria-labelledby="quiz-results-cognitive-head">' +
        '<h4 id="quiz-results-cognitive-head" class="quiz-results-head">Cognitive Strengths</h4>' +
        '<ul class="quiz-results-scores">';
    ['pattern', 'verbal', 'strategic'].forEach(function (a) {
      var v = c[a] != null ? c[a] : 0;
      html += '<li class="quiz-result-row"><span class="quiz-result-label">' + escapeHtml(axisLabels[a]) + '</span><div class="quiz-result-bar-wrap"><div class="quiz-result-bar" style="width:' + v + '%"></div></div><span class="quiz-result-pct">' + v + '%</span></li>';
    });
    html += '</ul></section>';
    el.innerHTML = html;
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
