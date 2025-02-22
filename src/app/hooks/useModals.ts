import { createContext, ReactNode, useContext, useState } from 'react';
import { v4 } from 'uuid';

export type ModalsType = {
    addModal: (element: Modal, id?: string) => string;
    removeModal: (id: string) => void;
    hideModal: (id: string) => void;
    showModal: (id: string) => void;
    getModals: () => Record<string, Modal> | undefined;
    getModal: (id: string) => Modal | undefined;
    record: Record<string, Modal> | undefined;
};

export type Modal = {
    node: ReactNode;
    allowClose?: boolean;
    hidden?: boolean;
    title?: string;
    externalUrl?: string;
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
        addModal: (element, cid) => {
            const id = cid || v4();
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
        hideModal: (id: string) => {
            setRecord(o => {
                const updatedRecord = { ...o };
                updatedRecord[id].hidden = true;
                return updatedRecord;
            });
        },
        showModal: (id: string) => {
            setRecord(o => {
                const updatedRecord = { ...o };
                updatedRecord[id].hidden = false;
                return updatedRecord;
            });
        },
        record
    };

    return modals;
}
