declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
      AZURE_COGNITIVE_SERVICES_SPEECH_KEY: string;
    }
  }
}

export {};
