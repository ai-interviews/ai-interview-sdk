#!/bin/bash -ex

npm run typecheck
npm run lint
npm run test

rm -rf dist
tsc -p .
rm -fr dist/__tests__
cp src/audio-worklet-processor.js dist/