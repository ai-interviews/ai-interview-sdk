import { ConversationChain } from "langchain/chains";
import { STAR_METHOD_QUESTIONS } from "../constants/questions.ts";
import { callOpenAi } from "../openai.ts";
import { RESUME_PROMPT } from "../constants/prompt.ts";

const FOLLOW_UP_QUESTION = "follow-up";

export class Interviewer {
  private chain: ConversationChain;
  private numQuestions: number;
  private questionBank: string[];
  private currentQuestionIndex: number;
  private questions: string[];
  private candidateName?: string;

  public constructor({
    chain,
    numQuestions,
    questions,
    candidateName,
  }: {
    chain: ConversationChain;
    numQuestions: number;
    questions?: string[];
    candidateName?: string;
  }) {
    this.chain = chain;
    this.numQuestions = numQuestions;
    this.questionBank = questions || STAR_METHOD_QUESTIONS;
    this.candidateName = candidateName;
    this.currentQuestionIndex = 0;
  }

  public async init() {
    const resumeQuestion = await callOpenAi(this.chain, RESUME_PROMPT);

    // prettier-ignore
    this.questions = [
      `Hey ${this.candidateName ? this.candidateName : ""}, thanks for joining me today. How're you doing?`,
      "That's good to hear! I'm doing alright myself, lot's of interviews today but keeping up with the pace. So, here's the plan for today's interview: we'll start with some introductions, dive into questions about your resume, explore your past experiences, and leave room for any questions you may have. Sound good?",
      "Great. So to give you a bit of background about myself, I've been working in HR for over a decade. I started my career in HR when I graduated from the University of Washington, but I quickly transitioned to a more focused role in technical recruitment, and I've been at Company Inc. for two years now where I've been able to collaborate with the other teams and identify candidates who I think would fit well here. So, why don't you tell me a little about yourself before we get started?",
      FOLLOW_UP_QUESTION,
      resumeQuestion,
    ];

    for (let i = 0; i < this.numQuestions; i++) {
      this.questions.push(this.questionBank[i], FOLLOW_UP_QUESTION);
    }
  }

  private async generateResponse(candidateResponse: string): Promise<string> {
    let fullResponse = "";

    const shouldAskFollowUp =
      this.questions[this.currentQuestionIndex] === FOLLOW_UP_QUESTION;

    const prompt = shouldAskFollowUp
      ? "Now generate a comment with a follow up question about their response."
      : "Now generate ONLY a comment.";

    const response = await callOpenAi(
      this.chain,
      `
        Interviewer: "${this.questions[this.currentQuestionIndex - 1]}"
        Candidate: "${candidateResponse}"
        ${prompt}
      `
    );

    if (shouldAskFollowUp) {
      fullResponse = response;
    } else {
      fullResponse = response + this.questions[this.currentQuestionIndex];
    }

    return fullResponse;
  }

  public async getNextQuestion(candidateResponse: string) {
    if (this.currentQuestionIndex <= 2) {
      return this.questions[this.currentQuestionIndex++];
    }

    const response = await this.generateResponse(candidateResponse);

    this.questions[this.currentQuestionIndex++] = response;

    return response;
  }
}
