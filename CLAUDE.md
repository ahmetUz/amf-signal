# CLAUDE.md : amf-signal

Exercice technique pour le stage développeur full stack chez FINADORY. Le produit de référence est Clardot, leur plateforme de veille économique.

L'application récupère les publications réglementées de l'AMF (info-financiere.gouv.fr), les affiche, choisit celles qui méritent un article et génère des brèves avec un LLM, en vérifiant les chiffres.

Le code ne sera pas réutilisé. Il sert à évaluer quatre choses : intégrer une vraie source de données, livrer une application full stack qui fonctionne, analyser des données imparfaites et utiliser l'IA de façon fiable et critique. Je défendrai chaque choix pendant 45 minutes d'entretien. Un choix clair et justifié compte plus qu'une fonctionnalité de plus.

## Contraintes

- Budget : 3 à 4 h, 5 h maximum. Un rendu incomplet mais bien expliqué est accepté.
- Livrables : le repo GitHub, l'URL de l'application déployée et un README (voir la fin de ce fichier).

## Priorités : dans cet ordre, une partie à la fois

1. **Collecte** : récupérer les publications des derniers jours (2 à 3 jours suffisent) et les stocker.
2. **Liste filtrable** par société, type d'information et date.
3. **Sélection automatique** des publications qui méritent une brève, avec un critère expliqué.
4. **Brèves** générées par LLM pour 3 à 5 publications : 100 à 150 mots, avec un titre, les faits clés, les chiffres et le lien vers le document source.
5. **Vérification des chiffres** de chaque brève dans le document source, en signalant ceux qu'on ne peut pas vérifier.
6. **Déploiement et README.**

Ne commence pas une partie tant que la précédente ne fonctionne pas de bout en bout. Seule exception : les tests de `lib/verification` (des fonctions pures) peuvent être écrits tôt.

## Stack

- **Next.js** (App Router) en TypeScript strict. Le front et le back sont dans le même projet (route handlers et server actions).
- **UI** : Tailwind et shadcn/ui, le design system utilisé chez Finadory.
- **Base de données** : PostgreSQL sur Supabase, via Drizzle ORM. Driver `postgres`, avec `prepare: false` derrière le pooler Supabase.
- **LLM** : l'API Claude avec `@anthropic-ai/sdk`. Les sorties structurées passent par les structured outputs (`client.messages.parse` et `output_config.format` avec un schéma Zod), revalidées par Zod. Le tool use forcé et la température renvoient une 400 sur les modèles 5.5. Modèles : `claude-haiku-5-5` pour la sélection, `claude-sonnet-5-5` pour les brèves.
- **PDF** : `unpdf` pour extraire le texte, car il fonctionne en serverless.
- **Tests** : Jest, comme dans la stack Finadory.
- **Déploiement** : Vercel, avec Vercel Cron pour la collecte.

Demande-moi avant d'ajouter toute autre dépendance.

## Source de données

C'est une API Opendatasoft Explore v2.1, ouverte et sans clé, limitée à 10 000 appels par jour et par IP.

- Endpoint des publications : `https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records`
- On filtre sur la date avec une clause ODSQL `where` et on trie avec `order_by`. Comme `limit` vaut 100 au maximum, il faut paginer avec `offset`.

Champs confirmés :

- `uin_idt_uin` : l'identifiant de la publication, qui sert de clé d'unicité.
- `uin_dat_amf` : la date et l'heure du dépôt.
- `identificationsociete_iso_cd_isi` : l'ISIN, la clé société la plus fiable.
- `identificationsociete_iso_cd_lei` : le LEI, souvent null.

**Les champs pour le nom de la société, le type d'information, le titre et l'URL du document sont encore à confirmer.** Commence par un vrai appel, montre-moi un enregistrement brut, et ne devine jamais un nom de champ.

Pièges connus, liés aux données imparfaites :

- Une même publication peut exister en deux langues, sur deux lignes avec des identifiants différents et quelques minutes d'écart. Il faut les regrouper et garder la version française.
- Certains documents ne sont pas des PDF mais des paquets ESEF/XBRL au format ZIP. On les ignore pour les brèves et on le signale.
- Le flux contient aussi des émetteurs étrangers.
- Note chaque anomalie rencontrée dans `docs/NOTES.md`, section « Données » : elle ira dans le README.

## Modèle de données (point de départ)

- **`publications`** : l'identifiant (`uin_idt_uin`, unique), l'ISIN, la société, le type d'information, le titre, la langue, la date de publication, l'URL du document, `raw` (l'enregistrement complet en JSONB), le score et ses raisons (en JSONB), un booléen « sélectionnée » et les horodatages.
- **`documents`** : l'identifiant de la publication, le texte extrait, le nombre de pages, la taille et le statut d'extraction (`ok`, `trop_volumineux`, `pas_un_pdf` ou `erreur`).
- **`briefs`** : l'identifiant de la publication, le titre, le corps, les faits clés (JSONB), les chiffres (JSONB : valeur, unité, citation source, statut), le statut global, le nombre de tentatives, le modèle utilisé et les horodatages.

Toutes les écritures se font en upsert (`onConflictDoUpdate`) : relancer la collecte ne doit jamais créer de doublon.

## Pipeline

1. **`POST /api/ingest`** : collecte les N derniers jours, avec pagination et upsert. La route est idempotente.
2. **`POST /api/select`** : calcule le score de sélection (voir plus bas) et marque les meilleures publications.
3. **`POST /api/briefs/[id]`** : traite une publication par appel, à cause de la limite de durée de Vercel (règle `maxDuration`). Elle télécharge le document, extrait le texte, génère la brève et vérifie les chiffres.

Garde-fous sur les documents :

- Vérifier le `Content-Length` avant de télécharger, avec une limite de 20 Mo.
- Traiter un seul document à la fois.
- Pour un gros rapport, n'extraire que les premières pages.
- Ne jamais stocker le PDF : on garde son URL et le texte extrait.

Pour cet exercice, on n'utilise ni queue, ni S3, ni Redis. C'est volontaire : l'architecture cible est décrite dans le README.

## Critère de sélection

Il se fait en deux étapes. Le principe : l'IA classe, le code décide.

1. **Un score par règles**, sans ouvrir aucun document. C'est une fonction pure et testée, qui donne des points selon le type d'information et les mots du titre :
   - **Fort** : résultats, avertissement sur résultats, fusion ou acquisition, OPA ou OPE, augmentation de capital, changement de dirigeant.
   - **Moyen** : franchissement de seuil, rachat d'actions important.
   - **Routine, 0 point** : nombre d'actions et de droits de vote, bilan de contrat de liquidité, honoraires des commissaires aux comptes, mise à disposition de documents.
2. **Une grille factuelle pour les 10 meilleures environ.** Claude Haiku la remplit en structured output, avec `effort: "low"` et uniquement des champs fermés : type d'événement, présence d'un montant, impact sur le capital, impact sur la direction, etc. Le code calcule ensuite le score final. On ne demande jamais au LLM si une publication est « intéressante ».

Les raisons du score sont stockées et affichées dans l'interface.

## Brèves

- **Modèle** : Claude Sonnet.
- **Entrée** : le texte extrait et les métadonnées de la publication.
- **Sortie structurée** : titre, corps de 100 à 150 mots, faits clés, chiffres sous la forme `[{ valeur, unité, citation_exacte }]` et lien vers la source.
- **Règles du prompt** : aucun chiffre calculé ou absent du document, et une citation exacte du passage source pour chaque chiffre.
- C'est le code qui compte les mots, pas le LLM.

## Vérification des chiffres, en TDD

`lib/verification/` ne contient que des fonctions pures, écrites en TDD : un test qui échoue, puis le code, puis le refactor.

- **Normalisation** : espaces insécables, virgule ou point décimal, `M€`, `Md€`, `k€`, « millions », « en milliers d'euros », pourcentages et signes.
- **Extraction** des nombres d'un texte par regex.
- **Trois contrôles pour chaque chiffre de la brève** :
  - (a) la citation existe mot pour mot dans le texte source, après normalisation des espaces ;
  - (b) le chiffre apparaît dans la citation ;
  - (c) le chiffre apparaît dans le corps de la brève.

Il y a trois statuts :

- **`verifie`** : les trois contrôles passent.
- **`a_confirmer`** : le chiffre est dans le document, mais la citation n'est pas parfaite.
- **`non_verifiable`** : le chiffre est introuvable.

Si un chiffre est `non_verifiable`, on relance la génération une seule fois, avec les erreurs en contexte, puis on affiche le statut tel quel. Pas de boucle infinie. La vérification ne remplace pas une relecture humaine : il faut le dire dans l'interface et dans le README.

## Interface

Une interface sobre, dans l'esprit de Clardot (« le signal, pas le bruit ») :

- **`/`** : la liste des publications, avec des filtres par société, type et date, un badge par type, et le score avec ses raisons.
- **`/breves`** : les brèves en cartes d'article, un badge par chiffre (vert pour vérifié, orange pour à confirmer, gris pour non vérifiable) et le lien vers le document source.

## Conventions

- TypeScript strict, sans `any`. Les réponses de l'API AMF et du LLM sont validées avec Zod.
- De petites fonctions. La logique métier va dans `lib/`, jamais dans les composants.
- Les secrets (`DATABASE_URL`, `ANTHROPIC_API_KEY`) vont dans `.env.local` et ne sont jamais commités. Garde `.env.example` à jour.
- Des commits courts et fréquents, un par étape qui fonctionne.

## Comment travailler avec moi

- Je dois pouvoir expliquer chaque ligne en entretien. Après chaque étape, résume en 3 à 5 lignes ce que tu as fait et pourquoi, et commente les choix qui ne sont pas évidents.
- Si une demande est ambiguë ou risque de dépasser le budget temps, dis-le avant de coder.
- Préfère la solution simple qui marche. Propose les améliorations dans `docs/NOTES.md` au lieu de les coder.

## docs/NOTES.md (sert à écrire le README)

Ce fichier est tenu à jour au fil de l'eau, en quatre sections :

- **Données** : ce qu'on a compris de la structure, et les anomalies rencontrées.
- **Prompts** : les prompts clés (sélection, brève, relance) dans leur version finale, et ce qui a changé en route.
- **Erreurs de l'IA** : uniquement celles que je constate et te signale. Ne remplis jamais cette section de toi-même.
- **Temps** : je note moi-même mes heures de début et de fin.

## README attendu (à rédiger à la fin)

- Les choix techniques.
- Comment j'ai compris la structure des données.
- Le critère de sélection.
- Comment on contrôle l'exactitude des chiffres.
- 3 prompts clés et une erreur de l'IA détectée.
- Les améliorations, et ce que je ferais avec plus de temps.
- Le temps réellement passé.

Améliorations à mentionner, mais à ne pas coder :

- Une queue BullMQ avec un worker sur Railway, une reprise sur échec et un budget de tokens.
- Des personas LLM qui notent les brèves : analyste M&A, directeur financier, journaliste.
- Un suivi de lecture côté front (Intersection Observer, temps de lecture) pour construire un profil d'intérêts.
- Un clustering des lecteurs et du filtrage collaboratif.
- Un critère de sélection ajusté avec les données d'audience.
- De petits modèles spécialisés pour réduire le coût de la sélection.
