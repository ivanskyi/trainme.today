import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Topic } from '../interface/topic';

@Injectable({
  providedIn: 'root'
})
export class TopicService {
  private apiUrl = 'http://localhost:8080/topic';

  constructor(private http: HttpClient) {}

  searchTopics(query: string): Observable<Topic[]> {
    let params = new HttpParams();
    if (query && query.trim()) {
      params = params.set('q', query.trim());
    }

    return this.http.get<Topic[]>(this.apiUrl, { params });
  }
}
