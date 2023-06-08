export class Metrics {
  public wordCount: Record<string, number>;
  public answerTimesSeconds: number[];
  private startTime?: Date;

  public constructor() {
    this.wordCount = {};
    this.answerTimesSeconds = [];
  }

  public startAnswerTimer() {
    if (!this.startTime) {
      this.startTime = new Date();
    }
  }

  public endAnswerTimer() {
    const endTime = new Date();

    this.answerTimesSeconds.push(
      Math.round(
        Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000)
      )
    );

    this.startTime = undefined;
  }

  public trackWordsFromResponse(response: string) {
    const words = response.split(" ");
    for (const word of words) {
      this.wordCount[word] = (this.wordCount[word] || 0) + 1;
    }
  }
}
