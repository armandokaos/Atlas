# Geo Atlas — sauvegarde permanente des notes et pastilles

Le navigateur seul (`localStorage`) peut être vidé. Trois niveaux :

## 1. Export / import JSON (sans compte)

Dans l’en-tête de l’atlas : **Export JSON** enregistre toutes les notes et pastilles dans un fichier que tu peux garder (Drive, disque, e-mail). **Import JSON** fusionne un fichier dans les données locales.

## 2. Supabase (gratuit, sync multi-appareils)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. **SQL** → colle le contenu de `supabase/user_marks.sql` → *Run*.
3. **Authentication** → **Providers** → active **Email** (magic link).
4. **Authentication** → **URL configuration** : ajoute l’URL de ton site (ex. `https://ton-site.vercel.app` et `http://localhost:8080` pour les tests) dans **Redirect URLs**.
5. **Project Settings** → **API** : copie **Project URL** et la clé **anon public**.
6. Édite `cloud-config.js` à la racine du repo :

```js
window.GEO_ATLAS_CLOUD = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
};
```

7. Déploie : après connexion par lien e-mail, les changements sont enregistrés sur le serveur et rechargés à la connexion.

La clé **anon** est faite pour être dans le front ; les **RLS** empêchent de lire ou modifier les marques d’un autre utilisateur. Ne commite jamais la clé **service_role**.

## 3. `localStorage` (cache)

Même avec le cloud, les données restent aussi en local pour un affichage hors ligne rapide ; la source de vérité après connexion est la fusion cloud + local décrite dans le code.
