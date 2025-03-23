/* eslint-disable no-param-reassign */
import React, {
	ChangeEvent,
	ClipboardEventHandler,
	KeyboardEventHandler,
	ReactNode,
	forwardRef,
	useEffect,
} from 'react';
import { Box, PopOut, Scroll } from 'folds';
import * as css from './Editor.css';
import './Editor.scss';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';

type CustomEditorProps = {
	editableName?: string;
	top?: ReactNode;
	bottom?: ReactNode;
	before?: ReactNode;
	after?: ReactNode;
	maxHeight?: string;
	placeholder?: string;
	onKeyDown?: KeyboardEventHandler;
	onKeyUp?: KeyboardEventHandler;
	onChange?: (value: string) => void;
	onPaste?: ClipboardEventHandler;
	textAreaRef: React.RefObject<HTMLTextAreaElement>;
	newDesign?: boolean;
	disabled?: boolean;
	emojiBoard?: ReactNode;
	emojiBoardAnchor?: any;
};

export const CustomEditor = forwardRef<HTMLDivElement, CustomEditorProps>(
	({
		editableName,
		top,
		bottom,
		before,
		after,
		maxHeight = '50vh',
		placeholder,
		onKeyDown,
		onKeyUp,
		onChange,
		onPaste,
		textAreaRef,
		newDesign,
		disabled,
		emojiBoard,
		emojiBoardAnchor
	}, ref) => {
		const updateRows = (target: HTMLTextAreaElement) => {
			target.style.height = `auto`;
			target.style.height = `${target.scrollHeight}px`;
		};
		const screenSize = useScreenSize();
		const handleChange = (evt: ChangeEvent<HTMLTextAreaElement>) => {
			// const previousText = evt.target.dataset.previousText ?? '';
			const newText = evt.target.value;
			evt.target.dataset.previousText = newText;
			// const tagsBefore = Array.from(previousText.matchAll(anyTagRegexp));
			// const tagsAfter = Array.from(newText.matchAll(deleteEndRegexp));
			// const tagsAfter2 = Array.from(newText.matchAll(deleteStartRegexp));
			// const mutual = [
			//     ...tagsAfter.filter(x => tagsBefore.find(y => y.index == x.index)).reverse(),
			//     ...tagsAfter2.filter(x => tagsBefore.find(y => y.index == x.index || (y.index && (y.index - 1 == x.index)))).reverse()
			// ];
			// console.log(tagsBefore, tagsAfter, tagsAfter2);
			// console.log(mutual);
			// console.log(previousText, newText);
			// for (const m of mutual) {
			//     if (m.index)
			//         newText = `${newText.slice(0, m.index)}${newText.slice(m.index + m[0].length)}`;
			// }
			// TODO FIX THAT
			evt.target.value = newText;
			evt.target.dataset.previousText = newText;
			updateRows(evt.target);
			if (onChange)
				onChange(newText);
		};

		useEffect(() => {
			if (textAreaRef.current)
				updateRows(textAreaRef.current);
		}, [textAreaRef]);

		return (
			<div
				ref={ref}
				className={newDesign ? css.EditorNew : css.Editor}
			>
				{top}
				{screenSize !== ScreenSize.Mobile && (
					<PopOut
						offset={16}
						alignOffset={-44}
						position="Top"
						align="End"
						anchor={emojiBoardAnchor}
						content={
							emojiBoard
						}
						style={{ zIndex: 2 }}
					/>
				)}
				<Box alignItems="Start">
					{before && (
						<Box className={css.EditorOptions} alignItems="Center" gap="100" shrink="No">
							{before}
						</Box>
					)}
					<Scroll
						className={css.EditorTextareaScroll}
						style={{ maxHeight }}
						visibility='Hover'
						hideTrack
					>
						<textarea
							className={css.EditorTextarea}
							ref={textAreaRef}
							rows={1}
							style={{ maxHeight }}
							onKeyDown={(evt) => { updateRows(evt.currentTarget); if (onKeyDown) onKeyDown(evt); }}
							onKeyUp={(evt) => { updateRows(evt.currentTarget); if (onKeyUp) onKeyUp(evt); }}
							onPaste={onPaste}
							placeholder={placeholder}
							onChange={handleChange}
							disabled={disabled}
							aria-disabled={disabled}
							data-editable-name={editableName}
						/>
					</Scroll>
					{after && (
						<Box className={css.EditorOptions} alignItems="Center" gap="100" shrink="No">
							{after}
						</Box>
					)}
				</Box>
				{bottom}
				{screenSize === ScreenSize.Mobile && emojiBoard}
			</div>
		);
	}
);
