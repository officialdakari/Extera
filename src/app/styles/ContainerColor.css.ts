import { ComplexStyleRule } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { DefaultReset } from 'folds';

const vars: Record<'surface' | 'primary' | 'secondary' | 'success' | 'warning' | 'error', ComplexStyleRule> = {
	'surface': {
		backgroundColor: 'var(--mui-palette-background-paper)',
		color: 'var(--mui-palette-text-primary)',
	},
	'primary': {
		backgroundColor: 'var(--mui-palette-primary-main)',
		color: 'var(--mui-palette-text-primary)',
	},
	'secondary': {
		backgroundColor: 'var(--mui-palette-secondary-main)',
		color: 'var(--mui-palette-text-secondary)',
	},
	'success': {
		backgroundColor: 'var(--mui-palette-success-main)',
		color: 'var(--mui-palette-success-contrastText)',
	},
	'warning': {
		backgroundColor: 'var(--mui-palette-warning-main)',
		color: 'var(--mui-palette-warning-contrastText)',
	},
	'error': {
		backgroundColor: 'var(--mui-palette-error-main)',
		color: 'var(--mui-palette-error-contrastText)',
	}
};

const getVariant = (variant: 'surface' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'): ComplexStyleRule => ({
	...vars[variant],
	borderColor: 'var(--mui-palette-divider)',
	outlineColor: 'var(--mui-palette-divider)',
});

export const ContainerColor = recipe({
	base: [DefaultReset],
	variants: {
		variant: {
			surface: getVariant('surface'),
			primary: getVariant('primary'),
			secondary: getVariant('secondary'),
			success: getVariant('success'),
			warning: getVariant('warning'),
			error: getVariant('error'),
		},
	},
	defaultVariants: {
		variant: 'surface',
	},
});

export type ContainerColorVariants = RecipeVariants<typeof ContainerColor>;
