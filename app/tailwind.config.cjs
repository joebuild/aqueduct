const config = {
  content: ['./src/**/*.{html,js,svelte,ts,svg}'],

  theme: {
    fontFamily: {
      sans: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    },
    extend: {
      screens: {
        lg: '1080px',
      },
      colors: {
        "backdrop": '#4448',
        "tweet": '#1da1f2',
      }
    },
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/colors/themes")["[data-theme=aqua]"],
          "base-100": "#99f6e4",
        },
      },
    ],
  }
};

module.exports = config;
