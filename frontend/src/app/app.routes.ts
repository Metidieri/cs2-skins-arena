import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), canActivate: [guestGuard] },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'inventory', loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'stats', loadComponent: () => import('./pages/stats/stats.component').then(m => m.StatsComponent), canActivate: [authGuard] },
  { path: 'history', loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent), canActivate: [authGuard] },
  { path: 'coinflip', loadComponent: () => import('./pages/coinflip/coinflip-lobby/coinflip-lobby.component').then(m => m.CoinflipLobbyComponent), canActivate: [authGuard] },
  { path: 'coinflip/:id', loadComponent: () => import('./pages/coinflip/coinflip-battle/coinflip-battle.component').then(m => m.CoinflipBattleComponent), canActivate: [authGuard] },
  { path: 'jackpot', loadComponent: () => import('./pages/jackpot/jackpot.component').then(m => m.JackpotComponent), canActivate: [authGuard] },
  { path: 'roulette', loadComponent: () => import('./pages/roulette/roulette.component').then(m => m.RouletteComponent), canActivate: [authGuard] },
  { path: 'cases', loadComponent: () => import('./pages/cases/cases.component').then(m => m.CasesComponent), canActivate: [authGuard] },
  { path: 'marketplace', loadComponent: () => import('./pages/marketplace/marketplace.component').then(m => m.MarketplaceComponent) },
  { path: 'daily-box', loadComponent: () => import('./pages/daily-box/daily-box.component').then(m => m.DailyBoxComponent), canActivate: [authGuard] },
  { path: 'leaderboard', loadComponent: () => import('./pages/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent) },
  { path: 'drops', loadComponent: () => import('./pages/drops/drops.component').then(m => m.DropsComponent) },
  { path: 'level', loadComponent: () => import('./pages/level/level.component').then(m => m.LevelComponent), canActivate: [authGuard] },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent), canActivate: [authGuard, adminGuard] },
  { path: 'player/:username', loadComponent: () => import('./pages/public-profile/public-profile.component').then(m => m.PublicProfileComponent) },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent) },
];
