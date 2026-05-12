import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#08080f",
        surface: "#111118",
        glass: "rgba(255,255,255,0.05)",
        "purple-claw": "#7c3aed",
        "cyan-spark": "#22d3ee",
        "amber-fire": "#f59e0b",
        "green-xp": "#10b981",
        "red-wrong": "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-claw":
          "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
        "gradient-fire":
          "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
        "gradient-void":
          "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(34,211,238,0.1) 0%, transparent 50%), #08080f",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          from: { boxShadow: "0 0 20px rgba(124,58,237,0.3)" },
          to: { boxShadow: "0 0 40px rgba(124,58,237,0.6)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
