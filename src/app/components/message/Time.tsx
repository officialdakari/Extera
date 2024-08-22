import React, { ComponentProps } from 'react';
import { Text, as } from 'folds';
import { timeDayMonYear, timeHourMinute, today, yesterday } from '../../utils/time';
import { getText } from '../../../lang';

export type TimeProps = {
    compact?: boolean;
    ts: number;
};

export const Time = as<'span', TimeProps & ComponentProps<typeof Text>>(
    ({ compact, ts, ...props }, ref) => {
        let time = '';
        if (compact) {
            time = timeHourMinute(ts);
        } else if (today(ts)) {
            time = timeHourMinute(ts);
        } else if (yesterday(ts)) {
            time = getText('time.yesterday', timeHourMinute(ts));
        } else {
            time = new Date(ts).toLocaleString();
        }

        return (
            <Text as="time" style={{ flexShrink: 0 }} size="T200" priority="300" {...props} ref={ref}>
                {time}
            </Text>
        );
    }
);
