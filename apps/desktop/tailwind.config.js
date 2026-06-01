/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        outline: "#72796e",
        "outline-variant": "#c2c9bb",
        "inverse-surface": "#2c3230",
        "inverse-on-surface": "#edf2ef",
        "inverse-primary": "#a1d494",
        primary: "#154212",
        "on-primary": "#ffffff",
        "primary-container": "#2d5a27",
        "on-primary-container": "#9dd090",
        "primary-fixed": "#bcf0ae",
        "primary-fixed-dim": "#a1d494",
        "on-primary-fixed": "#002201",
        "on-primary-fixed-variant": "#23501e",
        secondary: "#3d6751",
        "on-secondary": "#ffffff",
        "secondary-container": "#bfedd1",
        "on-secondary-container": "#436d57",
        "secondary-fixed": "#bfedd1",
        "secondary-fixed-dim": "#a4d1b6",
        "on-secondary-fixed": "#002113",
        "on-secondary-fixed-variant": "#254f3a",
        tertiary: "#493517",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#624c2c",
        "on-tertiary-container": "#dcbd95",
        "tertiary-fixed": "#feddb3",
        "tertiary-fixed-dim": "#e1c299",
        "on-tertiary-fixed": "#281801",
        "on-tertiary-fixed-variant": "#584324",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        background: "#f4f8f3",
        "on-background": "#171d1b",
        surface: "#f4f8f3",
        "on-surface": "#1b211e",
        "on-surface-variant": "#465048",
        "surface-variant": "#dde4dd",
        "surface-bright": "#f7faf6",
        "surface-dim": "#d3dad3",
        "surface-tint": "#3b6934",
        "surface-container-lowest": "#fbfdfa",
        "surface-container-low": "#eef3ee",
        "surface-container": "#e7ede7",
        "surface-container-high": "#e1e7e0",
        "surface-container-highest": "#dbe1da",
        // 用于卡片极淡描边的 hairline 色
        hairline: "rgba(45, 90, 39, 0.08)"
      },
      borderRadius: {
        DEFAULT: "1rem",
        sm: "0.5rem",
        md: "1.25rem",
        lg: "1.75rem",
        xl: "2.5rem",
        "2xl": "3rem",
        full: "9999px"
      },
      spacing: {
        gutter: "16px",
        "margin-mobile": "20px",
        "margin-desktop": "64px",
        base: "8px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px"
      },
      fontFamily: {
        display: ["'Segoe UI Variable Display'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        body: ["'Segoe UI Variable Text'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        "headline-xl": ["'Segoe UI Variable Display'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        "headline-lg": ["'Segoe UI Variable Display'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        "headline-md": ["'Segoe UI Variable Display'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        "headline-lg-mobile": ["'Segoe UI Variable Display'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        "body-lg": ["'Segoe UI Variable Text'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        "body-md": ["'Segoe UI Variable Text'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        "label-md": ["'Segoe UI Variable Text'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"],
        "label-sm": ["'Segoe UI Variable Text'", "'Segoe UI'", "'Microsoft YaHei UI'", "system-ui", "sans-serif"]
      },
      fontSize: {
        "headline-xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "600" }],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(45, 90, 39, 0.04), 0 8px 24px rgba(45, 90, 39, 0.07)",
        leaf: "0 1px 1px rgba(45, 90, 39, 0.03), 0 4px 18px rgba(45, 90, 39, 0.05)",
        modal: "0 24px 56px rgba(45, 90, 39, 0.18), 0 4px 12px rgba(45, 90, 39, 0.08)",
        "ring-primary": "0 0 0 3px rgba(45, 90, 39, 0.18)"
      },
      transitionTimingFunction: {
        emphasized: "cubic-bezier(0.2, 0, 0, 1)",
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        soft: "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      },
      transitionDuration: {
        250: "250ms",
        320: "320ms",
        420: "420ms"
      }
    }
  },
  plugins: []
};
