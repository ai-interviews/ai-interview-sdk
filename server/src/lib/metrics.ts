export class Metrics {
  private wordFrequency: Record<string, number>;
  private interviewStartTime: Date;
  private startTime?: Date;
  private quietStartTime?: Date;
  private quietTimeSeconds: number;
  private totalQuietTimeSeconds: number;

  public constructor() {
    this.wordFrequency = {};
    this.interviewStartTime = new Date();
    this.quietTimeSeconds = 0;
    this.totalQuietTimeSeconds = 0;
  }

  /**
   * Start timer for current quiet period (no speech detected)
   */
  public startQuietTimeTimer() {
    if (!this.quietStartTime) {
      console.log("start quiet time");
      this.quietStartTime = new Date();
    }
  }

  /**
   * Start timer for current candidate response
   */
  public startAnswerTimer() {
    if (!this.startTime) {
      this.startTime = new Date();
    }
  }

  /**
   * End timer for current candidate response and store answer time
   * @returns Answer time in seconds
   */
  private endAnswerTimer() {
    if (!this.startTime) {
      return 0;
    }

    const endTime = new Date();

    const answerTime = Math.round(
      Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000)
    );

    this.startTime = undefined;

    return answerTime;
  }

  /**
   * End timer for current candidate quiet time and add to total quiet time
   * @returns Answer period time in seconds
   */
  public endQuietTimeTimer() {
    if (!this.quietStartTime) {
      return this.quietTimeSeconds;
    }

    console.log("end quiet time");

    const endTime = new Date();

    const quietTimeSeconds = Math.round(
      Math.floor((endTime.getTime() - this.quietStartTime.getTime()) / 1000)
    );

    this.quietStartTime = undefined;
    this.quietTimeSeconds += quietTimeSeconds;

    return this.quietTimeSeconds;
  }

  /**
   * End timer for current candidate quiet time and add to total quiet time
   * @returns Answer period time in seconds
   */
  public resetQuietTimeTimer() {
    const quietTimeSeconds = this.endQuietTimeTimer();
    this.totalQuietTimeSeconds += quietTimeSeconds;
    this.quietTimeSeconds = 0;

    return quietTimeSeconds;
  }

  /**
   * Tracks and stores number of occurences of every word in candidate response.
   * @param response Candidates previous response
   * @returns Word frequency mapping for response
   */
  private trackWordsFromResponse(response: string) {
    const words = response.split(" ");
    const responseWordFrequency: Record<string, number> = {};

    for (const word of words) {
      const strippedWord = word
        .toLowerCase()
        .replace(/[.,\/#!?$%\^&\*;:{}=\-_`~()]/g, "");

      this.wordFrequency[strippedWord] =
        (this.wordFrequency[strippedWord] || 0) + 1;
      responseWordFrequency[strippedWord] =
        (responseWordFrequency[strippedWord] || 0) + 1;
    }

    return responseWordFrequency;
  }

  /**
   * Ends answer timer, stores answer metrics into aggregate metrics, and returns answer metrics
   * @param response Candidates previous response
   * @returns Answer time in seconds and word frequency mapping for response
   */
  public getAnswerMetrics(response: string) {
    const answerTimeSeconds = this.endAnswerTimer();
    const wordFrequency = this.trackWordsFromResponse(response);

    return { answerTimeSeconds, wordFrequency };
  }

  /**
   * @returns Answer time in seconds and word frequency mapping for entire interview (aggregate of responses)
   */
  public getInterviewMetrics() {
    const endTime = new Date();

    const lengthSeconds = Math.round(
      Math.floor((endTime.getTime() - this.interviewStartTime.getTime()) / 1000)
    );

    return {
      lengthSeconds,
      wordFrequency: this.wordFrequency,
    };
  }
}
