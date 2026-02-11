/* MindPulseProfile — Phase 1: 30 personality + 15 cognitive questions with scoring maps */

window.MPP_QUESTIONS = [
  /* Personality 1–30 (Likert): O C E A N, 6 per trait */
  { id: 1,  text: "I prefer to think through a problem before talking about it." },
  { id: 2,  text: "I notice patterns in numbers or shapes quickly." },
  { id: 3,  text: "I'd rather work with a clear list of tasks than keep priorities in my head." },
  { id: 4,  text: "In meetings, I often think of the next point while others are speaking." },
  { id: 5,  text: "I learn best when I can try something hands-on." },
  { id: 6,  text: "I like to have a plan before starting a project." },
  { id: 7,  text: "I find it easy to put my thoughts into words." },
  { id: 8,  text: "I prefer a few close collaborators over a large group." },
  { id: 9,  text: "I often think in pictures or spatial relationships." },
  { id: 10, text: "I like to weigh pros and cons before deciding." },
  { id: 11, text: "I enjoy brainstorming without judging ideas at first." },
  { id: 12, text: "I prefer written instructions to verbal ones." },
  { id: 13, text: "I'm comfortable switching between tasks when needed." },
  { id: 14, text: "I like to see the big picture before diving into details." },
  { id: 15, text: "I tend to remember names and faces well." },
  { id: 16, text: "I work best when I have blocks of uninterrupted time." },
  { id: 17, text: "I often use analogies to explain things." },
  { id: 18, text: "I prefer to finish one thing before starting another." },
  { id: 19, text: "I notice when someone's tone doesn't match their words." },
  { id: 20, text: "I like to break complex problems into smaller steps." },
  { id: 21, text: "I'm comfortable with open-ended questions." },
  { id: 22, text: "I prefer to have deadlines to stay on track." },
  { id: 23, text: "I learn well from diagrams and charts." },
  { id: 24, text: "I like to discuss ideas with others to refine them." },
  { id: 25, text: "I tend to think about cause and effect." },
  { id: 26, text: "I prefer variety in my daily tasks." },
  { id: 27, text: "I remember facts and figures easily." },
  { id: 28, text: "I like to test an idea before fully committing." },
  { id: 29, text: "I'm good at keeping a conversation on topic." },
  { id: 30, text: "I prefer to focus on one role or goal at a time." },
  /* Cognitive 31–45: Pattern, Verbal, Strategic — 5 per axis */
  { id: 31, text: "I enjoy finding connections between different subjects." },
  { id: 32, text: "I like to have options rather than a single path." },
  { id: 33, text: "I think about how my decisions affect others." },
  { id: 34, text: "I prefer structured feedback to general comments." },
  { id: 35, text: "I'm comfortable making decisions with incomplete information." },
  { id: 36, text: "I like to organize information into categories." },
  { id: 37, text: "I prefer to lead the discussion in a group." },
  { id: 38, text: "I notice when something is out of place or inconsistent." },
  { id: 39, text: "I like to reflect before responding in a debate." },
  { id: 40, text: "I prefer to work in a quiet environment." },
  { id: 41, text: "I enjoy building on others' ideas." },
  { id: 42, text: "I like to set my own pace when possible." },
  { id: 43, text: "I think in terms of systems and processes." },
  { id: 44, text: "I prefer to see evidence before changing my view." },
  { id: 45, text: "I like to summarize and clarify what was decided." }
];

/* Personality: 30 items. O=Curiosity, C=Discipline, E=Social Energy, A=Cooperation, N=Emotional Reactivity. 6 per trait. reverse = true if high Likert = lower trait. */
window.MPP_PERSONALITY_MAP = [
  { trait: "O", reverse: false }, { trait: "O", reverse: false }, { trait: "O", reverse: false },
  { trait: "O", reverse: false }, { trait: "O", reverse: false }, { trait: "O", reverse: false },
  { trait: "C", reverse: false }, { trait: "C", reverse: true },  { trait: "C", reverse: false },
  { trait: "C", reverse: false }, { trait: "C", reverse: false }, { trait: "C", reverse: false },
  { trait: "E", reverse: false }, { trait: "E", reverse: true },  { trait: "E", reverse: false },
  { trait: "E", reverse: false }, { trait: "E", reverse: false }, { trait: "E", reverse: false },
  { trait: "A", reverse: false }, { trait: "A", reverse: false }, { trait: "A", reverse: false },
  { trait: "A", reverse: false }, { trait: "A", reverse: false }, { trait: "A", reverse: false },
  { trait: "N", reverse: false }, { trait: "N", reverse: false }, { trait: "N", reverse: false },
  { trait: "N", reverse: true },  { trait: "N", reverse: false }, { trait: "N", reverse: false },
];

/* Cognitive: 15 items. axis = pattern | verbal | strategic */
window.MPP_COGNITIVE_MAP = [
  { axis: "pattern" },   /* 30 */
  { axis: "pattern" },   /* 31 */
  { axis: "pattern" },   /* 32 */
  { axis: "pattern" },   /* 33 */
  { axis: "pattern" },   /* 34 */
  { axis: "verbal" },    /* 35 */
  { axis: "verbal" },    /* 36 */
  { axis: "verbal" },    /* 37 */
  { axis: "verbal" },    /* 38 */
  { axis: "verbal" },    /* 39 */
  { axis: "strategic" }, /* 40 */
  { axis: "strategic" }, /* 41 */
  { axis: "strategic" }, /* 42 */
  { axis: "strategic" }, /* 43 */
  { axis: "strategic" }, /* 44 */
];

window.MPP_RESPONSE_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree"
];
