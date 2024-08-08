import { createContext, useContext } from 'react';
import { MatrixClient } from 'matrix-js-sdk';

const CallContext = createContext<any | null>(null);

export const CallProvider = CallContext.Provider;

export function useRoomCall(): any {
    const call = useContext(CallContext);
    if (!call) throw new Error('Call not initialized!');
    return call;
}
