/* Chapter order. Each chapter is its own HTML file; → on the last slide opens the next one.
   tools/build_single.py merges them in this order into one presentation file.
   skip:true preserves an omitted chapter in the source while presentation navigation passes over it. */
window.DECK_CHAPTERS = [
  { file: "00_intro.html", title: "Intro", short: "Intro" },
  { file: "01_selective_memory.html", title: "Part 1 · Selective memory", short: "Part 1" },
  { file: "02_adaptive_inference.html", title: "Appendix · Adaptive inference", short: "Appendix", skip: true },
  { file: "03_safety_aware_learning.html", title: "Part 2 · Safety-aware learning", short: "Part 2" },
  { file: "04_predictive_world_models.html", title: "Part 3 · Predictive world models", short: "Part 3" },
  { file: "05_closing.html", title: "Closing", short: "Closing" }
];
