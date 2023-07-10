export const Questions = {
  // Default question bank
  STAR_METHOD: [
    "So, tell me about a time when you received criticism that you thought was unfair.",
    "Now, tell me about a time you had to overcome a difficult problem at work or school.",
    "Could you now tell me about a time you had to overcome a conflict or disagreement with a coworker.",
  ],

  // Second question to ask candidate
  INTERVIEW_LAYOUT: [
    "That's good to hear! I'm doing alright myself, lot's of interviews today but keeping up with the pace. " +
      "So, here's the plan for today's interview: we'll start with some introductions, dive into questions " +
      "about your resume, explore your past experiences, and leave room for any questions you may have. Sound good?",
  ],

  // Third question to ask candidate
  INTRO: [
    "Great. So to give you a bit of background about myself, I've been working in HR for over a decade. " +
      "I started my career in HR when I graduated from the University of Washington, but I quickly transitioned " +
      "to a more focused role in technical recruitment, and I've been at Company Inc. for two years now where " +
      "I've been able to collaborate with the other teams and identify candidates who I think would fit well here. " +
      "So, why don't you tell me a little about yourself before we get started?",
  ],

  // Placeholder - will prompt LLM to return a follow up question based on candidate's previous response
  FOLLOW_UP: "follow-up",

  // First question to ask candidate
  getOpener: (candidateName?: string) =>
    // prettier-ignore
    `Hey ${candidateName || ""}, thanks for joining me today. How're you doing?`,
};
