'use strict';

const ARCHETYPES = {
  'Systems Stabilizer': {
    tagline: 'You lead by making complexity disappear. Your teams don\u2019t panic because you\u2019ve already anticipated the failure.',
    desc: 'You are at your best when the stakes are high and predictability matters. You build the foundations others build on top of.',
    behaviors: [
      'Champions process, structure, and reliability',
      'Strong in scaling rituals, on-call, planning, and ops',
      'Good fit for complex orgs and regulated domains',
    ],
    watchOut: [
      'Bureaucracy',
      'Micromanagement',
      'Over-optimizing for predictability',
    ],
  },
  'The Driver': {
    tagline: 'You lead by making things happen. You\u2019re at your best when the path is unclear and someone needs to cut through.',
    desc: 'You bias toward action and velocity. You\u2019ve shipped things that weren\u2019t perfect and you\u2019re proud of it.',
    behaviors: [
      'Operates with urgency, clarity, and high standards',
      'Great at turning ideas into momentum',
      'Pushes teams forward during high-stakes deliveries',
    ],
    watchOut: [
      'Hero complex',
      'Burning out (self and others)',
      'Over-optimizing for speed',
    ],
  },
  'Team Builder': {
    tagline: 'You lead by raising the floor. The teams you leave behind are permanently better than the ones you inherited.',
    desc: 'You believe sustainable performance comes from people who trust each other. You play the long game.',
    behaviors: [
      'Invests deeply in people development',
      'Prioritizes cohesion, mentoring, and internal mobility',
      'Often the cultural backbone of high-trust teams',
    ],
    watchOut: [
      'Avoiding conflict',
      'Ruinous empathy',
      'Lack of clarity or decision-making',
    ],
  },
  'Strategic Shaper': {
    tagline: 'You lead by rewriting the rules. You build organizations that outlast any single roadmap or strategy.',
    desc: 'You see the human system as the highest-leverage point. You grow leaders, not just engineers.',
    behaviors: [
      'Great storytellers, reformers, and culture-shifters',
      'Thrive in ambiguous or high-change environments',
      'Often lead transformations and challenge the status quo',
    ],
    watchOut: [
      'Vagueness',
      'Chaos spinning',
      'Change for change\u2019s sake',
    ],
  },
};
