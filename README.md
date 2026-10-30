# AMF Signal

Exercice technique pour FINADORY. L'application collecte les publications réglementées de l'AMF (info-financiere.gouv.fr), les affiche dans un fil filtrable, sélectionne celles qui méritent un article, rédige des brèves avec Claude et vérifie chacun de leurs chiffres dans le document source.

- **Application déployée** : _à compléter (URL Vercel)_
- **Code** : https://github.com/ahmetUz/amf-signal

| Page | Contenu |
| --- | --- |
| `/` | Le fil AMF groupé par jour, les plus importantes d'abord. Filtres par société ou ISIN, date et type d'information. Score de sélection et ses raisons sur chaque publication. |
| `/breves` | Les brèves, avec pour chaque chiffre son statut (vérifié, à confirmer, non vérifiable), les trois contrôles et la citation source. |

> La vérification automatique ne remplace pas une relecture humaine : elle prouve qu'un chiffre figure dans le document, pas que la brève l'interprète correctement.

## Lancer le projet

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, DATABASE_URL_MIGRATE, ANTHROPIC_API_KEY, CRON_SECRET
npm run db:push              # crée les tables dans Supabase
npm run dev
npm test                     # Jest : sélection, vérification des chiffres, filtres, auth
```

Le pipeline se lance par trois routes, toutes protégées par `Authorization: Bearer $CRON_SECRET` :

```bash
H="Authorization: Bearer $CRON_SECRET"
curl -X POST -H "$H" "localhost:3000/api/ingest?days=3"   # 1. collecte (idempotente)
curl -X POST -H "$H" localhost:3000/api/select            # 2. score par règles + grille Haiku sur les 10 meilleures
curl -X POST -H "$H" localhost:3000/api/briefs/<uin>      # 3. une brève par appel (?force=1 pour régénérer)
```

En production, Vercel Cron appelle `/api/ingest` chaque jour à 19 h UTC (`vercel.json`). C'est la limite du plan Hobby : une exécution par jour.

## Choix techniques

- **Next.js 16 (App Router) en TypeScript strict, front et back dans un seul projet.** Les pages sont des Server Components qui lisent la base directement ; seule la barre de navigation tourne côté client. Les filtres sont dans l'URL (liens et formulaire GET) : aucun état client, et une vue filtrée se partage.
- **Supabase Postgres + Drizzle ORM**, driver `postgres` avec `prepare: false` derrière le transaction pooler. Toutes les écritures sont des upserts sur l'identifiant AMF : relancer la collecte ne crée jamais de doublon.
- **Claude Haiku 5.5** pour la grille de sélection et pour les brèves. C'est le modèle le moins coûteux ; la vérification des chiffres par le code compense le recours à un modèle léger. Les sorties passent par les *structured outputs* (`output_config.format` avec un schéma Zod), puis sont revalidées par Zod. Le code contrôle `stop_reason` avant de parser, pour qu'une réponse tronquée donne une erreur claire.
- **unpdf** pour extraire le texte des PDF : il fonctionne en serverless. On n'extrait que les 3 premières pages, on refuse au-delà de 20 Mo (`Content-Length` vérifié avant le téléchargement) et on ne stocke jamais le PDF, seulement son URL et le texte.
- **Une brève par appel HTTP**, pour tenir dans la limite de durée de Vercel. Pas de queue, de S3 ni de Redis : c'est volontaire pour un exercice de quelques heures (voir l'architecture cible plus bas).
- **Logique métier dans `lib/`, en fonctions pures testées.** La sélection et la vérification ont été écrites en TDD (Jest, 136 tests).
- **Interface** : Tailwind et shadcn/ui, avec la palette et la typographie de Clarsource (Schibsted Grotesk, Spline Sans Mono) pour rester dans l'esprit du produit.

## Comprendre les données

Je suis parti d'un vrai appel à l'API (Opendatasoft Explore v2.1, dataset `flux-amf-new-prod`) et je n'ai retenu que des champs observés : `uin_idt_uin` (identifiant), `uin_dat_amf` (date), `identificationsociete_iso_cd_isi` (ISIN), `identificationsociete_iso_nom_soc` (société), `sous_type_d_information`, `informationdeposee_inf_tit_inf` (titre), `informationdeposee_inf_lng_inf` (langue) et `url_de_recuperation` (document). Chaque enregistrement est validé par Zod : 0 rejet sur 187 publications en français collectées sur 3 jours.

Les imperfections rencontrées, et ce que j'en ai fait :

- **Doublons bilingues** : la même information est déposée en français et en anglais, sous deux identifiants, à quelques secondes d'écart. Je ne collecte que le français (filtre dans la requête). Ce qu'on perd : les émetteurs qui ne publient qu'en anglais (1 sur 3 jours, Ayvens).
- **Documents qui ne sont pas des PDF** : des paquets ESEF/XBRL en `.zip`. Ils sont ignorés pour les brèves avec le statut `pas_un_pdf`.
- **Sous-type fourre-tout** : 110 publications sur 187 sont des « Informations privilégiées », qui couvrent aussi bien un contrat qu'une acquisition. Le sous-type ne suffit pas pour juger : il faut lire le titre, puis le document.
- **Titres génériques** : au moins 25 titres répètent simplement leur catégorie (« Informations privilégiées / Autres communiqués »). Seul le document permet de juger.
- **Pièges de mots-clés** : « Acquisition ou cession des actions de l'émetteur » est un rachat d'actions courant, pas une acquisition ; « Résultats […] et mise à disposition du rapport » annonce de vrais résultats malgré « mise à disposition ».
- **Champ `cac40` irrégulier** : « 1 », « 0 » ou null (98 cas), null et « 0 » voulant dire la même chose. Postgres place les null en tête d'un tri décroissant : il a fallu un `coalesce`.
- **Heures arrondies à la minute** pour 116 publications sur 187 : les ex aequo revenaient dans un ordre variable, et la sélection n'était pas reproductible. L'identifiant sert de dernier critère de tri.
- **Heures fausses d'une heure** : la source calcule l'heure UTC en retirant 2 h (heure d'été, champ `timezone_uin_dat_amf`) alors que Paris est en UTC+1 depuis le 25/10. Sanofi, qui publie à 7 h 30, apparaissait à 6 h 30. On reconstitue l'heure de Paris, puis on la convertit avec le vrai fuseau (`lib/amf/date.ts`, testé).
- **ISIN de remplissage** `999999999999` (collectivités, sociétés non cotées) : remplacé par null, affiché « ISIN non renseigné ».
- **Doublons entre diffuseurs** : la même publication arrive parfois deux fois sous deux identifiants (D.L.S.I., Acheter-Louer.fr). Même société, même titre normalisé et moins de 3 jours d'écart : le second dépôt est masqué. Un titre reformulé (DBV Technologies) n'est pas reconnu.
- **Émetteurs étrangers** (8 publications : NL, BE, DE, IT, GR) et **collectivités locales** qui émettent des obligations : gardés, le pays est stocké.
- **Formats de nombres** très variés : `14 444 millions d'euros`, `+304 m€`, `9,1 G$`, `- 13,6 %` (signe séparé), `−42,2 %` (moins typographique), tableaux « en millions d'euros » sans unité dans les cellules.

## Critère de sélection

Principe : **l'IA classe, le code décide.** On ne demande jamais au modèle si une publication est « intéressante ».

1. **Score par règles, sans ouvrir de document** (`lib/selection/rules.ts`, fonction pure, 21 tests sur des titres réels). Le titre et le sous-type sont comparés à trois listes de mots-clés ; le premier niveau qui correspond l'emporte :
   - **Fort (3)** : résultats, chiffre d'affaires, acquisition, fusion, offre publique, augmentation de capital, nomination, direction générale, objectifs, redressement judiciaire, dépréciation…
   - **Moyen (2)** : franchissement de seuil, programme de rachat.
   - **Routine (0)** : droits de vote, actions propres, contrat de liquidité, honoraires, mise à disposition d'un document.
   - **Sans correspondance (1)** : « à vérifier dans le document », pour ne pas écarter un titre générique.
2. **Grille factuelle sur les 10 meilleures** (`lib/selection/grid.ts`). Haiku lit les 3 premières pages et ne remplit que des champs fermés : type d'événement, révision des objectifs, montant annoncé, impact sur le capital, impact sur la direction, plus une citation qui justifie le type. Le code calcule ensuite le score final (`final-score.ts`, testé) : de 1 à 5 points selon l'événement (offre publique, acquisition, changement de dirigeant : 5 ; résultats : 3, ou 5 avec une révision des objectifs), puis +1 par critère (montant, capital, direction, CAC 40). Si la citation est introuvable dans le document, la raison l'affiche.
3. **Les 5 meilleures** sont sélectionnées. Les raisons de chaque score sont stockées et affichées dans le fil.

Les grilles déjà calculées sont réutilisées : relancer la sélection ne coûte rien et donne le même résultat.

**Ce que la comparaison avec Clardot m'a appris.** Clardot a publié un article sur deux publications que nous n'avions pas retenues. Sapmer (« Rapport financier semestriel ») était classée en routine : erreur corrigée, seule la *mise à disposition* d'un rapport est de la routine. AgroGeneration avait le score maximal par règles mais a été écartée par le départage, qui favorise le CAC 40 : c'est un biais assumé et noté dans les améliorations.

## Contrôle de l'exactitude des chiffres

Pour chaque chiffre, la brève doit fournir la valeur, l'unité et la **citation exacte** du document qui le contient. Le code (`lib/verification/`, fonctions pures écrites en TDD) fait ensuite trois contrôles :

- **(a)** la citation figure mot pour mot dans le texte extrait, après normalisation des espaces (insécables compris) et des apostrophes, et sans tenir compte de la ponctuation en début et en fin de citation ;
- **(b)** le chiffre apparaît dans la citation ;
- **(c)** le chiffre apparaît dans le corps de la brève.

Les nombres sont comparés par valeur, pas par texte : `7,3 Md€`, `7 300 M€` et `7,3 milliards d'euros` sont égaux. Les espaces de milliers, la virgule décimale, les signes (`-`, `−`, `–`) et les échelles (`k€`, `M€`, `Md€`, `G$`, « millions »…) sont normalisés. Un pourcentage ne correspond qu'à un pourcentage, et une date n'est jamais comptée comme un chiffre.

| Statut | Signification |
| --- | --- |
| **Vérifié** | les trois contrôles passent |
| **À confirmer** | le chiffre est dans le document, mais la citation n'est pas exacte |
| **Non vérifiable** | le chiffre est introuvable dans le document |

Si un chiffre est non vérifiable, ou si le corps sort de 100 à 150 mots (compte fait par le code), la brève est **régénérée une seule fois** avec la liste des erreurs, puis le statut est affiché tel quel. Pas de boucle.

**Limites connues** : unpdf aplatit les tableaux, si bien que des cellules voisines peuvent fusionner en un seul nombre. Cela donne des faux négatifs (« à confirmer »), jamais un faux « vérifié ». Le format anglo-saxon `1,234.5` est mal lu. Un nombre sans unité correspond à n'importe quelle échelle ; c'est nécessaire pour les tableaux, et le contrôle de la citation compense en partie.

**Résultat** sur les 5 brèves générées : 40 chiffres, tous vérifiés. La brève STMicro n'en contient aucun (seulement des nominations) : elle est affichée « à confirmer », car une brève sans chiffre ne prouve rien.

## Prompts clés

Tous les prompts sont en français et imposent de ne travailler que sur le texte fourni entre balises `<document>`.

**1. Grille de sélection** (Haiku, `effort: "low"`) :

```
Tu analyses une publication réglementée déposée auprès de l'AMF.
Remplis la grille UNIQUEMENT à partir du texte fourni entre les balises <document>. N'utilise aucune connaissance extérieure.

- type_evenement : l'événement principal annoncé par la publication.
- revision_objectifs : "hausse" ou "baisse" seulement si le texte dit explicitement que les objectifs ou perspectives sont relevés ou abaissés, sinon "aucune".
- montant_annonce : true si le texte mentionne un montant en euros (ou autre devise) lié à l'événement.
- impact_capital : true si le nombre d'actions ou la répartition du capital change (émission, augmentation de capital, offre, fusion).
- impact_direction : true si un dirigeant ou mandataire social arrive, part ou change de fonction.
- citation : recopie MOT POUR MOT une phrase du document qui justifie type_evenement. Ne la reformule pas, ne la résume pas.

Si une information est absente du texte, réponds false ou "aucune". Ne devine jamais.
```

**2. Brève** (Haiku, `effort: "medium"`) :

```
Tu es journaliste financier. Tu rédiges une brève à partir d'une publication réglementée déposée auprès de l'AMF.
Utilise UNIQUEMENT le texte fourni entre les balises <document>.

- titre : informatif et factuel, sans superlatif.
- corps : entre 100 et 150 mots, en français, au présent, sans formule promotionnelle.
- faits_cles : 3 à 5 faits courts.
- chiffres : CHAQUE chiffre cité dans le corps, avec sa valeur telle qu'écrite dans le document (ex. "7,3"), son unité (ex. "Md€", "M€", "%") et citation_exacte : la phrase du document qui contient ce chiffre, recopiée mot pour mot.

Règles strictes :
- n'utilise aucun chiffre absent du document ;
- ne calcule rien : ni variation, ni conversion, ni arrondi, ni total ;
- n'ajoute aucune information extérieure au document ;
- ne reformule jamais une citation_exacte.
```

**3. Relance** (une seule fois, avec la brève précédente et la liste des problèmes détectés par le code) :

```
Le contrôle automatique a détecté des problèmes dans ta brève précédente.
Réécris la brève complète en corrigeant ces problèmes, avec les mêmes règles.
```

Ce qui a changé en route : la spécification prévoyait le tool use forcé et une température basse, mais les deux renvoient une erreur 400 sur les modèles 5.5. J'ai donc utilisé les structured outputs, avec un effort bas et des champs fermés pour la stabilité. Le prompt de la brève exclut aussi les dates : le vérificateur lisait « 1er janvier 2027 » comme le nombre 1.

### Une erreur de l'IA détectée

_À compléter._

## Améliorations et suite

Ce que je ferais avec plus de temps, dans l'ordre :

- **Sélection** : départager les ex aequo sur l'événement plutôt que sur la taille de la société (passer plus de candidates à la grille, ce qui coûte peu), pour ne plus rater une petite valeur comme AgroGeneration. Ajuster ensuite le critère avec les données d'audience.
- **Doublons bilingues** : regrouper par ISIN, sous-type et fenêtre de temps, et garder la version anglaise quand elle est seule.
- **Brèves** : un chapô et un titre plus éditorial, à la manière de Clardot ; conserver le motif des relances pour les analyser.
- **Extraction** : lire les tableaux comme des tableaux, pour éviter les nombres fusionnés.
- **Architecture cible** : une queue BullMQ avec un worker sur Railway, une reprise sur échec et un budget de tokens, au lieu d'un appel HTTP par brève.
- **Qualité des brèves** : des personas LLM qui notent chaque brève (analyste M&A, directeur financier, journaliste).
- **Personnalisation** : un suivi de lecture côté front (Intersection Observer, temps de lecture) pour construire un profil d'intérêts, puis un clustering des lecteurs et du filtrage collaboratif.
- **Coût** : de petits modèles spécialisés pour la sélection.

## Temps passé

_À compléter._
