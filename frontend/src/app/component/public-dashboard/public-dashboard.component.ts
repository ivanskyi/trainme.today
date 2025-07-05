import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface TopicSummary {
  id: string;
  name: string;
  description: string;
}

interface TestProgress {
  currentQuestionIndex: number;
  answers: { [questionId: string]: string };
  correctAnswers: { [questionId: string]: boolean };
  completed: boolean;
  score: number;
}

@Component({
  selector: 'app-public-dashboard',
  templateUrl: './public-dashboard.component.html',
  styleUrls: ['./public-dashboard.component.scss']
})
export class PublicDashboardComponent implements OnInit {
  topics: TopicSummary[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadTopicsList();
  }

  loadTopicsList() {
    this.http.get<TopicSummary[]>('assets/topics/topics-list.json').subscribe(data => {
      this.topics = data;
    });
  }

  openTopic(topicId: string) {
    this.router.navigate(['/topic'], { queryParams: { id: topicId } });
  }

  getTestProgress(topicId: string): TestProgress | null {
    const saved = localStorage.getItem(`test_progress_${topicId}`);
    return saved ? JSON.parse(saved) : null;
  }

  saveTestProgress(topicId: string, progress: TestProgress) {
    localStorage.setItem(`test_progress_${topicId}`, JSON.stringify(progress));
  }

  clearTestProgress(topicId: string) {
    localStorage.removeItem(`test_progress_${topicId}`);
  }

  getTopicProgressPercentage(topicId: string): number {
    const progress = this.getTestProgress(topicId);
    if (!progress) return 0;

    const totalQuestions = Object.keys(progress.answers).length;
    if (totalQuestions === 0) return 0;

    return Math.round((progress.currentQuestionIndex / totalQuestions) * 100);
  }

  hasTopicProgress(topicId: string): boolean {
    const progress = this.getTestProgress(topicId);
    return progress ? Object.keys(progress.answers).length > 0 : false;
  }
}
