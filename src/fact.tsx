import { as, Text } from 'folds';
import React from 'react';
import cons from './client/state/cons';

export const RandomFact = as<'span'>(
    (
        ref
    ) => {
        const facts = [
            "First idea was to fork SchildiChat for Android. Not the best idea.",
            `${cons.name} is based on Cinny.`,
            "What is 'Matrix Specification'? Is it a thing all clients should follow?",
            `The only reason of rewriting message composer was mobile compatibility.`
        ];
        const fact = facts[Math.floor(Math.random() * facts.length)];
        return (
            <Text>
                {fact}
            </Text>
        );
    }
);