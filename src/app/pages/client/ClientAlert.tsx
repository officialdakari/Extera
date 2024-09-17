import React, { ReactNode } from 'react';

import * as css from './ClientAlert.css';

export default function ClientAlert({ children, ...props }: any) {
    return (
        <div className={css.ClientAlert} {...props}>
            {children}
        </div>
    );
}