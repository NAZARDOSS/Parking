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
			  animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out',
			  },
			  keyframes: {
				fadeIn: {
				  '0%': { opacity: 0, transform: 'translateY(10px)' },
				  '100%': { opacity: 1, transform: 'translateY(0)' },
				}
			  }
		}
	  }
};