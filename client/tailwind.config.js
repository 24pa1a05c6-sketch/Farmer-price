/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#163B2B',
          deep: '#10271F'
        },
        leaf: '#79A86B',
        sage: '#C8D5C0',
        ivory: '#F7F4EC',
        beige: '#E9E0D2',
        bronze: '#B68A57',
        ink: {
          DEFAULT: '#202820',
          muted: '#72796F'
        }
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Noto Sans Telugu', 'sans-serif']
      }
    }
  },
  plugins: []
};
