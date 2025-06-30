import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface TopicSummary {
  id: string;
  name: string;
  description: string;
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
}
