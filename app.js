/* MindPulseProfile — Phase 1: Scoring engine. No storage, no analytics, no network. */
(function () {
  'use strict';

  var LIKERT_MIN = 1;
  var LIKERT_MAX = 5;
  var PERSONALITY_COUNT = 30;
  var COGNITIVE_COUNT = 15;
  var QUESTIONS_PER_TRAIT = 6;
  var QUESTIONS_PER_AXIS = 5;
  var CONSISTENCY_WEIGHT = 0.12; /* pull toward 50 */

  var personalityMap = window.MPP_PERSONALITY_MAP || [];
  var cognitiveMap = window.MPP_COGNITIVE_MAP || [];

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  function reverseScore(val) {
    return (LIKERT_MIN + LIKERT_MAX) - val;
  }

  /**
   * Personality: 30 Likert items, 6 per trait (O,C,E,A,N).
   * Raw sum per trait in [6, 30]. Normalize to 0–100%.
   */
  function computePersonality(answers) {
    var sums = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    var counts = { O: 0, C: 0, E: 0, A: 0, N: 0 };

    for (var i = 0; i < PERSONALITY_COUNT && i < answers.length; i++) {
      var raw = answers[i];
      if (raw == null || raw < LIKERT_MIN || raw > LIKERT_MAX) continue;
      var entry = personalityMap[i];
      if (!entry) continue;
      var score = entry.reverse ? reverseScore(raw) : raw;
      sums[entry.trait] += score;
      counts[entry.trait] += 1;
    }

    var out = {};
    var range = QUESTIONS_PER_TRAIT * (LIKERT_MAX - LIKERT_MIN);
    var minSum = QUESTIONS_PER_TRAIT * LIKERT_MIN;

    ['O', 'C', 'E', 'A', 'N'].forEach(function (t) {
      var n = counts[t] || 0;
      var sum = sums[t] || 0;
      if (n === 0) {
        out[t] = 50;
        return;
      }
      var rawPct = (sum - minSum) / (n * (LIKERT_MAX - LIKERT_MIN));
      out[t] = clamp(Math.round(rawPct * 100), 0, 100);
    });
    return out;
  }

  /**
   * Cognitive: 15 items, 5 per axis (pattern, verbal, strategic).
   * Same Likert scale; normalize to 0–100%. No IQ or single number.
   */
  function computeCognitive(answers) {
    var sums = { pattern: 0, verbal: 0, strategic: 0 };
    var counts = { pattern: 0, verbal: 0, strategic: 0 };
    var base = PERSONALITY_COUNT;

    for (var i = 0; i < COGNITIVE_COUNT; i++) {
      var idx = base + i;
      var raw = answers[idx];
      if (raw == null || raw < LIKERT_MIN || raw > LIKERT_MAX) continue;
      var entry = cognitiveMap[i];
      if (!entry) continue;
      sums[entry.axis] += raw;
      counts[entry.axis] += 1;
    }

    var out = {};
    var minSum = QUESTIONS_PER_AXIS * LIKERT_MIN;
    var range = QUESTIONS_PER_AXIS * (LIKERT_MAX - LIKERT_MIN);

    ['pattern', 'verbal', 'strategic'].forEach(function (axis) {
      var n = counts[axis] || 0;
      var sum = sums[axis] || 0;
      if (n === 0) {
        out[axis] = 50;
        return;
      }
      var rawPct = (sum - minSum) / (n * (LIKERT_MAX - LIKERT_MIN));
      out[axis] = clamp(Math.round(rawPct * 100), 0, 100);
    });
    return out;
  }

  /**
   * Slight pull toward 50 to avoid flat or extreme profiles.
   */
  function consistencyAdjustment(personality, cognitive) {
    var blend = function (v) {
      var v2 = v * (1 - CONSISTENCY_WEIGHT) + 50 * CONSISTENCY_WEIGHT;
      return Math.round(clamp(v2, 0, 100));
    };
    var pOut = {};
    ['O', 'C', 'E', 'A', 'N'].forEach(function (t) {
      pOut[t] = blend(personality[t]);
    });
    var cOut = {};
    ['pattern', 'verbal', 'strategic'].forEach(function (a) {
      cOut[a] = blend(cognitive[a]);
    });
    return { personality: pOut, cognitive: cOut };
  }

  /**
   * Archetype: single headline from top personality + top cognitive. 8–12 archetypes.
   */
  function getArchetype(personality, cognitive) {
    var traits = ['O', 'C', 'E', 'A', 'N'];
    var axes = ['pattern', 'verbal', 'strategic'];
    var labels = {
      O: 'Curiosity',
      C: 'Discipline',
      E: 'Social Energy',
      A: 'Cooperation',
      N: 'Emotional Reactivity',
      pattern: 'Pattern Reasoning',
      verbal: 'Verbal Framing',
      strategic: 'Strategic Thinking'
    };

    var topTrait = traits[0];
    var topAxis = axes[0];
    traits.forEach(function (t) {
      if (personality[t] > personality[topTrait]) topTrait = t;
    });
    axes.forEach(function (a) {
      if (cognitive[a] > cognitive[topAxis]) topAxis = a;
    });

    /* 15 archetypes (primary trait + primary cognitive axis): combinations of primary trait + primary cognitive axis */
    var archetypes = [
      { O: 1, pattern: 1, headline: 'Explorer-Connector — High curiosity and pattern-focused thinking.' },
      { O: 1, verbal: 1, headline: 'Idea-Weaver — Curiosity-driven with a strong verbal framing style.' },
      { O: 1, strategic: 1, headline: 'Open Strategist — Curious and comfortable with incomplete information.' },
      { C: 1, pattern: 1, headline: 'Structured Analyst — Disciplined with a preference for patterns and order.' },
      { C: 1, verbal: 1, headline: 'Clear Executor — Disciplined and articulate about plans and feedback.' },
      { C: 1, strategic: 1, headline: 'Planned Navigator — Disciplined and strategic in approach.' },
      { E: 1, pattern: 1, headline: 'Social Pattern-Reader — High social energy and pattern awareness.' },
      { E: 1, verbal: 1, headline: 'Collaborative Communicator — Social energy with strong verbal framing.' },
      { E: 1, strategic: 1, headline: 'Group Strategist — Social and comfortable leading with a plan.' },
      { A: 1, pattern: 1, headline: 'Cooperative Synthesizer — Cooperative and drawn to connections.' },
      { A: 1, verbal: 1, headline: 'Bridge-Builder — Cooperative and skilled at clarifying with words.' },
      { A: 1, strategic: 1, headline: 'Team Navigator — Cooperative and strategic in group settings.' },
      { N: 1, pattern: 1, headline: 'Reflective Noticer — Emotionally tuned in and pattern-aware.' },
      { N: 1, verbal: 1, headline: 'Considered Communicator — Reflective and careful with language.' },
      { N: 1, strategic: 1, headline: 'Calm Planner — Reflective and strategic under uncertainty.' }
    ];

    for (var i = 0; i < archetypes.length; i++) {
      var arch = archetypes[i];
      if (arch[topTrait] && arch[topAxis]) return arch.headline;
    }

    return labels[topTrait] + ' and ' + labels[topAxis] + ' — Your profile leans toward these dimensions.';
  }

  /**
   * Full scoring pipeline. Returns structured result. No storage or network.
   */
  function runScoring(answers) {
    if (!answers || answers.length < PERSONALITY_COUNT + COGNITIVE_COUNT) {
      return {
        personality: { O: 50, C: 50, E: 50, A: 50, N: 50 },
        cognitive: { pattern: 50, verbal: 50, strategic: 50 },
        archetype: 'Incomplete responses — complete all questions for a full snapshot.'
      };
    }

    var personality = computePersonality(answers);
    var cognitive = computeCognitive(answers);
    var adjusted = consistencyAdjustment(personality, cognitive);
    var archetype = getArchetype(adjusted.personality, adjusted.cognitive);

    return {
      personality: adjusted.personality,
      cognitive: adjusted.cognitive,
      archetype: archetype
    };
  }

  window.MPP_runScoring = runScoring;
  window.MPP_computePersonality = computePersonality;
  window.MPP_computeCognitive = computeCognitive;
})();
