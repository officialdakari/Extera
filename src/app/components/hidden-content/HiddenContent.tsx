import React, { ReactNode } from 'react';
import { getText } from '../../../lang';

type HiddenContentProps = {
    reason?: string;
    children: ReactNode | ReactNode[];
};
export default function HiddenContent({ reason, children }: HiddenContentProps) {
    return reason
        ? <details>
            <summary><b>{getText('hidden_content', getText(reason))}</b></summary>
            {children}
        </details>
        : children;
}