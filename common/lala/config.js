/* ============================================================================
 * LaLa-World · 1-minute explainer — CONFIG
 * ----------------------------------------------------------------------------
 * Everything you are likely to tweak lives here:
 *   - canvas size / fps
 *   - colours & fonts
 *   - scene order + duration (seconds)  → total length = sum of durations
 *   - every on-screen string
 *   - every number shown in charts (all taken from the paper; table/figure noted)
 *
 * Scene drawing code lives in src/scenes.js, keyed by scene `id`.
 * ==========================================================================*/
window.LALA_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  fade: 0.35, // seconds of fade-in / fade-out at each scene boundary

  colors: {
    bg: '#0B0E14',
    bgGlow: '#121826',
    panel: '#141A24',
    panelHi: '#1B2230',
    stroke: '#2A3242',
    ink: '#EEF1F6',
    muted: '#A3ACBC',
    dim: '#5E6879',
    lala: '#F0454F',     // LaLa-World / language (paper's red)
    lalaSoft: 'rgba(240,69,79,0.16)',
    gen: '#4A8CFF',      // generative baselines (RAEv2, Cosmos Policy)
    genSoft: 'rgba(74,140,255,0.16)',
    latent: '#35D0BA',   // latent tokens / encoder outputs
    latentSoft: 'rgba(53,208,186,0.14)',
    base: '#6F7889',     // other baselines
    gold: '#FFC857',
  },

  fonts: {
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "DejaVu Sans Mono", monospace',
    serif: '"STIX Two Text", "Times New Roman", serif',
  },

  // Order + duration of scenes. Change `dur` to retime; reorder to re-cut.
  scenes: [
    { id: 'title',      dur: 4.5, chapter: 'Intro' },
    { id: 'problem',    dur: 5.5, chapter: 'Problem' },
    { id: 'language',   dur: 7.5, chapter: 'Idea' },
    { id: 'model',      dur: 9.0, chapter: 'Model' },
    { id: 'planning',   dur: 6.0, chapter: 'Planning' },
    { id: 'results',    dur: 7.0, chapter: 'Results' },
    { id: 'generative', dur: 9.0, chapter: 'Latent vs Gen.' },
    { id: 'policy',     dur: 8.0, chapter: 'Policy' },
    { id: 'outro',      dur: 3.5, chapter: 'Takeaways' },
  ],

  /* ---------------------------------------------------------------- TEXT */
  text: {
    brand: 'LaLa-World',
    venue: 'arXiv soon',

    title: {
      name: 'LaLa-World',
      expand: ['Language-conditioned', 'Latent', 'World model'],
      tagline: 'Scaling latent world models with natural-language actions',
    },

    problem: {
      kicker: '01 · The problem',
      headline: 'Every domain speaks its own action dialect',
      sub: 'Numeric actions change size and meaning across domains — and video has no actions at all.',
      domains: [
        { name: 'Push-T',     dim: '2-D', img: 'dom_pusht',     vec: '[−0.60, −1.95]',              meaning: 'pusher displacement' },
        { name: 'PointMaze',  dim: '2-D', img: 'dom_pointmaze', vec: '[0.50, 0.46]',                meaning: 'force on the ball' },
        { name: 'Meta-World', dim: '4-D', img: 'dom_metaworld', vec: '[0.81, 0.84, −1.46, −0.08]',  meaning: 'gripper xyz + grip' },
        { name: 'DROID',      dim: '7-D', img: 'dom_droid',     vec: '[0.5, 0.6, 5.9, 2, −7, …]',   meaning: 'pose + gripper' },
        { name: 'OpenVid',    dim: '—',   img: 'dom_openvid_train', vec: 'no action label',         meaning: 'web video' },
      ],
      punch: 'Separate predictors per domain.  Video data left unused.',
    },

    language: {
      kicker: '02 · The idea',
      headline: 'Say every action in words',
      sub: 'Templates verbalize numeric actions; captions and edit instructions describe visual change.',
      // The language conditions shown in the paper (Fig. 1a / Fig. 3)
      examples: [
        { img: 'dom_pusht',         src: 'Push-T',     text: 'Move the pusher 0.60 left and 1.95 down' },
        { img: 'dom_pointmaze',     src: 'PointMaze',  text: 'Push the ball with force 0.50 right and 0.46 up' },
        { img: 'dom_metaworld',     src: 'Meta-World', text: 'Move the gripper 0.81 right, 0.84 forward, 1.46 down …' },
        { img: 'dom_droid',         src: 'DROID',      text: 'Move gripper 0.5cm forward, 0.6cm right, 5.9cm up; rotate …' },
        { img: 'fig3_openvid_a',    src: 'OpenVid',    text: 'The hand stirs the liquid in the cup with the spoon …' },
        { img: 'fig3_omniedit_a',   src: 'OmniEdit',   text: 'Swap the moon with a vibrant sunset over the ocean …' },
      ],
      zLabel: 'natural-language condition',
      stat1: '10 datasets',
      stat1b: '7 control · 3 image/video',
      stat2: '6.5M',
      stat2b: 'training transitions & edit pairs',
      punch: ['One shared interface  →  ', 'one predictor', ' for every domain'], // middle part highlighted
    },

    model: {
      kicker: '03 · The model',
      headline: 'A language model is the world-model predictor',
      encoder: 'Encoder',
      encoderSub: 'frozen DINO',
      predictor: 'Predictor',
      predictorSub: 'language model · Qwen3.5-0.8B',
      action: 'move 2 left and 4 up',
      steps: [
        'A frozen vision encoder turns frames into patch latents',
        'The action enters as plain text tokens',
        'Learned queries read out the next latent state',
        'Train with a latent regression loss — no pixels reconstructed',
      ],
    },

    planning: {
      kicker: '04 · Planning with imagination',
      headline: 'Imagine candidate actions in latent space, act on the best',
      loop: ['Sample language actions', 'Imagine latent rollouts', 'Score distance to goal', 'Refit, then execute the best'],
      rowA: 'Numerical language actions · Push-T',
      rowB: 'Qualitative words, no numbers · Wall',
      // Fig. 2 — the actions actually selected in each step
      actionsA: ['1.19 left, 0.68 up', '1.40 left, 0.5 up', '0.47 left, 0.79 up', '0.44 left, 0.52 up', '0.56 left, 0.16 up', '0.33 left, 0.87 up'],
      actionsB: ['far right & down', 'right & far down', 'slightly right & slightly up', 'right & slightly up', 'far right & far up', 'slightly right & up'],
    },

    results: {
      kicker: '04 · Planning results',
      headline: 'One shared predictor beats per-domain world models',
      groupA: 'Wall · PointMaze · Push-T · MetaWorld ×2',
      groupB: 'Rope · Granular · RoboCasa ×2 (zero-shot) · DROID',
      robustTitle: 'Robust to re-phrased actions',
      robustEx: ['“move the gripper”', '“shift the robot hand”'],
      note: 'Average success rate (%) — Table 1 · Fig. 4',
    },

    generative: {
      kicker: '05 · Latent vs. generative',
      headline: 'Same data, encoder and language — no pixels to generate',
      sub: 'Matched comparison with an RAEv2 diffusion world model (≈0.8B predictor each)',
      chartTitle: 'Planning performance vs. training time',
      raceTitle: 'Planning one DROID trajectory',
      rows: ['LaLa-World', 'RAEv2 · 1 step', 'RAEv2 · 5 steps'],
      badge1: '6× less training cost',
      badge2: '13.9× faster planning',
      note: 'Fig. 5(a) · Fig. 6 (DROID trajectory 2) · avg. perf over the RAEv2-comparison benchmarks',
    },

    policy: {
      kicker: '06 · From world model to policy',
      headline: 'Fine-tune LaLa-World into LaLa-Policy',
      sub: 'Predicts an action chunk and the future latent — then the robot acts',
      instruction: '“Pick up the black bowl on the stove and place it on the plate”',
      gtLabel: 'Simulator',
      predLabel: 'Imagined (decoded latent)',
      note: 'Success rate & avg. inference time per trajectory — Tables 2–4 · Fig. 7',
    },

    outro: {
      lines: [
        'Language unifies actions across robots, simulators and video',
        'One predictor beats per-domain latent world models',
        '13.9× faster planning than a matched generative world model',
        'A strong policy init — up to 5.5× faster inference than Cosmos Policy',
      ],
    },
  },

  /* ---------------------------------------------------------------- DATA */
  data: {
    // Table 1 (upper) — average over Wall, PointMaze, Push-T, MetaWorld-R, MetaWorld-RW
    table1A: [
      { name: 'LaLa-World',   v: 72.1, me: true },
      { name: 'JEPA-WMs',     v: 64.6 },
      { name: 'DINO-WM',      v: 62.3 },
      { name: 'DreamerV3',    v: 30.2 },
      { name: 'LeWorldModel', v: 28.1 },
      { name: 'IRIS',         v: 26.0 },
      { name: 'TD-MPC2',      v: 17.7 },
    ],
    // Table 1 (lower) — average over Rope, Granular, RoboCasa-R, RoboCasa-P, DROID
    table1B: [
      { name: 'LaLa-World', v: 50.5, me: true },
      { name: 'JEPA-WMs',   v: 44.8 },
      { name: 'DINO-WM',    v: 36.8 },
    ],
    // Fig. 4 / Table F — average score, original vs paraphrased action templates
    robust: [
      { name: 'Control data only', a: 59.3, b: 52.5, me: false },
      { name: '+ image & video',   a: 61.6, b: 61.0, me: true },
    ],
    // Fig. 5(a) — planning performance vs training time (min). Labelled values are
    // from the figure; x positions of LaLa-World points are read off the plot.
    trainCurve: {
      lala: [[144, 47.8], [288, 56.7], [432, 58.9], [576, 59.4]],
      rae5: [[180, 33.6], [360, 45.2], [540, 47.4], [720, 48.0]],
      rae1: [[180, 32.5], [360, 39.7], [540, 40.4], [720, 40.4]],
    },
    // Fig. 6 — DROID trajectory 2 planning wall-clock time (seconds)
    planTime: { lala: 55, rae1: 163, rae5: 775 }, // 55s · 2m43s · 12m55s
    planFactor: { rae1: '3.0×', rae5: '13.9×' },  // as printed in Fig. 6
    finalPerf: { lala: 59.4, rae1: 40.4, rae5: 48.0 },
    // Tables 2–4 (policy)
    policy: [
      { bench: 'LIBERO',   metric: 'success %', lala: 97.7, cosmos: 97.3, unit: '%' },
      { bench: 'RoboCasa', metric: 'success % (50 demos)', lala: 57.3, cosmos: 56.0, unit: '%' },
    ],
    infer: [
      { bench: 'LIBERO',   lala: 0.86, cosmos: 4.45, x: '5.2×' },
      { bench: 'RoboCasa', lala: 2.12, cosmos: 11.71, x: '5.5×' },
    ],
  },

  /* -------------------------------------------------------------- ASSETS */
  // Figure crops extracted from the paper (assets/<name>.jpg)
  assets: [
    'dom_pusht', 'dom_pointmaze', 'dom_metaworld', 'dom_droid', 'dom_openvid_train', 'dom_openvid_cup',
    'fig3_openvid_a', 'fig3_openvid_b', 'fig3_omniedit_a', 'fig3_omniedit_b', 'fig3_granular',
    'fig2_pusht_init', 'fig2_pusht_goal', 'fig2_wall_init', 'fig2_wall_goal',
    'fig2_robocasa_init', 'fig2_robocasa_goal', 'fig2_rope_init', 'fig2_rope_goal',
    ...[1, 2, 3, 4, 5, 6].flatMap(i => [`fig2_pusht_${i}`, `fig2_wall_${i}`, `fig2_robocasa_${i}`, `fig2_rope_${i}`]),
    'fig6_init', 'fig6_goal',
    ...[1, 2, 3].flatMap(i => [`fig6_lala_${i}`, `fig6_rae1_${i}`, `fig6_rae5_${i}`]),
    'fig7_libero_init', 'fig7_robocasa_init',
    ...[1, 2, 3, 4, 5, 6].flatMap(i => [`fig7_libero_gt_${i}`, `fig7_libero_pred_${i}`, `fig7_robocasa_gt_${i}`, `fig7_robocasa_pred_${i}`]),
    ...[1, 2, 3, 4, 5, 6].map(i => `latent_pca_${i}`),
  ],
};
