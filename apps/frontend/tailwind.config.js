/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-root':    '#07070F',
        'bg-panel':   '#0B0B14',
        'bg-card':    '#0D0D18',
        'bg-elevated':'#10101E',
        'bg-input':   '#0F0F1A',
        'bg-editor':  '#FAFAF9',
        'accent':     '#6E56CF',
        'accent-h':   '#7C65D8',
        'border-def': '#1a1a28',
        'border-card':'#1E1E30',
        'text-pri':   '#EDEDEE',
        'text-dim':   '#C0C0D8',
        'text-sec':   '#8888AA',
        'text-muted': '#44445A',
        'text-faint': '#33334A',
        'text-ghost': '#252535',
        'success':    '#34D399',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
