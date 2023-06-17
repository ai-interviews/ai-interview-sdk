import { ConversationChain } from "langchain/chains";
import { Questions } from "../constants/questions.ts";
import { callOpenAi, initializeOpenAi } from "./openai.ts";
import { Prompts } from "../constants/prompts.ts";

/**
 *
 * @param array Array of strings to be shuffled
 * @returns New array with same strings in a different order
 */
const shuffle = (array: string[]) => {
  let currentIndex = array.length;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
};

export class Interviewer {
  // Used to call OpenAI
  private chain: ConversationChain;

  // Number of required questions to pull from question bank
  private numRequiredQuestions: number;

  // Question bank of possible questions for interviewer to ask
  private questionBank: string[];

  // Index of question to ask next
  private currentQuestionIndex: number;

  // List of questions (in-order) that interviewer will ask
  private questions: string[];

  // LLM will refer to candidate by name if provided
  private candidateName?: string;

  /**
   *
   * @param numRequiredQuestions Number of required questions to pull from question bank
   * @param questions If provided, will override default question bank
   * @param candidateName Interviewer will refer to candidate by name if provided
   */
  public constructor({
    numRequiredQuestions,
    questions,
    candidateName,
  }: {
    numRequiredQuestions: number;
    questions?: string[];
    candidateName?: string;
  }) {
    this.numRequiredQuestions = numRequiredQuestions;
    this.questionBank = shuffle(questions || Questions.STAR_METHOD);
    this.candidateName = candidateName;
    this.currentQuestionIndex = 0;
    this.chain = initializeOpenAi();
  }

  /**
   * Must be called before interview begins. Prepares a list of questions, including:
   * - Introductory questions
   * - A required number from the question bank
   * - AI generated follow up questions
   */
  public async init() {
    const resumeQuestion = await callOpenAi(
      this.chain,
      Prompts.GENERATE_RESUME_QUESTION
    );

    // prettier-ignore
    this.questions = [
      Questions.getOpener(this.candidateName),
      shuffle(Questions.INTERVIEW_LAYOUT)[0],
      shuffle(Questions.INTRO)[0],
      Questions.FOLLOW_UP,
      resumeQuestion,
    ];

    // Add the number of required question-bank questions at random
    for (let i = 0; i < this.numRequiredQuestions; i++) {
      this.questions.push(this.questionBank[i], Questions.FOLLOW_UP);
    }
  }

  /**
   *
   * @param candidateResponse Previous response from candidate
   * @returns AI generated comment on the candidate's response, followed by either:
   * - An AI generated follow up question
   * - A question from the question bank
   */
  private async generateResponse(candidateResponse: string): Promise<string> {
    const isFollowUpQuestionGeneratedByOpenAi =
      this.questions[this.currentQuestionIndex] === Questions.FOLLOW_UP;

    const prompt = isFollowUpQuestionGeneratedByOpenAi
      ? Prompts.GENERATE_FOLLOW_UP_QUESTION
      : Prompts.GENERATE_FOLLOW_UP_COMMENT;

    const openAiResponse = await callOpenAi(
      this.chain,
      `
        Interviewer: "${this.questions[this.currentQuestionIndex - 1]}"
        Candidate: "${candidateResponse}"
        ${prompt}
      `
    );

    let fullResponse = "";

    if (isFollowUpQuestionGeneratedByOpenAi) {
      fullResponse = openAiResponse;
    } else {
      fullResponse = openAiResponse + this.questions[this.currentQuestionIndex];
    }

    return fullResponse;
  }

  /**
   *
   * @param candidateResponse Candidate's response to the previous question
   * @returns The next question for the interviewer to ask
   */
  public async getNextQuestion(candidateResponse: string) {
    if (this.currentQuestionIndex === this.questions.length) {
      return;
    }

    if (this.currentQuestionIndex <= 2) {
      return this.questions[this.currentQuestionIndex++];
    }

    const response = await this.generateResponse(candidateResponse);

    this.questions[this.currentQuestionIndex++] = response;

    return response;
  }
}
