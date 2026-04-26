import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../shared/services/loading.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  const token = localStorage.getItem('token');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
