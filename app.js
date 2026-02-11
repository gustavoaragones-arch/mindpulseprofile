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

    var archetypes = [
      { O: 1, pattern: 1, name: 'Explorer-Connector', descriptor: 'High curiosity and pattern-focused thinking.' },
      { O: 1, verbal: 1, name: 'Idea-Weaver', descriptor: 'Curiosity-driven with a strong verbal framing style.' },
      { O: 1, strategic: 1, name: 'Open Strategist', descriptor: 'Curious and comfortable with incomplete information.' },
      { C: 1, pattern: 1, name: 'Structured Analyst', descriptor: 'Disciplined with a preference for patterns and order.' },
      { C: 1, verbal: 1, name: 'Clear Executor', descriptor: 'Disciplined and articulate about plans and feedback.' },
      { C: 1, strategic: 1, name: 'Planned Navigator', descriptor: 'Disciplined and strategic in approach.' },
      { E: 1, pattern: 1, name: 'Social Pattern-Reader', descriptor: 'High social energy and pattern awareness.' },
      { E: 1, verbal: 1, name: 'Collaborative Communicator', descriptor: 'Social energy with strong verbal framing.' },
      { E: 1, strategic: 1, name: 'Group Strategist', descriptor: 'Social and comfortable leading with a plan.' },
      { A: 1, pattern: 1, name: 'Cooperative Synthesizer', descriptor: 'Cooperative and drawn to connections.' },
      { A: 1, verbal: 1, name: 'Bridge-Builder', descriptor: 'Cooperative and skilled at clarifying with words.' },
      { A: 1, strategic: 1, name: 'Team Navigator', descriptor: 'Cooperative and strategic in group settings.' },
      { N: 1, pattern: 1, name: 'Reflective Noticer', descriptor: 'Emotionally tuned in and pattern-aware.' },
      { N: 1, verbal: 1, name: 'Considered Communicator', descriptor: 'Reflective and careful with language.' },
      { N: 1, strategic: 1, name: 'Calm Planner', descriptor: 'Reflective and strategic under uncertainty.' }
    ];

    for (var i = 0; i < archetypes.length; i++) {
      var arch = archetypes[i];
      if (arch[topTrait] && arch[topAxis]) return { name: arch.name, descriptor: arch.descriptor };
    }

    return { name: labels[topTrait] + '–' + labels[topAxis], descriptor: 'Your profile leans toward these dimensions.' };
  }

  /**
   * Short 2–3 sentence summary of personality + cognitive style.
   */
  function getResultSummary(personality, cognitive) {
    var topTrait = 'O';
    var topAxis = 'pattern';
    ['O', 'C', 'E', 'A', 'N'].forEach(function (t) {
      if (personality[t] > personality[topTrait]) topTrait = t;
    });
    ['pattern', 'verbal', 'strategic'].forEach(function (a) {
      if (cognitive[a] > cognitive[topAxis]) topAxis = a;
    });
    var traitLabels = { O: 'curiosity', C: 'discipline', E: 'social energy', A: 'cooperation', N: 'emotional awareness' };
    var axisLabels = { pattern: 'pattern and structure', verbal: 'clear verbal framing', strategic: 'strategic thinking' };
    var first = 'Your personality snapshot leans toward ' + traitLabels[topTrait] + ', with a cognitive style that favors ' + axisLabels[topAxis] + '.';
    var second = 'This is a practical snapshot, not a label or diagnosis — use it as a starting point for reflection.';
    return first + ' ' + second;
  }

  /**
   * One-sentence interpretation per trait (O, C, E, A, N).
   */
  function getTraitSummaries(personality) {
    var sentence = function (t, high, mid, low) {
      var v = personality[t] != null ? personality[t] : 50;
      if (v >= 67) return high;
      if (v >= 34) return mid;
      return low;
    };
    return {
      O: sentence('O', 'You\'re drawn to new ideas and open-ended exploration.', 'You balance curiosity with a need for some structure.', 'You tend to prefer familiar approaches and clear boundaries.'),
      C: sentence('C', 'You prefer clear plans, deadlines, and finishing one thing before the next.', 'You mix structure with flexibility depending on the task.', 'You work well with open-ended timelines and shifting priorities.'),
      E: sentence('E', 'You gain energy from groups and leading discussion.', 'You move between solo focus and collaboration as needed.', 'You prefer a few close collaborators or quiet focus.'),
      A: sentence('A', 'You naturally build on others\' ideas and consider how decisions affect people.', 'You cooperate when it fits the goal and step back when not.', 'You tend to focus on the task first and relationships second.'),
      N: sentence('N', 'You notice tone and emotional undercurrents and reflect before responding.', 'You balance reflection with action depending on the situation.', 'You tend to stay even-keel and task-focused under pressure.')
    };
  }

  /**
   * Full scoring pipeline. Returns structured result. No storage or network.
   */
  function runScoring(answers) {
    if (!answers || answers.length < PERSONALITY_COUNT + COGNITIVE_COUNT) {
      return {
        personality: { O: 50, C: 50, E: 50, A: 50, N: 50 },
        cognitive: { pattern: 50, verbal: 50, strategic: 50 },
        archetype: { name: 'Incomplete', descriptor: 'Complete all 45 questions for your full snapshot.' },
        summary: 'Your results will appear here after you finish the quiz.',
        traitSummaries: { O: '', C: '', E: '', A: '', N: '' },
        cognitiveExplanations: { pattern: '', verbal: '', strategic: '' },
        workStyleModules: { decisionStyle: '', collaborationPreference: '', learningMode: '', problemSolvingApproach: '' },
        growthEdges: []
      };
    }

    var personality = computePersonality(answers);
    var cognitive = computeCognitive(answers);
    var adjusted = consistencyAdjustment(personality, cognitive);
    var archetype = getArchetype(adjusted.personality, adjusted.cognitive);
    var summary = getResultSummary(adjusted.personality, adjusted.cognitive);
    var traitSummaries = getTraitSummaries(adjusted.personality);

    var cognitiveExplanations = getCognitiveExplanations(adjusted.cognitive);
    var workStyleModules = getWorkStyleModules(adjusted.personality, adjusted.cognitive);
    var growthEdges = getGrowthEdges(adjusted.personality, adjusted.cognitive);

    return {
      personality: adjusted.personality,
      cognitive: adjusted.cognitive,
      archetype: archetype,
      summary: summary,
      traitSummaries: traitSummaries,
      cognitiveExplanations: cognitiveExplanations,
      workStyleModules: workStyleModules,
      growthEdges: growthEdges
    };
  }

  /**
   * 2–3 sentence explanation per cognitive axis. Thinking style only; no IQ, percentile, or "above average" language.
   */
  function getCognitiveExplanations(cognitive) {
    var level = function (v) {
      if (v == null) return 'mid';
      if (v >= 67) return 'high';
      if (v >= 34) return 'mid';
      return 'low';
    };
    var patternLevel = level(cognitive.pattern);
    var verbalLevel = level(cognitive.verbal);
    var strategicLevel = level(cognitive.strategic);

    var pattern = {
      high: 'You tend to notice patterns, connections, and structure in information. Your thinking style leans toward organizing ideas into systems and seeing how parts relate. This can support problem-solving and learning in areas where order and consistency matter.',
      mid: 'You use both pattern-focused and more open-ended thinking depending on the context. Sometimes you rely on structure and connections; other times you prefer to stay flexible. Your thinking style adapts to the task.',
      low: 'You often prefer to work with ideas in a more fluid way rather than emphasizing structure or patterns. You may focus on the big picture or on relationships that aren\'t strictly systematic. Your thinking style tends toward flexibility over fixed frameworks.'
    };
    var verbal = {
      high: 'You tend to think and communicate in clear, articulated terms. Words and precise phrasing matter to how you process and share ideas. Your thinking style is well-suited to explaining, clarifying, and refining concepts through language.',
      mid: 'You move between verbal clarity and other ways of processing—sometimes you rely on words and definitions, other times on examples or intuition. Your thinking style blends language with other modes of understanding.',
      low: 'You often process ideas in ways that don\'t depend heavily on words—through images, patterns, or action. You may prefer doing or seeing to lengthy explanation. Your thinking style favors practical or visual understanding over verbal framing.'
    };
    var strategic = {
      high: 'You tend to think ahead, weigh options, and plan before acting. Your thinking style supports decisions under uncertainty and longer-term coordination. You\'re comfortable with incomplete information when you can still map a path.',
      mid: 'You balance planning with responsiveness—sometimes you strategize, sometimes you adapt in the moment. Your thinking style shifts between structure and flexibility depending on the situation.',
      low: 'You often prefer to respond to situations as they unfold rather than planning far ahead. Your thinking style is more reactive and in-the-moment, which can suit fast-changing or exploratory contexts.'
    };

    return {
      pattern: pattern[patternLevel],
      verbal: verbal[verbalLevel],
      strategic: strategic[strategicLevel]
    };
  }

  /**
   * Work & Learning Style: four bullet modules derived from trait combinations.
   * Short paragraphs only (no more than 3 lines each).
   */
  function getWorkStyleModules(personality, cognitive) {
    var p = personality || {};
    var c = cognitive || {};
    var high = function (v) { return (v != null && v >= 60); };
    var low = function (v) { return (v != null && v < 40); };

    var decisionStyle = high(p.C) && high(c.strategic)
      ? 'You prefer to weigh options and follow a plan once you\'ve decided. Your decisions tend to be deliberate and forward-looking.'
      : low(p.C) && low(c.strategic)
      ? 'You tend to decide in the moment and adjust as you go. Flexibility matters more to you than sticking to a fixed plan.'
      : 'You balance planning with adaptability—sometimes you decide ahead, sometimes you respond to what\'s in front of you.';

    var collaborationPreference = high(p.E) && high(p.A)
      ? 'You work best with others and like to build on shared ideas. Group discussion and collaboration energize you.'
      : low(p.E) || low(p.A)
      ? 'You prefer focused solo work or a small, trusted circle. You collaborate when it clearly serves the goal.'
      : 'You move between solo focus and collaboration depending on the task. You can lead discussion or work quietly as needed.';

    var learningMode = high(p.O) && high(c.pattern)
      ? 'You learn well when you can see connections and structure. You like to explore new topics through systems and patterns.'
      : high(p.O) && high(c.verbal)
      ? 'You learn by talking and reading. Clear explanations and dialogue help you lock in new ideas.'
      : low(p.O)
      ? 'You learn best with concrete examples and a clear goal. You prefer practical, step-by-step approaches over open-ended exploration.'
      : 'You learn in a mix of ways—sometimes by exploring, sometimes by following a clear path. Context usually dictates your mode.';

    var problemSolvingApproach = high(c.pattern) && high(p.C)
      ? 'You break problems into steps and look for patterns. You prefer order and a clear sequence before acting.'
      : high(c.strategic) && high(p.A)
      ? 'You consider how solutions affect others and plan ahead. You balance strategy with cooperation.'
      : low(c.pattern) && low(p.C)
      ? 'You tackle problems in a fluid way, often trying things out rather than mapping everything first.'
      : 'You adapt your problem-solving to the situation—sometimes structured, sometimes trial-and-error.';

    return {
      decisionStyle: decisionStyle,
      collaborationPreference: collaborationPreference,
      learningMode: learningMode,
      problemSolvingApproach: problemSolvingApproach
    };
  }

  /**
   * Growth Edges: 2–3 dimensions with Strength + Watch for. Neutral and constructive tone.
   */
  function getGrowthEdges(personality, cognitive) {
    var p = personality || {};
    var c = cognitive || {};
    var traits = ['O', 'C', 'E', 'A', 'N'];
    var traitLabels = { O: 'Curiosity', C: 'Discipline', E: 'Social Energy', A: 'Cooperation', N: 'Emotional Reactivity' };
    var axes = ['pattern', 'verbal', 'strategic'];
    var axisLabels = { pattern: 'Pattern Reasoning', verbal: 'Verbal Framing', strategic: 'Strategic Thinking' };

    var strengthWatch = {
      O: { strength: 'You\'re open to new ideas and comfortable with open-ended questions.', watchFor: 'Scattered focus when too many options are in play.' },
      C: { strength: 'You tend to follow through and prefer clear plans.', watchFor: 'Rigidity when circumstances change quickly.' },
      E: { strength: 'You bring energy to groups and can lead discussion.', watchFor: 'Taking on too much of the social load in teams.' },
      A: { strength: 'You consider others and build on shared ideas.', watchFor: 'Putting the group\'s preference ahead of your own when it matters.' },
      N: { strength: 'You notice tone and reflect before responding.', watchFor: 'Over-analysis in fast-moving situations.' },
      pattern: { strength: 'You see connections and structure in information.', watchFor: 'Over-relying on patterns when the situation is genuinely novel.' },
      verbal: { strength: 'You clarify and explain with words effectively.', watchFor: 'Assuming others need the same level of verbal detail.' },
      strategic: { strength: 'You think ahead and weigh options before acting.', watchFor: 'Delaying action while waiting for more clarity.' }
    };

    var scored = [];
    traits.forEach(function (t) {
      scored.push({ key: t, label: traitLabels[t], score: p[t] != null ? p[t] : 50, type: 'trait' });
    });
    axes.forEach(function (a) {
      scored.push({ key: a, label: axisLabels[a], score: c[a] != null ? c[a] : 50, type: 'axis' });
    });
    scored.sort(function (a, b) { return b.score - a.score; });

    var out = [];
    var seen = 0;
    for (var i = 0; i < scored.length && seen < 3; i++) {
      var item = scored[i];
      var sw = strengthWatch[item.key];
      if (sw) {
        out.push({ dimension: item.label, strength: sw.strength, watchFor: sw.watchFor });
        seen++;
      }
    }
    return out;
  }

  window.MPP_runScoring = runScoring;
  window.MPP_computePersonality = computePersonality;
  window.MPP_computeCognitive = computeCognitive;
})();
