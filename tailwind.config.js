/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bone: 'rgb(var(--bone-rgb) / <alpha-value>)',
        paper: 'rgb(var(--paper-rgb) / <alpha-value>)',
        paperLight: 'rgb(var(--paperLight-rgb) / <alpha-value>)',
        paperSoft: 'rgb(var(--paperSoft-rgb) / <alpha-value>)',
        parchment: 'rgb(var(--parchment-rgb) / <alpha-value>)',
        mist: 'rgb(var(--mist-rgb) / <alpha-value>)',
        mistSoft: 'rgb(var(--mistSoft-rgb) / <alpha-value>)',
        jade: 'rgb(var(--jade-rgb) / <alpha-value>)',
        jadeDeep: 'rgb(var(--jadeDeep-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        inkSoft: 'rgb(var(--inkSoft-rgb) / <alpha-value>)',
        soot: 'rgb(var(--soot-rgb) / <alpha-value>)',
        sootSoft: 'rgb(var(--sootSoft-rgb) / <alpha-value>)',
        bronze: 'rgb(var(--bronze-rgb) / <alpha-value>)',
        bronzeDark: 'rgb(var(--bronzeDark-rgb) / <alpha-value>)',
        gold: 'rgb(var(--gold-rgb) / <alpha-value>)',
        goldLight: 'rgb(var(--goldLight-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        green: 'rgb(var(--green-rgb) / <alpha-value>)',
        amber: 'rgb(var(--amber-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        seal: 'rgb(var(--seal-rgb) / <alpha-value>)',
        sealDark: 'rgb(var(--sealDark-rgb) / <alpha-value>)'
      },
      fontFamily: {
        kai: ['KaiTi', 'STKaiti', '楷体', 'serif'],
        song: ['Songti SC', 'STSong', 'SimSun', 'Noto Serif CJK SC', 'Source Han Serif SC', 'serif'],
        yahei: ['Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Noto Sans CJK SC', 'sans-serif']
      },
      maxWidth: {
        page: '1200px'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)'
      }
    }
  },
  plugins: []
}
