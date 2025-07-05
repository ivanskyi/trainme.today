import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface Option {
  option_id: string;
  text: string;
}

interface Question {
  question_id: string;
  question_text: string;
  options: Option[];
  correct_option_id: string;
}

interface Test {
  test_id: string;
  test_title: string;
  questions: Question[];
}

interface Topic {
  id: string;
  name: string;
  description: string;
  tests: Test[];
}

interface TestProgress {
  currentQuestionIndex: number;
  answers: { [questionId: string]: string };
  correctAnswers: { [questionId: string]: boolean };
  completed: boolean;
  score: number;
}

@Component({
  selector: 'app-topic',
  templateUrl: './topic.component.html',
  styleUrls: ['./topic.component.scss']
})
export class TopicComponent implements OnInit {
  topic: Topic | null = null;
  currentTestIndex = 0;
  currentQuestionIndex = 0;
  answers: { [questionId: string]: string } = {};
  result: number | null = null;
  showResults = false;
  wrongQuestions: Question[] = [];
  private topicId: string | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.topicId = params.get('id');
      if (this.topicId) {
        this.loadTopic(this.topicId);
      }
    });
  }

  loadTopic(id: string) {
    this.http.get<{ topic: Topic }>(`assets/topics/${id}.json`).subscribe({
      next: data => {
        this.topic = data.topic;
        this.loadAnswers();
      },
      error: err => {
        console.error('Error loading topic JSON:', err);
      }
    });
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  selectOption(questionId: string, optionId: string) {
    this.answers[questionId] = optionId;
    this.saveAnswers();

    if (this.currentQuestionIndex < this.topic!.tests[this.currentTestIndex].questions.length - 1) {
      setTimeout(() => {
        this.currentQuestionIndex++;
        this.saveAnswers();
      }, 300);
    } else {
      setTimeout(() => {
        this.finishTest();
      }, 300);
    }
  }

  saveAnswers() {
    if (!this.topicId) return;

    const state = {
      answers: this.answers,
      currentQuestionIndex: this.currentQuestionIndex,
      currentTestIndex: this.currentTestIndex,
      showResults: this.showResults
    };

    localStorage.setItem(`quizState_${this.topicId}`, JSON.stringify(state));
  }

  loadAnswers() {
    if (!this.topicId) return;

    const savedState = localStorage.getItem(`quizState_${this.topicId}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        this.answers = state.answers || {};
        this.currentQuestionIndex = state.currentQuestionIndex || 0;
        this.currentTestIndex = state.currentTestIndex || 0;
        this.showResults = state.showResults || false;

        if (this.showResults) {
          this.calculateResult();
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
        this.resetTestState();
      }
    }
  }

  calculateResult() {
    if (!this.topic) return;

    const test = this.topic.tests[this.currentTestIndex];
    let correctCount = 0;
    this.wrongQuestions = [];
    const correctAnswers: { [questionId: string]: boolean } = {};

    for (const question of test.questions) {
      const userAnswer = this.answers[question.question_id];
      const isCorrect = userAnswer === question.correct_option_id;

      if (isCorrect) {
        correctCount++;
      } else if (userAnswer) {
        this.wrongQuestions.push(question);
      }

      correctAnswers[question.question_id] = isCorrect;
    }

    this.result = correctCount;

    if (this.topicId) {
      const testProgress: TestProgress = {
        currentQuestionIndex: this.currentQuestionIndex,
        answers: this.answers,
        correctAnswers: correctAnswers,
        completed: true,
        score: correctCount
      };
      localStorage.setItem(`test_progress_${this.topicId}`, JSON.stringify(testProgress));
    }
  }

  nextQuestion() {
    if (!this.topic) return;
    const questions = this.topic.tests[this.currentTestIndex].questions;
    if (this.currentQuestionIndex < questions.length - 1) {
      this.currentQuestionIndex++;
      this.saveAnswers();
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.saveAnswers();
    }
  }

  nextTest() {
    if (!this.topic) return;
    if (this.currentTestIndex < this.topic.tests.length - 1) {
      this.currentTestIndex++;
      this.resetTestState();
    }
  }

  prevTest() {
    if (!this.topic) return;
    if (this.currentTestIndex > 0) {
      this.currentTestIndex--;
      this.resetTestState();
    }
  }

  resetTestState() {
    this.currentQuestionIndex = 0;
    this.answers = {};
    this.result = null;
    this.showResults = false;
    this.wrongQuestions = [];
    this.saveAnswers();
  }

  clearTestProgress() {
    if (this.topicId) {
      localStorage.removeItem(`quizState_${this.topicId}`);
      localStorage.removeItem(`test_progress_${this.topicId}`);
    }
    this.currentTestIndex = 0;
    this.resetTestState();
  }

  finishTest() {
    this.calculateResult();
    this.showResults = true;
    this.saveAnswers();
  }

  restartCurrentTest() {
    this.resetTestState();
  }

  viewDetailedResults() {
    if (this.topicId) {
      this.router.navigate(['/test-result'], { queryParams: { id: this.topicId } });
    }
  }

  getProgressPercentage(): number {
    if (!this.topic) return 0;
    const totalQuestions = this.topic.tests[this.currentTestIndex].questions.length;
    return ((this.currentQuestionIndex + 1) / totalQuestions) * 100;
  }

  getScorePercentage(): number {
    if (!this.topic || this.result === null) return 0;
    const totalQuestions = this.topic.tests[this.currentTestIndex].questions.length;
    return (this.result / totalQuestions) * 100;
  }

  isCurrentQuestionAnswered(): boolean {
    if (!this.topic) return false;
    const currentQuestion = this.topic.tests[this.currentTestIndex].questions[this.currentQuestionIndex];
    return !!this.answers[currentQuestion.question_id];
  }

  getAnsweredCount(): number {
    if (!this.topic) return 0;
    const questions = this.topic.tests[this.currentTestIndex].questions;
    return questions.filter(q => this.answers[q.question_id]).length;
  }
}
