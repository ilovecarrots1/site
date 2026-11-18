/* ==========================================================================
   Brain anatomy — hand-drawn anatomical SVG regions (lateral + medial cut).
   Pink brain, real placement: every path maps to a REGIONS id, so clicking
   a zone opens the existing region card. viewBox 0 0 420 320, anterior left.
   ========================================================================== */

/* Cerebrum silhouette (lateral). */
export const OUTLINE =
  "M48 150 C50 118 62 88 88 68 C118 46 168 38 210 40 C258 42 300 56 324 84 " +
  "C344 106 352 136 350 158 C348 178 338 192 322 200 C300 212 268 224 236 232 " +
  "C200 240 160 240 132 230 C110 222 96 210 88 196 C70 186 52 170 48 150 Z";

/* Posterior structures shared by both views. */
const POSTERIOR = [
  { id: "cerebellum", tone: 1, lx: 340, ly: 256,
    d: "M298 224 C316 214 348 214 366 226 C380 236 382 258 372 272 C360 286 330 290 312 282 C298 274 292 244 298 224 Z" },
  { id: "pons", tone: 3, lx: 276, ly: 262,
    d: "M262 244 C276 238 292 240 298 250 C300 262 296 272 288 276 C276 280 264 276 260 266 C258 258 258 250 262 244 Z" },
  { id: "medulla", tone: 3, lx: 275, ly: 296,
    d: "M262 276 C272 280 284 280 290 276 L286 304 C280 310 268 310 262 304 Z" },
  { id: "spinal-cord", tone: 3, lx: 273, ly: 316,
    d: "M262 304 C268 310 280 310 286 304 L284 319 L262 319 Z" },
];

/* Lateral surface: cortical lobes + posterior structures. */
export const SURFACE_REGIONS = [
  { id: "prefrontal-cortex", tone: 0, lx: 92, ly: 118,
    d: "M48 150 C50 118 62 88 88 68 C104 56 122 48 140 44 L148 80 C140 110 136 136 134 160 L118 180 C96 186 72 182 60 170 C52 162 49 156 48 150 Z" },
  { id: "orbitofrontal", tone: 1, lx: 96, ly: 200,
    d: "M60 170 C72 182 96 186 118 180 L126 196 C120 212 106 220 92 214 C76 208 64 190 60 170 Z" },
  { id: "motor-cortex", tone: 2, lx: 160, ly: 100,
    d: "M140 44 L172 41 L184 76 C178 106 172 130 168 152 L136 160 C138 136 142 110 148 80 Z" },
  { id: "parietal-cortex", tone: 1, lx: 248, ly: 92,
    d: "M172 41 C186 40 200 40 210 40 C258 42 300 56 324 84 L306 120 C278 134 246 142 218 144 L168 152 C172 130 178 106 184 76 Z" },
  { id: "occipital-cortex", tone: 0, lx: 326, ly: 150,
    d: "M324 84 C344 106 352 136 350 158 C348 178 338 192 322 200 L298 192 C294 166 298 142 306 120 Z" },
  { id: "temporal-cortex", tone: 2, lx: 212, ly: 196,
    d: "M136 160 L168 152 L218 144 C246 142 278 134 306 120 C298 142 294 166 298 192 L322 200 C300 212 268 224 236 232 C200 240 160 240 132 230 C112 222 100 212 92 200 L126 196 L118 180 Z" },
  { id: "insula", tone: 3, lx: 163, ly: 170,
    d: "M148 152 C156 145 170 145 178 152 C170 160 156 160 148 152 Z" },
  { id: "olfactory-bulb", tone: 3, lx: 72, ly: 222,
    d: "M58 198 C64 192 76 192 82 198 C76 206 64 206 58 198 Z" },
  ...POSTERIOR,
];

/* Medial cutaway: deep nuclei + limbic structures, anatomically placed. */
export const MEDIAL_REGIONS = [
  { id: "anterior-cingulate", tone: 0, lx: 200, ly: 84,
    d: "M120 108 C140 84 190 72 236 78 C262 82 280 94 288 108 L276 118 C262 104 240 96 212 96 C180 96 150 104 132 118 Z" },
  { id: "striatum", tone: 2, lx: 176, ly: 132, e: [176, 132, 24, 16] },
  { id: "septum", tone: 1, lx: 148, ly: 130, e: [148, 130, 10, 8] },
  { id: "basal-forebrain", tone: 1, lx: 128, ly: 152, e: [128, 152, 12, 8] },
  { id: "nucleus-accumbens", tone: 2, lx: 140, ly: 172, e: [140, 172, 13, 9] },
  { id: "thalamus", tone: 0, lx: 228, ly: 136, e: [228, 136, 22, 15] },
  { id: "habenula", tone: 3, lx: 256, ly: 122, e: [256, 122, 7, 6] },
  { id: "pineal", tone: 3, lx: 270, ly: 112, e: [270, 112, 6, 5] },
  { id: "hypothalamus", tone: 1, lx: 218, ly: 164, e: [218, 164, 14, 10] },
  { id: "hippocampus", tone: 2, lx: 258, ly: 200,
    d: "M240 184 C252 176 268 176 276 184 C272 194 258 198 246 194 C240 192 238 188 240 184 Z" },
  { id: "amygdala", tone: 1, lx: 214, ly: 190, e: [214, 188, 11, 9] },
  { id: "vta", tone: 3, lx: 238, ly: 212, e: [238, 210, 9, 7] },
  { id: "substantia-nigra", tone: 3, lx: 258, ly: 208, e: [258, 206, 10, 6] },
  { id: "periaqueductal-gray", tone: 1, lx: 272, ly: 184, e: [272, 184, 8, 7] },
  { id: "locus-coeruleus", tone: 3, lx: 292, ly: 196, e: [292, 196, 8, 6] },
  { id: "raphe", tone: 1, lx: 288, ly: 234,
    d: "M272 210 C278 220 280 232 278 244 L270 244 C270 232 268 220 266 212 Z" },
  { id: "olfactory-bulb", tone: 3, lx: 72, ly: 222,
    d: "M58 198 C64 192 76 192 82 198 C76 206 64 206 58 198 Z" },
  ...POSTERIOR,
];

/* Decorative sulci (lateral view). */
export const SULCI_A = [
  "M180 44 C174 76 168 108 162 148",            /* central */
  "M130 162 C170 150 220 140 282 128",          /* lateral */
  "M310 62 C302 92 300 122 306 150",            /* parieto-occipital */
  "M70 92 C100 84 128 80 146 78",               /* superior frontal */
  "M140 186 C180 176 230 168 282 158",          /* superior temporal */
  "M96 60 C104 74 108 90 108 106",
  "M212 44 C214 62 212 80 206 96",
  "M262 52 C268 70 270 88 266 104",
  "M180 200 C210 194 244 188 274 180",
  "M330 100 C336 118 338 138 334 156",
];

/* Cerebellar folia. */
export const FOLIA_A = [
  "M302 236 C322 228 348 228 364 238",
  "M300 250 C322 242 350 242 370 252",
  "M302 264 C322 256 348 256 368 266",
  "M308 276 C324 270 344 270 360 278",
];

/* Corpus callosum (medial view). */
export const CALLOSUM_A =
  "M150 122 C158 98 198 88 232 96 C252 102 262 116 258 128 C248 120 230 114 210 114 C186 114 166 120 150 122 Z";

/* Fornix / internal capsule hint strokes (medial view). */
export const MEDIAL_LINES = [
  "M176 148 C190 158 204 164 218 164",
  "M228 151 C234 162 240 172 244 182",
  "M150 122 C160 132 168 142 172 152",
];