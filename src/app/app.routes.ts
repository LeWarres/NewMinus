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
import { ChapterUploaderComponent } from './pages/chapter-uploader/chapter-uploader.component';


export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'uploader',
    component: UploaderComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
  path: 'following',
  component: FollowingComponent
},
  {
    path: 'signup',
    component: SignupComponent
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
  path: 'obra/:id/subir-capitulo',
  component: ChapterUploaderComponent
},
{
  path: 'obra/:id/capitulo/:capitulo',
  component: ReaderComponent
},
{
  path: 'obra/:id',
  component: ReaderComponent
},
  {
  path: 'categorias',
  component: CategoriasComponent
},
  {
    path: '**',
    redirectTo: ''
  }
];