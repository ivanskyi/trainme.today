import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<{ topic: Topic }>('assets/topics/topic.json').subscribe(data => {
      this.topic = data.topic;
      this.loadAnswers();
    });
  }

  selectOption(questionId: string, optionId: string) {
    this.answers[questionId] = optionId;
    this.saveAnswers();
    this.calculateResult();
  }

  saveAnswers() {
    localStorage.setItem('testAnswers', JSON.stringify(this.answers));
    localStorage.setItem('currentQuestionIndex', this.currentQuestionIndex.toString());
    localStorage.setItem('currentTestIndex', this.currentTestIndex.toString());
  }

  loadAnswers() {
    const savedAnswers = localStorage.getItem('testAnswers');
    const savedQuestionIndex = localStorage.getItem('currentQuestionIndex');
    const savedTestIndex = localStorage.getItem('currentTestIndex');

    if (savedAnswers) {
      this.answers = JSON.parse(savedAnswers);
      this.calculateResult();
    }
    if (savedQuestionIndex) {
      this.currentQuestionIndex = +savedQuestionIndex;
    }
    if (savedTestIndex) {
      this.currentTestIndex = +savedTestIndex;
    }
  }

  calculateResult() {
    if (!this.topic) return;
    const test = this.topic.tests[this.currentTestIndex];
    if (!test) return;

    let correctCount = 0;
    for (const q of test.questions) {
      if (this.answers[q.question_id] === q.correct_option_id) {
        correctCount++;
      }
    }
    this.result = correctCount;
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
      this.currentQuestionIndex = 0;
      this.answers = {};
      this.result = null;
      this.saveAnswers();
    }
  }

  prevTest() {
    if (!this.topic) return;
    if (this.currentTestIndex > 0) {
      this.currentTestIndex--;
      this.currentQuestionIndex = 0;
      this.answers = {};
      this.result = null;
      this.saveAnswers();
    }
  }
}
