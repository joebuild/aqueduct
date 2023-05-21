import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-auto';

const config = {
  // experimental: {
  //   prebundleSvelteLibraries: true
  // },
  preprocess: preprocess(),
  kit: {
    adapter: adapter(),

    prerender: {
      default: true
    },
  }
};

export default config;
