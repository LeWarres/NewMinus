import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translations: { [key: string]: { [key: string]: string } } = {
'es': {
    'Creators': 'Creadores',
    'Sobre Nosotros': 'Inicio',
    'Noticias': 'Seguidos',
    '© Monthly Awards': 'Reader Ejemplo',
    'Géneros': 'Géneros',
    'Mi perfil': 'Mi perfil',
    'Keyword': 'Palabra clave',
    'Q': 'Buscar',
    'Subir obra': 'Subir obra',
    'Nuevos episodios': 'Nuevos episodios',
    'Nuevas obras subidas': 'Nuevas obras subidas',
    'Obras populares': 'Obras populares',
    'Anterior' : 'Anterior',
    'Siguiente' : 'Siguiente',
    'Vistas' : 'Vistas',
    'Capitulo' : 'Capitulo',
      'Ver mas' : 'Ver mas',
      'mail': 'Dirección de correo electrónico',
      'Contrasena': 'Contraseña',
      'NoContrasena': '¿Has olvidado la contraseña?',
      'login' : 'iniciar sesión',
      'registro' : 'Registra una nueva cuenta aqui',
      'sightup': 'Registrarte',
      'CredencialesIncorrectas' : 'Correo o Contraseña Incorrecta',
      'Errorregistro' : 'No fue posible hacer el registro',
      'yacuenta' : '¿Ya tienes una cuenta?',
      'NombredeUsuario': 'Nombre de Usuario',
      'Nacionalidad': 'Nacionalidad',
      'Por': 'Por',
      'Suscribirse': 'Suscribirse',
      'Descubre una nueva historia': 'Descubre una nueva historia',
'Descubrir': 'Descubrir',
'Recomendados': 'Recomendados',
'Inicio': 'Inicio',
'Suscriptores': 'Suscriptores',
'Cerrar sesión': 'Cerrar sesión',
'Editar Perfil': 'Editar Perfil',
'Desuscribirse': 'Desuscribirse',
'ConfirmarContrasena': 'Confirmar contraseña',
  },
  'en': {
    'Creators': 'Creators',
    'Sobre Nosotros': 'Home',
    'Noticias': 'Following',
    '© Monthly Awards': 'Reader Ejemplo',
    'Géneros': 'Genres',
    'Mi perfil': 'My Profile',
    'Keyword': 'Keyword',
    'Q': 'Search',
    'Subir obra': 'Upload Artwork',
    'Nuevos episodios': 'New Episodes',
    'Nuevas obras subidas': 'Newly Uploaded Works',
    'Obras populares': 'Popular Works',
    'Anterior' : 'Previous',
    'Siguiente' : 'Next',
    'Vistas' : 'Views',
    'Capitulo' : 'Chapter',
    'Ver mas' : 'See More',
    'mail': 'E-mail adress',
    'Contrasena': 'Password',
    'NoContrasena': 'Did you forget you password?',
    'login' : 'Log-in',
    'registro' : 'Register a new Account',
    'sightup': 'Sign up',
    'CredencialesIncorrectas' : 'Wrong e-mail or password',
    'Errorregistro' : 'Registration was not possible',
    'yacuenta' : 'Do you have an account?',
    'NombredeUsuario' : 'Username',
    'Nacionalidad' : 'Country',
    'Por' : 'By',
    'Suscribirse' : 'Subscribe',
    'Descubre una nueva historia': 'Discover a new story',
'Descubrir': 'Discover',
'Recomendados': 'Recommended',
'Inicio': 'Home',
'Suscriptores': 'Subscribers',
'Cerrar sesión': 'Log out',
'Editar Perfil': 'Edit Profile',
'Desuscribirse': 'Unsubscribe',
'ConfirmarContrasena': 'Confirm password',
  }
  };

  private languageSubject = new BehaviorSubject<string>('en'); // Idioma por defecto
  currentLanguage$ = this.languageSubject.asObservable(); // Observable para escuchar cambios

  constructor() { }

  getCurrentLanguage(): string {
    return this.languageSubject.value;
  }

  getTranslation(key: string): string {
    const lang = this.languageSubject.value;
    return this.translations[lang][key] || key; 
  }

  setLanguage(language: string) {
    this.languageSubject.next(language); // Notifica a los suscriptores del cambio de idioma
  }
}
