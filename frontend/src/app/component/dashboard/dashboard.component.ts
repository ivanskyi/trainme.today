import { Component } from '@angular/core';
import { TopicService } from '../../service/topic.service';
import { Topic } from '../../interface/topic';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  query: string = '';
  topics: Topic[] = [];

  constructor(private topicService: TopicService) {}

  onSearch(): void {
    this.topicService.searchTopics(this.query).subscribe((data: Topic[]) => {
      this.topics = data;
    });
  }
}
