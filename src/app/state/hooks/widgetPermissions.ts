import { atom, useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import { permissionsAtom as pAtom, Permissions } from '../widgetPermissions';

export type PermissionsSetter<K extends keyof Permissions> =
    | Permissions[K]
    | ((s: Permissions[K]) => Permissions[K]);

export const useSetPermission = <K extends keyof Permissions>(permissionsAtom: typeof pAtom, key: K) => {
    const setterAtom = useMemo(
        () =>
            atom<null, [PermissionsSetter<K>], undefined>(null, (get, set, value) => {
                const s = { ...get(permissionsAtom) };
                s[key] = typeof value === 'function' ? value(s[key]) : value;
                set(permissionsAtom, s);
            }),
        [permissionsAtom, key]
    );

    return useSetAtom(setterAtom);
};

export const usePermission = <K extends keyof Permissions>(
    permissionsAtom: typeof pAtom,
    key: K
): [Permissions[K], ReturnType<typeof useSetPermission<K>>] => {
    const selector = useMemo(() => (s: Permissions) => s[key], [key]);
    const setting = useAtomValue(selectAtom(permissionsAtom, selector));

    const setter = useSetPermission(permissionsAtom, key);
    return [setting, setter];
};
