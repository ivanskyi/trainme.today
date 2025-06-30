import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './component/login/login.component';
import { RegisterComponent } from './component/register/register.component';
import { DashboardComponent } from './component/dashboard/dashboard.component';
import { PublicDashboardComponent } from './component/public-dashboard/public-dashboard.component';
import { GuestGuardService } from './service/guest-guard.service';
import {AuthGuardService} from "./service/auth-guard.service";
import {TopicComponent} from "./component/topic/topic.component";

const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [GuestGuardService] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuardService] },
  { path: 'public', component: PublicDashboardComponent, canActivate: [GuestGuardService] },
  { path: 'topic', component: TopicComponent, canActivate: [GuestGuardService] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuardService] },
  { path: '', redirectTo: '/public', pathMatch: 'full' },
  { path: '**', redirectTo: '/public' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
