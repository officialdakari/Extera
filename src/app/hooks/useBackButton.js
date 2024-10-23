import { useCallback, useEffect } from "react";

export const useBackButton = (callback) => {
    const cb = useCallback((evt) => {
        evt.preventDefault();
        callback();
    }, [callback]);

    useEffect(() => {
        addEventListener('popstate', cb);

        return () => {
            removeEventListener('popstate', cb);
        };
    }, []);
};

export const BackButtonHandler = ({ callback }) => {
    useBackButton(callback);
    return null;
};