import { useMemo } from 'react';

import { EmojiGroupId } from '../../plugins/emoji';
import { mdiCup, mdiEmoticon, mdiFlag, mdiImage, mdiLamp, mdiLeaf, mdiPeace, mdiTennisBall } from '@mdi/js';

export type IEmojiGroupIcons = Record<EmojiGroupId, string>;

export const useEmojiGroupIcons = (): IEmojiGroupIcons =>
  useMemo(
    () => ({
      [EmojiGroupId.People]: mdiEmoticon,
      [EmojiGroupId.Nature]: mdiLeaf,
      [EmojiGroupId.Food]: mdiCup,
      [EmojiGroupId.Activity]: mdiTennisBall,
      [EmojiGroupId.Travel]: mdiImage,
      [EmojiGroupId.Object]: mdiLamp,
      [EmojiGroupId.Symbol]: mdiPeace,
      [EmojiGroupId.Flag]: mdiFlag,
    }),
    []
  );
