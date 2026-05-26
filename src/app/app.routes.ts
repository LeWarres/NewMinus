import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then(m => m.HomeComponent),
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'reenviar-verificacion',
    loadComponent: () =>
      import('./pages/reenviar-verificacion/reenviar-verificacion.component')
        .then(m => m.ReenviarVerificacionComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component')
        .then(m => m.ResetPasswordComponent)
  },
  {
    path: 'uploader',
    loadComponent: () =>
      import('./pages/uploader/uploader.component').then(m => m.UploaderComponent)
  },
  {
    path: 'following',
    loadComponent: () =>
      import('./pages/following/following.component').then(m => m.FollowingComponent)
  },
  {
    path: 'top',
    loadComponent: () =>
      import('./pages/top/top.component').then(m => m.TopComponent)
  },
  {
    path: 'categorias',
    loadComponent: () =>
      import('./pages/categorias/categorias.component').then(m => m.CategoriasComponent)
  },
  {
    path: 'perfil/:id/editar',
    loadComponent: () =>
      import('./pages/edit-profile/edit-profile.component')
        .then(m => m.EditProfileComponent)
  },
  {
    path: 'perfil/:id',
    loadComponent: () =>
      import('./pages/perfil/perfil.component').then(m => m.PerfilComponent)
  },
  {
    path: 'obra/:id/admin',
    loadComponent: () =>
      import('./pages/obra-admin/obra-admin.component').then(m => m.ObraAdminComponent)
  },
  {
    path: 'obra/:id/subir-capitulo',
    loadComponent: () =>
      import('./pages/chapter-uploader/chapter-uploader.component')
        .then(m => m.ChapterUploaderComponent)
  },
  {
    path: 'obra/:id/capitulo/:capitulo',
    loadComponent: () =>
      import('./pages/reader/reader.component').then(m => m.ReaderComponent)
  },
  {
    path: 'obra/:id',
    loadComponent: () =>
      import('./pages/manga-preview/manga-preview.component')
        .then(m => m.MangaPreviewComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
