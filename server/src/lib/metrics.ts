export class Metrics {
  public wordCount: Record<string, number>;
  public answerTimesSeconds: number[];
  private startTime?: Date;

  public constructor() {
    this.wordCount = {};
    this.answerTimesSeconds = [];
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
   */
  public endAnswerTimer() {
    const endTime = new Date();

    this.answerTimesSeconds.push(
      Math.round(
        Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000)
      )
    );

    this.startTime = undefined;
  }

  /**
   * Tracks and stores number of occurences of every word in candidate response.
   * @param response Candidates previous response
   */
  public trackWordsFromResponse(response: string) {
    const words = response.split(" ");
    for (const word of words) {
      this.wordCount[word] = (this.wordCount[word] || 0) + 1;
    }
  }
}
