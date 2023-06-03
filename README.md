## AI interview bot

Early phase (still in development) of JavaScript interview browser SDK to run AI-powered interviews

## Environment Setup

Local testing instructions. Make sure you have [node](https://nodejs.org/en/download) installed on your machine first.

1. Clone the repo
2. Open terminal and navigate to root directory
3. Run `npm install`
4. Run `nodemon index.ts`
5. Run `http-server src`

## Directory structure

#### `server` directory

Express server that handles incoming socket connection from SDK and all conversational logic. To be deployed.

- `index.ts` is the main entry point
- `openai.ts` initializes the chat SDK and provides a helper
- `speech.ts` initializes the Azure Speech SDK and provides helpers

#### `sdk` directory

Code for the SDK to be integrated into any web platform. This calls our own server. To be published on NPM directory.

- `index.ts` export Interview class for SDK usage
- `audioBufferToWav.ts` helper to convert `webm` audio chunks to `wav`
- `audio-worklet-processor.js` handle and pass on chunks of the incoming audio stream
- `__tests__` for unit tests to be added to (not yet started)

## Process diagram

<img src="https://www.plantuml.com/plantuml/png/VP31Rk8m48RlynIZx3ah8M0FQ3TYsueUUga4FPKU9lP4M2Hsv8nLGDpx5EsXZzOdAII10eNwvF7_VRyq7bP2NaAH0sJE2NkC_bPcnODEF_buUSTsw2N_TjTkCXRFLB16JK9eBAfPiFDgQh_CjzVp9bkDbEUDIOBEAiRwJ6q484Ponl7D7OvozupNC_82G4gSnuUAFLA512LvCSgKP0MZaNTMaAsEjc5w75wHckyp1Mp5o1AZ_wlWUMh79REQnUBY2I-aPlIUkRsVr2zyQctPhTFODPC11N4s52bxx01X_FZBitwAamHJ761X51fR1e4KupX1XODcnjHOyakae8q3MA_NS5ZL_Tq1LHlwlA5FweGNyhscrzGao1lma6HiRHVaijxVwTa9cM5yxF-ypPzsb_I2a1v-6ssWgcIQiwzQ6ePiTIZoJm00" width="480">
