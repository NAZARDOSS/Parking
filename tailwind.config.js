const { addDynamicIconSelectors } = require('@iconify/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
	plugins: [
		// Iconify plugin
		addDynamicIconSelectors(),
	],
	theme: {
		extend: {
			boxShadow: {
        		 'blurred-3xl': '0px 0px 10px 5px rgba(0% 14.12% 34.12%)',
			},
			colors: {
				'regal-blue': '#0777F7',
			  },
			backgroundColor: {
				'custom-blue': 'rgba(0, 36, 87, 0.8)', // Для фона
			  },
		}
	  }
};