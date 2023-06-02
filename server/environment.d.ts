declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
      AZURE_CONGITIVE_SERVICES_SPEECH_KEY: string;
    }
  }
}

export {};
