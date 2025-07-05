import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";

interface Option {
  option_id: string;
  text: string;
}

interface Question {
  question_id: string;
  question_text: string;
  options: Option[];
  correct_option_id: string;
  explanation?: string;
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

interface TestResult {
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

interface TestProgress {
  currentQuestionIndex: number;
  answers: { [questionId: string]: string };
  correctAnswers: { [questionId: string]: boolean };
  completed: boolean;
  score: number;
}

@Component({
  selector: 'app-test-result',
  templateUrl: './test-result.component.html',
  styleUrls: ['./test-result.component.scss']
})
export class TestResultComponent implements OnInit {
  topicId: string = '';
  topicName: string = '';
  results: TestResult[] = [];
  score: number = 0;
  totalQuestions: number = 0;
  percentage: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.topicId = params['id'];
      if (this.topicId) {
        this.loadTestResults();
      }
    });
  }

  loadTestResults() {
    const progress = this.getTestProgress(this.topicId);
    if (!progress || !progress.completed) {
      this.router.navigate(['/topic'], { queryParams: { id: this.topicId } });
      return;
    }

    this.http.get<{ topic: Topic }>(`assets/topics/${this.topicId}.json`).subscribe({
      next: data => {
        this.topicName = data.topic.name;
        // Use the first test for now - you might want to track which test was taken
        const currentTest = data.topic.tests[0];
        this.processResults(currentTest.questions, progress);
      },
      error: err => {
        console.error('Error loading topic data:', err);
      }
    });
  }

  processResults(questions: Question[], progress: TestProgress) {
    this.results = questions.map(question => {
      const userAnswerId = progress.answers[question.question_id];
      const userAnswer = question.options.find(opt => opt.option_id === userAnswerId)?.text || 'No answer';
      const correctAnswer = question.options.find(opt => opt.option_id === question.correct_option_id)?.text || '';
      const isCorrect = progress.correctAnswers[question.question_id] || false;

      return {
        questionId: question.question_id,
        question: question.question_text,
        userAnswer,
        correctAnswer,
        isCorrect,
        explanation: question.explanation
      };
    });

    this.totalQuestions = questions.length;
    this.score = progress.score;
    this.percentage = Math.round((this.score / this.totalQuestions) * 100);
  }

  getTestProgress(topicId: string): TestProgress | null {
    const saved = localStorage.getItem(`test_progress_${topicId}`);
    return saved ? JSON.parse(saved) : null;
  }

  retakeTest() {
    localStorage.removeItem(`test_progress_${this.topicId}`);
    localStorage.removeItem(`quizState_${this.topicId}`);
    this.router.navigate(['/topic'], { queryParams: { id: this.topicId } });
  }

  backToTopics() {
    this.router.navigate(['/dashboard']);
  }

  getScoreColor(): string {
    if (this.percentage >= 80) return '#28a745';
    if (this.percentage >= 60) return '#ffc107';
    return '#dc3545';
  }
}
