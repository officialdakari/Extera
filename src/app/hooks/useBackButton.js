import { useEffect } from "react";

export const useBackButton = (callback) => {
    useEffect(() => {
        // Add a fake history event so that the back button does nothing if pressed once
        window.history.pushState('fake-route', document.title, window.location.href);

        addEventListener('popstate', callback);

        // Here is the cleanup when this component unmounts
        return () => {
            removeEventListener('popstate', callback);
            // If we left without using the back button, aka by using a button on the page, we need to clear out that fake history event
            if (window.history.state === 'fake-route') {
                window.history.back();
            }
        };
    }, []);
};