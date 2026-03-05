'use strict';

// Each question has a self-framing `text` and a peer-framing `peerText`.
// In peerText, {name} is replaced at render time with the subject's first name.
const QUESTIONS = [
  {
    axis: 'X-Axis \u00b7 Execution vs. People',
    text:     'When you look back on your proudest leadership moments, they involve an engineer you grew \u2014 not a system you shipped.',
    peerText: 'When {name} looks back on their proudest leadership moments, they involve an engineer they grew \u2014 not a system they shipped.',
    pole: 'people',
  },
  {
    axis: 'X-Axis \u00b7 Execution vs. People',
    text:     'When forced to choose, you\u2019d rather have a team that trusts each other completely than a team that consistently produces technically superior work.',
    peerText: 'When forced to choose, {name} would rather have a team that trusts each other completely than a team that consistently produces technically superior work.',
    pole: 'people',
  },
  {
    axis: 'X-Axis \u00b7 Execution vs. People',
    text:     'You believe the most leveraged thing a senior leader can do is remove themselves from technical decisions and invest that time in developing others.',
    peerText: '{name} believes the most leveraged thing a senior leader can do is remove themselves from technical decisions and invest that time in developing others.',
    pole: 'people',
  },
  {
    axis: 'X-Axis \u00b7 Execution vs. People',
    text:     'You feel a quiet dissatisfaction when your calendar is full of people conversations but you haven\u2019t been close to the technical work in weeks.',
    peerText: '{name} seems to feel a quiet dissatisfaction when their calendar is full of people conversations but they haven\u2019t been close to the technical work in weeks.',
    pole: 'execution',
  },
  {
    axis: 'X-Axis \u00b7 Execution vs. People',
    text:     'When a critical system is at risk, your instinct is to personally dig into the problem \u2014 not delegate it, even to capable engineers.',
    peerText: 'When a critical system is at risk, {name}\u2019s instinct is to personally dig into the problem \u2014 not delegate it, even to capable engineers.',
    pole: 'execution',
  },
  {
    axis: 'Y-Axis \u00b7 Stability vs. Change',
    text:     'You\u2019d rather lead a team through the discomfort of a major pivot than spend another quarter executing a plan you\u2019ve stopped believing in.',
    peerText: '{name} would rather lead a team through the discomfort of a major pivot than spend another quarter executing a plan they\u2019ve stopped believing in.',
    pole: 'change',
  },
  {
    axis: 'Y-Axis \u00b7 Stability vs. Change',
    text:     'You think a team that hasn\u2019t significantly changed how it works in the past year is probably falling behind \u2014 even if the metrics look fine.',
    peerText: '{name} thinks a team that hasn\u2019t significantly changed how it works in the past year is probably falling behind \u2014 even if the metrics look fine.',
    pole: 'change',
  },
  {
    axis: 'Y-Axis \u00b7 Stability vs. Change',
    text:     'When evaluating your team\u2019s health, you weigh their appetite for change and learning more heavily than the stability of their current output.',
    peerText: 'When evaluating their team\u2019s health, {name} weighs the team\u2019s appetite for change and learning more heavily than the stability of their current output.',
    pole: 'change',
  },
  {
    axis: 'Y-Axis \u00b7 Stability vs. Change',
    text:     'You believe the highest form of engineering leadership is building systems and teams so reliable that nothing \u2014 not even a great opportunity \u2014 can destabilize them.',
    peerText: '{name} believes the highest form of engineering leadership is building systems and teams so reliable that nothing \u2014 not even a great opportunity \u2014 can destabilize them.',
    pole: 'stability',
  },
  {
    axis: 'Y-Axis \u00b7 Stability vs. Change',
    text:     'You feel more pride when your team has a flawless quarter with zero incidents than when they successfully launched something bold and new.',
    peerText: '{name} feels more pride when their team has a flawless quarter with zero incidents than when they successfully launched something bold and new.',
    pole: 'stability',
  },
];
