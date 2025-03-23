import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ItemDraggableTarget = style({
	height: '100%',
	display: 'flex',
	alignSelf: 'center',
	paddingRight: '10px',
	zIndex: 1,
	cursor: 'grab',
	opacity: config.opacity.P300,

	':active': {
		cursor: 'ns-resize',
	},
});

const LineHeight = 4;
const DropTargetLine = style({
	selectors: {
		'&[data-hover=true]:before': {
			content: '',
			display: 'block',
			width: '100%',

			position: 'absolute',
			left: 0,
			top: '50%',
			zIndex: 1,
			transform: 'translateY(-50%)',

			borderBottom: `${toRem(LineHeight)} solid currentColor`,
		},
		'&[data-hover=true]:after': {
			content: '',
			display: 'block',
			width: toRem(LineHeight * 3),
			height: toRem(LineHeight * 3),

			position: 'absolute',
			left: 0,
			top: '50%',
			zIndex: 1,
			transform: 'translate(-50%, -50%)',

			backgroundColor: 'var(--mui-palette-background-paper)',
			border: `${toRem(LineHeight)} solid currentColor`,
			borderRadius: '50%',
		},
	},
});

const BaseAfterRoomItemDropTarget = style({
	width: '100%',

	position: 'absolute',
	left: 0,
	bottom: 0,
	zIndex: 99,

	color: 'var(--mui-palette-success-main)',

	selectors: {
		'&[data-error=true]': {
			color: 'var(--mui-palette-error-main)',
		},
	},
});
const RoomTargetHeight = 32;
export const AfterRoomItemDropTarget = style([
	BaseAfterRoomItemDropTarget,
	{
		height: toRem(RoomTargetHeight),
		transform: `translateY(${toRem(RoomTargetHeight / 2 + LineHeight / 2)})`,
	},
	DropTargetLine,
]);
const SpaceTargetHeight = 14;
export const AfterSpaceItemDropTarget = style([
	BaseAfterRoomItemDropTarget,
	{
		height: toRem(SpaceTargetHeight),
		transform: `translateY(calc(100% - ${toRem(4)}))`,
	},
	DropTargetLine,
]);
