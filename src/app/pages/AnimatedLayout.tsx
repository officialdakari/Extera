import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

type AnimatedLayoutProps = {
    children: ReactNode;
};

const AnimatedLayout = ({ children }: AnimatedLayoutProps) => {
    return (
        <motion.span
            initial="hidden"
            animate="enter"
            exit="exit"
            variants={{
                open: { opacity: 1, x: 0 },
                closed: { opacity: 0, x: "-100%" },
            }}
            transition={{ duration: 0.5, type: 'easeInOut' }}
        >
            {children}
        </motion.span>
    );
};

export default AnimatedLayout;
