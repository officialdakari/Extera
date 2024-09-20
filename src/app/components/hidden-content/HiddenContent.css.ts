import { style } from "@vanilla-extract/css";

export const HiddenContentDiv = style({
    filter: 'blur(20px)',
    padding: '16px',
    boxSizing: 'border-box',
});

export const RevealBtn = style({
    // Убираем absolute позиционирование
    padding: '16px', // Добавляем отступы внутри кнопки
});

export const AbsoluteContainer = style([
    {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
    },
]);