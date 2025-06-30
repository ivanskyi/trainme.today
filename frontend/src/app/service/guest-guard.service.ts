import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuardService implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.isLoggedIn().pipe(
      take(1),
      map(isLoggedIn => {
        if (isLoggedIn) {
          this.router.navigate(['/dashboard']);
          return false;
        }
        return true;
      })
    );
  }
}
