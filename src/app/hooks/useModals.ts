import { createContext, ReactNode, useContext, useState } from 'react';
import { v4 } from 'uuid';

export type ModalsType = {
    addModal: (element: Modal) => string;
    removeModal: (id: string) => void;
    getModals: () => Record<string, Modal> | undefined;
    getModal: (id: string) => Modal | undefined;
    record: Record<string, Modal> | undefined;
};

type Modal = {
    node: ReactNode;
    allowClose?: boolean;
    title?: string;
};

const ModalsContext = createContext<ModalsType | undefined>(undefined);

export const ModalsProvider = ModalsContext.Provider;

export function useModals(): ModalsType {
    const modals = useContext(ModalsContext);
    if (!modals) throw new Error('Modals not initialized!');
    return modals;
}

export function createModals(): ModalsType {
    const [record, setRecord] = useState<Record<string, Modal>>({});

    const modals: ModalsType = {
        addModal: (element) => {
            const id = v4();
            setRecord(o => {
                const updatedRecord = { ...o, [id]: element };
                return updatedRecord;
            });
            return id;
        },
        getModal: (id: string): Modal | undefined => record[id] ?? undefined,
        getModals: (): Record<string, Modal> | undefined => record,
        removeModal: (id: string) => {
            setRecord(o => {
                const updatedRecord = { ...o };
                delete updatedRecord[id];
                return updatedRecord;
            });
        },
        record
    };

    return modals;
}
