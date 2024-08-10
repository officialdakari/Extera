import { Box } from 'folds';
import React, { ReactNode } from 'react';
import { CompactLayout, ModernLayout } from '..';
import Icon from '@mdi/react';

export type EventContentProps = {
  messageLayout: number;
  time: ReactNode;
  iconSrc: string;
  content: ReactNode;
};
export function EventContent({ messageLayout, time, iconSrc, content }: EventContentProps) {
  const beforeJSX = (
    <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
      {messageLayout === 1 && time}
      <Box
        grow={messageLayout === 1 ? undefined : 'Yes'}
        alignItems="Center"
        justifyContent="Center"
      >
        <Icon style={{ opacity: 0.6 }} size={0.8} path={iconSrc} />
      </Box>
    </Box>
  );

  const msgContentJSX = (
    <Box justifyContent="SpaceBetween" alignItems="Baseline" gap="200">
      {content}
      {messageLayout !== 1 && time}
    </Box>
  );

  return messageLayout === 1 ? (
    <CompactLayout before={beforeJSX}>{msgContentJSX}</CompactLayout>
  ) : (
    <ModernLayout before={beforeJSX}>{msgContentJSX}</ModernLayout>
  );
}
