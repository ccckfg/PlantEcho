---
name: Verdant Echo
colors:
  surface: '#f5faf7'
  surface-dim: '#d6dbd8'
  surface-bright: '#f5faf7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f5f2'
  surface-container: '#eaefec'
  surface-container-high: '#e4e9e6'
  surface-container-highest: '#dee4e1'
  on-surface: '#171d1b'
  on-surface-variant: '#42493e'
  inverse-surface: '#2c3230'
  inverse-on-surface: '#edf2ef'
  outline: '#72796e'
  outline-variant: '#c2c9bb'
  surface-tint: '#3b6934'
  primary: '#154212'
  on-primary: '#ffffff'
  primary-container: '#2d5a27'
  on-primary-container: '#9dd090'
  inverse-primary: '#a1d494'
  secondary: '#3d6751'
  on-secondary: '#ffffff'
  secondary-container: '#bfedd1'
  on-secondary-container: '#436d57'
  tertiary: '#493517'
  on-tertiary: '#ffffff'
  tertiary-container: '#624c2c'
  on-tertiary-container: '#dcbd95'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bcf0ae'
  primary-fixed-dim: '#a1d494'
  on-primary-fixed: '#002201'
  on-primary-fixed-variant: '#23501e'
  secondary-fixed: '#bfedd1'
  secondary-fixed-dim: '#a4d1b6'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#254f3a'
  tertiary-fixed: '#feddb3'
  tertiary-fixed-dim: '#e1c299'
  on-tertiary-fixed: '#281801'
  on-tertiary-fixed-variant: '#584324'
  background: '#f5faf7'
  on-background: '#171d1b'
  surface-variant: '#dee4e1'
typography:
  headline-xl:
    fontFamily: Quicksand
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  margin-mobile: 20px
  margin-desktop: 64px
  gutter: 16px
---

## Brand & Style
This design system embodies "Nature-inspired Modernism," a philosophy that bridges high-utility technology with the soft, organic irregularities of the natural world. It is designed for plant enthusiasts who seek a sanctuary-like digital environment that feels as nurturing as a greenhouse.

The aesthetic leans into **Minimalism** with a **Tactile** twist. By utilizing expansive whitespace (the "air"), the interface avoids digital clutter, allowing high-quality photography of flora to take center stage. The emotional response should be one of calm, growth, and encouragement. Every interaction is designed to feel soft and deliberate, moving away from "robotic" sharpness toward a more human, empathetic experience.

## Colors
The palette is rooted in the "Forest-to-Soil" spectrum. 

- **Primary (Forest Green):** Used for core actions, primary buttons, and active states. It provides the grounding authority of a dense canopy.
- **Secondary (Leaf Green):** Used for decorative elements, success states, and subtle background highlights. It represents new growth and accessibility.
- **Tertiary (Earth Tan):** An accent color used for secondary actions or to highlight information related to soil, pots, or specialized care instructions.
- **Neutral (Mint White):** The canvas. This off-white base reduces eye strain and provides a warmer, more organic feel than pure white, reminiscent of morning mist.

## Typography
The typography strategy pairs a friendly, rounded display face with a highly legible, modern sans-serif. 

**Quicksand** is reserved for headlines. Its rounded terminals mirror the organic curves of leaves and stems, making the app feel approachable and "soft" to the touch. 

**Plus Jakarta Sans** provides the structural clarity needed for plant care guides, social feeds, and notifications. It maintains a contemporary, clean look that ensures the app remains professional and trustworthy. Use generous line height for body text to maintain the "airy" feel of the brand.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a focus on wide gutters and substantial outer margins to emphasize the "Airy" brand pillar.

- **Mobile:** A 4-column layout with 20px side margins. Elements should use "Stacking" rather than crowding.
- **Desktop:** A 12-column layout centered at a max-width of 1280px. 
- **Rhythm:** Spacing follows an 8px base unit. Use `xxl` (48px) spacing between major sections to allow the content to "breathe," mirroring the natural space found in a garden.

## Elevation & Depth
Depth in this design system is created through **Tonal Layers** and **Ambient Shadows** rather than stark borders.

- **Surface Strategy:** Use the neutral background (#F7FCF9) for the base, and elevate interactive cards using pure white (#FFFFFF). This creates a subtle "lift" without relying on dark shadows.
- **Shadow Character:** When shadows are necessary for high-level components (like floating action buttons), use a diffuse, low-opacity shadow tinted with the primary green (e.g., `rgba(45, 90, 39, 0.08)`). This ensures the elevation feels like a natural part of the environment rather than a digital overlay.
- **Depth Hierarchy:** 
  - Level 0: Background (#F7FCF9)
  - Level 1: Inset elements / Input fields (1px #A8D5BA border)
  - Level 2: Standard Cards (White, 8px blur shadow)
  - Level 3: Modals and Menus (White, 16px blur shadow)

## Shapes
The shape language is the defining characteristic of this design system. It uses **Pill-shaped** and extremely rounded forms to mimic the smooth edges of stones, pebbles, and succulents.

- **Small Components:** Buttons and chips use a full pill shape (100px or `rounded-full`).
- **Containers:** Large cards and modals use a minimum of 24px (`1.5rem`) corner radius. 
- **Organic Accents:** Occasionally, use non-uniform "blob" shapes for background decorations or image masks to break the monotony of the grid and reinforce the nature-inspired theme.

## Components

### Buttons
Primary buttons are pill-shaped, using the Deep Forest Green background with white text. Hover states should transition to a slightly lighter tint of the forest green. Secondary buttons use a transparent background with a 2px Soft Leaf Green border.

### Cards
Cards are the primary container for social posts and plant profiles. They must feature a 24px corner radius, a pure white background, and a soft, green-tinted ambient shadow. Content within cards should have at least 24px of internal padding.

### Input Fields
Inputs should feel tactile. Use a light mint-colored background with a soft 1px Leaf Green border. On focus, the border thickens to 2px in Forest Green. Use rounded-xl (1.5rem) for text fields.

### Chips & Tags
Used for plant categories (e.g., "Low Light," "Pet Friendly"). These are small pill-shaped elements with the Earth Tan background and Deep Forest Green text to maintain high contrast while staying within the natural palette.

### Progress Bars
Used for hydration or growth tracking. Use the Soft Leaf Green for the track and Deep Forest Green for the progress indicator. The ends of the bars must be rounded.

### Iconography
Icons should be line-based with a 2px stroke and rounded caps/joins. They should feature nature motifs: teardrop-shaped water drops, jagged sun rays, and leaf-vein patterns.