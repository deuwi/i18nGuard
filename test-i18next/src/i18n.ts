import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: true,

    interpolation: {
      escapeValue: false,
    },

    resources: {
      en: {
        common: {
          hello: "Hello",
          welcome: "Welcome to our application",
          buttons: {
            submit: "Submit",
            cancel: "Cancel"
          },
          navigation: {
            home: "Home",
            about: "About"
          },
          description: "This is a test app for i18next internationalization",
          form: {
            name: "Name",
            email: "Email",
            placeholder: {
              name: "Enter your name",
              email: "Enter your email"
            }
          },
          messages: {
            success: "Operation completed successfully!",
            error: "An error occurred. Please try again."
          }
        }
      },
      fr: {
        common: {
          hello: "Bonjour",
          welcome: "Bienvenue dans notre application",
          buttons: {
            submit: "Envoyer",
            cancel: "Annuler"
          },
          navigation: {
            home: "Accueil",
            about: "À propos"
          },
          description: "Ceci est une application de test pour l'internationalisation i18next",
          form: {
            name: "Nom",
            email: "Email",
            placeholder: {
              name: "Entrez votre nom",
              email: "Entrez votre email"
            }
          },
          messages: {
            success: "Opération réalisée avec succès !",
            error: "Une erreur s'est produite. Veuillez réessayer."
          }
        }
      }
    }
  });

export default i18n;