import React from 'react';
import { AnimatePresence } from 'framer-motion';

export default function LocationProvider({ children }: any) {
    return <AnimatePresence>{children}</AnimatePresence>;
}