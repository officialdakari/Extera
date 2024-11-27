import { style } from "@vanilla-extract/css";

export const DraggableContainer = style({
    position: 'absolute',
    zIndex: '100'
    //minWidth: '600px'
});

export const DraggableButton = style({
    position: 'absolute',
    zIndex: '101'
});

export const MobileModal = style({
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    zIndex: '100'
});