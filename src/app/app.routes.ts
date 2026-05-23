import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { UploaderComponent } from './pages/uploader/uploader.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component';
import { ReaderComponent } from './pages/reader/reader.component';
import { CategoriasComponent } from './pages/categorias/categorias.component';
import { FollowingComponent } from './pages/following/following.component';
import { TopComponent } from './pages/top/top.component';
import { ChapterUploaderComponent } from './pages/chapter-uploader/chapter-uploader.component';
import { MangaPreviewComponent } from './pages/manga-preview/manga-preview.component';
import { ObraAdminComponent } from './pages/obra-admin/obra-admin.component';

import { ReenviarVerificacionComponent } from './pages/reenviar-verificacion/reenviar-verificacion.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'signup',
    component: SignupComponent
  },
  {
    path: 'reenviar-verificacion',
    component: ReenviarVerificacionComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'uploader',
    component: UploaderComponent
  },
  {
    path: 'following',
    component: FollowingComponent
  },
  {
    path: 'top',
    component: TopComponent
  },
  {
    path: 'categorias',
    component: CategoriasComponent
  },
  {
    path: 'perfil/:id/editar',
    component: EditProfileComponent
  },
  {
    path: 'perfil/:id',
    component: PerfilComponent
  },
  {
    path: 'obra/:id/admin',
    component: ObraAdminComponent
  },
  {
    path: 'obra/:id/subir-capitulo',
    component: ChapterUploaderComponent
  },
  {
    path: 'obra/:id/capitulo/:capitulo',
    component: ReaderComponent
  },
  {
    path: 'obra/:id',
    component: MangaPreviewComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];