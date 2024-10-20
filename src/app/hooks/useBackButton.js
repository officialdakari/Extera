import { useEffect } from "react";
import { v4 } from "uuid";

export const useBackButton = (callback) => {
    const routeId = `fake-route-${v4()}`;
    const cb = () => {
        if (history.state === routeId) callback();
    };

    useEffect(() => {
        // Add a fake history event so that the back button does nothing if pressed once
        window.history.pushState(routeId, document.title, window.location.href);

        addEventListener('popstate', cb);

        // Here is the cleanup when this component unmounts
        return () => {
            removeEventListener('popstate', cb);
            // If we left without using the back button, aka by using a button on the page, we need to clear out that fake history event
            if (window.history.state === routeId) {
                window.history.back();
            }
        };
    }, []);
};