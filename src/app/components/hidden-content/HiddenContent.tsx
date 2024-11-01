import React, { ReactNode, useState } from 'react';
import { getText } from '../../../lang';

import * as css from './HiddenContent.css';
import { Button } from '@mui/material';

type HiddenContentProps = {
    reason?: string;
    children: ReactNode | ReactNode[];
};
export default function HiddenContent({ reason, children }: HiddenContentProps) {
    const [show, setShow] = useState(false);
    return reason && !show
        ? (
            <Button
                variant='contained'
                size='large'
                onClick={() => setShow(true)}
            >
                {getText('hidden_content', getText(reason))}
            </Button>
        )
        : children;
}