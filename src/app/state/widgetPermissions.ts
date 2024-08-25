import { atom } from "jotai";
import cons from "../../client/state/cons";

const STORAGE_KEY = 'widgets_permissions';

export type Permissions = {
    sendEvents: boolean;
    sendScreenshot: boolean;
    receiveEvents: boolean;
    sendMembership: boolean;
};

const defaultPermissions: Permissions = {
    receiveEvents: false,
    sendEvents: false,
    sendMembership: false,
    sendScreenshot: false
};

export const getPermissions = () => {
    const permissions = localStorage.getItem(STORAGE_KEY);
    if (permissions === null) return defaultPermissions;
    return {
        ...defaultPermissions,
        ...JSON.parse(permissions) as Permissions
    };
};

export const setPermissions = (permissions: Permissions) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
};

const basePermissions = atom<Permissions>(getPermissions());
export const permissionsAtom = atom<Permissions, [Permissions], undefined>(
    (get) => get(basePermissions),
    (get, set, update) => {
        set(basePermissions, update);
        setPermissions(update);
    }
);