/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        room: "#161b22",
        wall: "#30363d",
        panel: "#0d1117",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: { pulseGlow: "pulseGlow 1.8s ease-in-out infinite" },
    },
  },
  plugins: [],
};
