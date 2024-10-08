import { TouchEvent, useState } from "react";

export const useSwipeLeft = (handleReplyId: (replyId: string | null) => void) => {
    // States used for swipe-left-reply. Used for animations and determining whether we should reply or not.
    const [isTouchingSide, setTouchingSide] = useState(false);
    const [sideMoved, setSideMoved] = useState(0);
    const [sideMovedInit, setSideMovedInit] = useState(0);
    const [swipingId, setSwipingId] = useState("");

    // Touch handlers for the Message components. If touch starts at 90% of the right, it will trigger the swipe-left-reply.
    let lastTouch = 0, sideVelocity = 0;
    function onTouchStart(event: TouchEvent, replyId: string | undefined) {
        if (event.touches.length != 1) return setTouchingSide(false);
        if (
            event.touches[0].clientX > window.innerWidth * 0.7 &&
            !Array.from(document.elementsFromPoint(event.touches[0].clientX, event.touches[0].clientY)[0].classList).some(c => c.startsWith("ImageViewer")) // Disable gesture if ImageViewer is up. There's probably a better way I don't know
        ) {
            setTouchingSide(true);
            setSideMoved(event.touches[0].clientX);
            setSideMovedInit(event.touches[0].clientX);
            setSwipingId(replyId || "");
            lastTouch = Date.now();
        }
    }
    function onTouchEnd(event: TouchEvent) {
        if (isTouchingSide) {
            if (sideMoved) {
                setSideMovedInit(sideMovedInit => {
                    //  || sideVelocity <= -(window.innerWidth * 0.05 / 250)
                    if ((sideMoved - sideMovedInit) < -(window.innerWidth * 0.15)) setSwipingId(swipingId => {
                        event.preventDefault();
                        setTimeout(() => handleReplyId(swipingId), 100);
                        return "";
                    });
                    return 0;
                });
            }
            setSideMoved(0);
        }
        setTouchingSide(false);
    }
    function onTouchMove(event: TouchEvent, replyId: string | undefined) {
        if (event.touches.length != 1) return;
        if (isTouchingSide) {
            event.preventDefault();
            if (swipingId == replyId) {
                if (event.changedTouches.length != 1) setSideMoved(0);
                else setSideMoved(sideMoved => {
                    const newSideMoved = event.changedTouches[0].clientX;
                    //sideVelocity = (newSideMoved - sideMoved); // / (Date.now() - lastTouch);  
                    //lastTouch = Date.now();
                    return newSideMoved;
                });
            }
        }
    }

    return {
        isTouchingSide,
        sideMoved,
        sideMovedInit,
        swipingId,
        onTouchStart,
        onTouchMove,
        onTouchEnd
    }
}