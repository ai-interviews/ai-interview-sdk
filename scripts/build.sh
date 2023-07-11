#!/bin/bash -ex

npm run typecheck
npm run lint

rm -rf dist
tsc -p .
rm -fr dist/__tests__
cp src/audio-worklet-processor.js dist/