/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colores de la guía de marca BaruLogix
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Azul eléctrico principal
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',  // Gris oscuro principal
          900: '#111827',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981',  // Verde lima principal
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Alias para compatibilidad
        barulogix: {
          blue: '#3b82f6',
          gray: '#1f2937',
          green: '#10b981',
        }
      },
      
      // Tipografía personalizada
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
        'segoe': ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
        'sans': ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      
      // Espaciado personalizado
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Sombras personalizadas
      boxShadow: {
        'barulogix': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'barulogix-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'barulogix-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
      
      // Bordes redondeados
      borderRadius: {
        'barulogix': '0.75rem',
        'barulogix-lg': '1rem',
        'barulogix-xl': '1.5rem',
      },
      
      // Animaciones personalizadas
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-down': 'slideDown 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'bounce-soft': 'bounceSoft 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      
      // Keyframes para animaciones
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      
      // Transiciones personalizadas
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      
      // Gradientes
      backgroundImage: {
        'gradient-barulogix': 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
        'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
        'gradient-accent': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-hero': 'linear-gradient(135deg, #3b82f6 0%, #10b981 50%, #3b82f6 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      
      // Tamaños de contenedor
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      
      // Z-index personalizado
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      
      // Aspectos de ratio
      aspectRatio: {
        '4/3': '4 / 3',
        '3/2': '3 / 2',
        '2/3': '2 / 3',
        '9/16': '9 / 16',
      },
      
      // Backdrop blur
      backdropBlur: {
        'xs': '2px',
      },
      
      // Tamaños de línea
      lineHeight: {
        '12': '3rem',
        '14': '3.5rem',
        '16': '4rem',
      },
      
      // Tamaños de letra
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [
    // Plugin para formularios
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    
    // Plugin personalizado para componentes BaruLogix
    function({ addComponents, theme }) {
      addComponents({
        // Botones BaruLogix
        '.btn-barulogix': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          fontSize: theme('fontSize.base'),
          fontWeight: theme('fontWeight.medium'),
          borderRadius: theme('borderRadius.lg'),
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${theme('colors.primary.500')}40`,
          },
        },
        
        // Tarjetas BaruLogix
        '.card-barulogix-modern': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.barulogix-lg'),
          boxShadow: theme('boxShadow.barulogix'),
          border: `1px solid ${theme('colors.gray.100')}`,
          padding: theme('spacing.6'),
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: theme('boxShadow.barulogix-lg'),
            transform: 'translateY(-4px)',
          },
        },
        
        // Inputs BaruLogix
        '.input-barulogix-modern': {
          width: '100%',
          padding: `${theme('spacing.3')} ${theme('spacing.4')}`,
          fontSize: theme('fontSize.base'),
          color: theme('colors.gray.900'),
          backgroundColor: theme('colors.white'),
          border: `1px solid ${theme('colors.gray.300')}`,
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.sm'),
          transition: 'all 0.2s ease-in-out',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.primary.500'),
            boxShadow: `0 0 0 3px ${theme('colors.primary.500')}20`,
          },
          '&::placeholder': {
            color: theme('colors.gray.500'),
          },
        },
      })
    },
  ],
}

