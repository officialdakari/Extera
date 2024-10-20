import { TouchEvent, useState } from "react";

export const useSwipeLeft = (handleReplyId: () => void) => {
    // States used for swipe-left-reply. Used for animations and determining whether we should reply or not.
    const [isTouchingSide, setTouchingSide] = useState(false);
    const [sideMoved, setSideMoved] = useState(0);
    const [sideMovedY, setSideMovedY] = useState(0);
    const [sideMovedInit, setSideMovedInit] = useState(0);
    const [sideMovedInitY, setSideMovedInitY] = useState(0);
    const [animate, setAnimate] = useState(false);

    function onTouchStart(event: TouchEvent) {
        if (event.touches.length != 1) return setTouchingSide(false);
        if (
            event.touches[0].clientX > window.innerWidth * 0.5 &&
            !Array.from(document.elementsFromPoint(event.touches[0].clientX, event.touches[0].clientY)[0].classList).some(c => c.startsWith("ImageViewer")) // Disable gesture if ImageViewer is up. There's probably a better way I don't know
        ) {
            setTouchingSide(true);
            setSideMoved(event.touches[0].clientX);
            setSideMovedY(event.touches[0].clientY);
            setSideMovedInit(event.touches[0].clientX);
            setSideMovedInitY(event.touches[0].clientY);
            event.preventDefault();
        }
    }
    function onTouchEnd(event: TouchEvent) {
        if (isTouchingSide) {
            if (sideMoved) {
                setSideMovedInit(sideMovedInit => {
                    //  || sideVelocity <= -(window.innerWidth * 0.05 / 250)
                    if ((sideMoved - sideMovedInit) < -(window.innerWidth * 0.15)) {
                        event.preventDefault();
                        setTimeout(() => handleReplyId(), 100);
                    }
                    return 0;
                });
            }
            setSideMoved(0);
        }
        setTouchingSide(false);
        setAnimate(false);
    }
    function onTouchMove(event: TouchEvent) {
        if (event.touches.length != 1) return;
        if (isTouchingSide) {
            const minY = sideMovedInitY - 50;
            const maxY = sideMovedInitY + 50;
            event.preventDefault();
            if (sideMovedY < minY || sideMovedY > maxY) {
                setAnimate(false);
                setSideMoved(0);
                setSideMovedY(0);
                setTouchingSide(false);
                return;
            }
            if (event.changedTouches.length != 1) {
                setSideMoved(0);
                setSideMovedY(0);
                setAnimate(false);
            } else {
                setSideMoved(sideMoved => {
                    const newSideMoved = event.changedTouches[0].clientX;
                    //sideVelocity = (newSideMoved - sideMoved); // / (Date.now() - lastTouch);  
                    //lastTouch = Date.now();
                    setAnimate((sideMoved - sideMovedInit) < -(window.innerWidth * 0.15));
                    return newSideMoved;
                });
                setSideMovedY(sideMovedY => {
                    const newSideMovedY = event.changedTouches[0].clientY;
                    //sideVelocity = (newSideMoved - sideMoved); // / (Date.now() - lastTouch);  
                    //lastTouch = Date.now();
                    return newSideMovedY;
                });
            }
        }
    }

    return {
        isTouchingSide,
        sideMoved,
        sideMovedInit,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        animate
    }
}