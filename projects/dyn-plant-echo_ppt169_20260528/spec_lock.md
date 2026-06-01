# Execution Lock

> Machine-readable execution contract. Executor MUST `read_file` this before every SVG page. Values not listed here must NOT appear in SVGs.

## canvas
- viewBox: 0 0 1280 720
- format: PPT 16:9

## colors
- bg: #F5F0E8
- bg_card: #FFFFFF
- primary: #2D5016
- primary_mid: #4A7C28
- accent: #E8A849
- secondary_accent: #D4A574
- text: #2B2B2B
- text_secondary: #6B7B6B
- text_tertiary: #9B8B7B
- border: #E0D8C8
- success: #4A7C28
- warning: #C45A28

## typography
- font_family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif
- title_family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif
- code_family: Consolas, "Courier New", monospace
- body: 22
- title: 40
- subtitle: 28
- annotation: 16
- cover_title: 66
- hero_number: 44

## icons
- library: tabler-filled
- inventory: leaf, droplet, sun-high, temperature-plus, home-2, message-circle, camera, chart-bar, clock, shield-check, bolt, heart, bulb, device-desktop, database, cloud, seedling, star, circle-check, settings, globe, users, book, calendar, box-multiple

## page_rhythm
- P01: anchor
- P02: breathing
- P03: dense
- P04: dense
- P05: dense
- P06: dense
- P07: dense
- P08: dense
- P09: dense
- P10: dense
- P11: breathing
- P12: dense
- P13: dense
- P14: dense
- P15: dense
- P16: dense
- P17: dense
- P18: anchor

## forbidden
- Mixing icon libraries
- rgba()
- `<style>`, `class`, `<foreignObject>`, `textPath`, `@font-face`, `<animate*>`, `<script>`, `<iframe>`, `<symbol>`+`<use>`
- `<g opacity>` (set opacity on each child element individually)
- HTML named entities in text — write as raw Unicode; XML reserved chars must be escaped
