import { useCallback, useEffect, useState } from "react";
import { v4 } from "uuid";

export const useBackButton = (callback, fakeId) => {
    const fi2 = `${fakeId}-2`;
    const cb = (evt) => {
        console.log(`popstate`, evt, evt.state, history.state, fakeId);
        if (history.state === fakeId) {
            callback();
        }
    };

    useEffect(() => {
        addEventListener('popstate', cb);

        history.pushState(fakeId, document.title, location.href);
        history.pushState(fi2, document.title, location.href);

        return () => {
            removeEventListener('popstate', cb);
            if (history.state === fi2) {
                history.go(-2);
            } else if (history.state == fakeId) {
                history.back();
            }
        };
    }, []);
};

export const BackButtonHandler = ({ callback, id }) => {
    useBackButton(callback, id ?? 'fake-route');
    return null;
};