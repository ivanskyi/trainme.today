import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-public-dashboard',
  templateUrl: './public-dashboard.component.html',
  styleUrls: ['./public-dashboard.component.scss']
})
export class PublicDashboardComponent implements OnInit {
  topics: any[] = [];
  selectedRubric: string | null = null;
  selectedSubrubric: string | null = null;
  selectedSubSubrubric: string | null = null;
  filteredTopics: any[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadTopicsList();
  }

  loadTopicsList() {
    this.http.get<any[]>('assets/topics/topics-list.json').subscribe(data => {
      this.topics = data;
      this.filterTopics();
    });
  }

  getUniqueRubrics() {
    return [...new Set(this.topics.map(topic => topic.rubric))];
  }

  getUniqueSubrubrics() {
    return [...new Set(
      this.topics
        .filter(topic => topic.rubric === this.selectedRubric)
        .map(topic => topic.subrubric)
    )];
  }

  getUniqueSubSubrubrics() {
    return [...new Set(
      this.topics
        .filter(topic => topic.subrubric === this.selectedSubrubric)
        .map(topic => topic.sub_subrubric)
    )];
  }

  selectRubric(rubric: string) {
    this.selectedRubric = rubric;
    this.selectedSubrubric = null;
    this.selectedSubSubrubric = null;
    this.filterTopics();
  }

  selectSubrubric(subrubric: string) {
    this.selectedSubrubric = subrubric;
    this.selectedSubSubrubric = null;
    this.filterTopics();
  }

  selectSubSubrubric(subSubrubric: string) {
    this.selectedSubSubrubric = subSubrubric;
    this.filterTopics();
  }

  filterTopics() {
    this.filteredTopics = this.topics.filter(topic => {
      const matchesRubric = !this.selectedRubric || topic.rubric === this.selectedRubric;
      const matchesSubrubric = !this.selectedSubrubric || topic.subrubric === this.selectedSubrubric;
      const matchesSubSubrubric = !this.selectedSubSubrubric || topic.sub_subrubric === this.selectedSubSubrubric;
      return matchesRubric && matchesSubrubric && matchesSubSubrubric;
    });
  }

  openTopic(topicId: string) {
    this.router.navigate(['/topic'], { queryParams: { id: topicId } });
  }
}
