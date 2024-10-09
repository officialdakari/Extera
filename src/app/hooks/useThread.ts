import { Thread } from 'matrix-js-sdk';
import { createContext, useContext } from 'react';

const ThreadContext = createContext<Thread | null>(null);

export const ThreadProvider = ThreadContext.Provider;

export function useThread(): Thread {
    const thread = useContext(ThreadContext);
    if (!thread) throw new Error('Thread not provided!');
    return thread;
}
