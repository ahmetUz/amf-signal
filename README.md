# AMF Signal

Exercice technique pour FINADORY : une version simple d'un fil de veille sur les publications réglementées de l'AMF.

**Application** : https://amf-signal-test.vercel.app/

---

## 1. Le projet

### Ce que fait l'application

```
Collecte AMF  →  Sélection  →  Brève (Claude Haiku)  →  Vérification des chiffres
 3 derniers jours    top 5       100 à 150 mots          chaque chiffre cherché dans le PDF
```

| Page | Contenu |
| --- | --- |
| `/` | Le fil AMF par jour, les plus importantes d'abord. Filtres par société, date et type. Chaque publication affiche son score et ses raisons. |
| `/breves` | Les 5 brèves. Chaque chiffre porte un statut : **vérifié**, **à confirmer** ou **non vérifiable**. Un clic montre les contrôles et la citation source. |

### Lancer en local

```bash
npm install
cp .env.example .env.local    # DATABASE_URL, DATABASE_URL_MIGRATE, ANTHROPIC_API_KEY, CRON_SECRET
npm run db:push               # crée les tables
npm run dev
npm test                      # 136 tests
```

Le pipeline se déclenche par trois routes protégées par un secret :

```bash
H="Authorization: Bearer $CRON_SECRET"
curl -X POST -H "$H" "localhost:3000/api/ingest?days=3"   # 1. collecte
curl -X POST -H "$H" localhost:3000/api/select            # 2. sélection
curl -X POST -H "$H" localhost:3000/api/briefs/<uin>      # 3. une brève
```

En production, Vercel Cron lance la collecte chaque jour à 19 h UTC.

---

## 2. Comment ça marche

### Choix techniques

| Choix | Pourquoi |
| --- | --- |
| **Next.js** (App Router, TypeScript strict) | Front et back dans un seul projet. Les filtres sont dans l'URL : pas d'état côté client. |
| **Supabase + Drizzle** | Postgres géré. Toutes les écritures sont des upserts : relancer la collecte ne crée jamais de doublon. |
| **Claude Haiku 5.5** | Le modèle le moins cher. La vérification par le code compense un modèle léger. |
| **Structured outputs + Zod** | Le format JSON est imposé par l'API, puis revalidé. |
| **unpdf** | Fonctionne en serverless. On lit les 3 premières pages, 20 Mo maximum, et on ne stocke jamais le PDF. |
| **Collecte des 3 derniers jours, chaque soir** | Le chiffre vient de la consigne (« 2 à 3 jours suffisent »). Il couvre le week-end (le lundi voit encore le vendredi soir) et laisse une marge si le cron échoue un soir. L'upsert évite les doublons. |
| **Une brève par appel** | Tient dans la limite de durée de Vercel. Pas de queue : c'est volontaire pour un exercice de quelques heures. |

La logique métier est dans `lib/`, en fonctions pures. La sélection et la vérification ont été écrites en TDD.

### Les données

Source : l'API ouverte d'info-financiere.gouv.fr. Je n'ai utilisé que des champs observés sur un vrai appel, et chaque enregistrement est validé par Zod.

| Problème rencontré | Ce que j'ai fait |
| --- | --- |
| Chaque publication existe en français et en anglais | Je ne garde que le français (on perd Ayvens, qui ne publie qu'en anglais). |
| Les heures sont fausses d'une heure : la source applique l'heure d'été en hiver | On reconstitue l'heure de Paris, puis on la convertit avec le vrai fuseau. |
| La même publication arrive par deux diffuseurs | Même société, même titre, moins de 3 jours d'écart : le second est masqué. |
| ISIN de remplissage `999999999999` | Affiché « ISIN non renseigné ». |
| Documents ZIP (ESEF) au lieu de PDF | Ignorés pour les brèves. |
| 110 publications sur 187 sont des « Informations privilégiées » | Le type ne suffit pas : il faut lire le titre, puis le document. |
| Titres vides de sens (« Autres communiqués ») | Score neutre : ils ne sont pas écartés. |
| Nombres écrits de dix façons (`14 444 millions d'euros`, `9,1 G$`, `- 13,6 %`) | Normalisés par le code avant comparaison. |

Le détail est dans [`docs/NOTES.md`](docs/NOTES.md).

### Le critère de sélection

Le principe : **l'IA classe, le code décide.** On ne demande jamais au modèle si une publication est « intéressante ».

1. **Des règles sur le titre** (sans IA) donnent un score : fort (résultats, acquisition, offre publique, nomination…), moyen (seuil, rachat d'actions) ou routine (droits de vote, mise à disposition d'un document…).
2. **Pour les 10 meilleures**, Haiku lit le document et remplit une grille fermée : type d'événement, montant annoncé, impact sur le capital ou sur la direction. **Le code calcule le score final**, et les 5 meilleures reçoivent une brève.

Les raisons de chaque score sont affichées dans le fil.

**Limites connues**

- Beaucoup de publications ont le même score (124 ont le score maximal), mais seules 10 sont lues par l'IA. Pour choisir ces 10, on prend d'abord les sociétés du CAC 40. Les 5 brèves concernent donc de grandes sociétés, alors que Clardot couvre aussi les PME (nous avons raté AgroGeneration).
- La sélection porte sur toutes les publications en base. Un vrai fil de veille sélectionnerait plutôt sur le dernier jour ouvré, pour que les brèves restent de l'actualité.
- Les titres vagues ne passent jamais à la grille. Piste : lire la première page du PDF pour ces titres.

### Le contrôle des chiffres

Pour chaque chiffre, la brève doit donner la **citation exacte** du document. Le code vérifie ensuite trois choses :

1. la citation est mot pour mot dans le document ;
2. le chiffre est dans la citation ;
3. le chiffre est dans la brève.

| Statut | Signification |
| --- | --- |
| 🟢 **Vérifié** | les trois contrôles passent |
| 🟠 **À confirmer** | le chiffre est dans le document, mais la citation n'est pas exacte |
| ⚪ **Non vérifiable** | le chiffre est introuvable |

Les nombres sont comparés par valeur : `7,3 Md€` = `7 300 M€` = `7,3 milliards d'euros`. « T3 » ou « 3ème » ne comptent pas comme le nombre 3.

Si un chiffre est introuvable ou si la brève sort de 100 à 150 mots, **elle est régénérée une seule fois**, avec les erreurs. La raison de la relance est affichée.

**Résultat** : 40 chiffres sur 40 vérifiés.

---

## 3. L'IA et le bilan

### Trois prompts clés

<details>
<summary><b>1. Grille de sélection</b> (Haiku, effort bas)</summary>

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
</details>

<details>
<summary><b>2. Brève</b> (Haiku, effort moyen)</summary>

```
Tu es journaliste financier. Tu rédiges une brève à partir d'une publication réglementée déposée auprès de l'AMF.
Utilise UNIQUEMENT le texte fourni entre les balises <document>.

- titre : informatif et factuel, sans superlatif.
- corps : entre 100 et 150 mots, en français, au présent, sans formule promotionnelle.
- faits_cles : 3 à 5 faits courts.
- chiffres : CHAQUE chiffre cité dans le corps (montants, pourcentages, quantités ; jamais les dates), avec sa valeur telle qu'écrite dans le document (ex. "7,3"), son unité (ex. "Md€", "M€", "%") et citation_exacte : la phrase du document qui contient ce chiffre, recopiée mot pour mot.

Règles strictes :
- n'utilise aucun chiffre absent du document ;
- ne calcule rien : ni variation, ni conversion, ni arrondi, ni total ;
- n'ajoute aucune information extérieure au document ;
- ignore la présentation générique de la société (section « À propos », « About », effectifs, nombre de clients) : n'en tire ni fait ni chiffre ;
- ne reformule jamais une citation_exacte.
```
</details>

<details>
<summary><b>3. Relance</b> (une seule fois)</summary>

```
Le contrôle automatique a détecté des problèmes dans ta brève précédente.
Réécris la brève complète en corrigeant ces problèmes, avec les mêmes règles.
```
</details>

**Ce qui a changé en route :**
- Le tool use forcé et la température renvoient une erreur sur les modèles 5.5 : j'ai utilisé les structured outputs.
- Les dates sont exclues des chiffres.
- La section « À propos » est ignorée : les chiffres de STMicro en venaient.

### Erreurs de l'IA détectées

**Des chiffres vrais mais hors sujet (STMicroelectronics).** Pour une annonce de nominations, Haiku a cité « 49 000 collaborateurs » et « 200 000 clients ». Les deux chiffres sont bien dans le PDF, donc la vérification les a passés au vert. Mais ils viennent du paragraphe « À propos », pas de l'annonce.
C'est la limite de notre contrôle : il prouve qu'un chiffre est dans le document, pas qu'il est pertinent. Correction : une règle dans le prompt pour ignorer la présentation de la société. La brève régénérée ne parle plus que des nominations.

**Une date prise pour un chiffre.** Haiku a listé « 1er janvier 2027 » parmi les chiffres d'une brève, et le vérificateur lisait le nombre 1. Correction : le prompt exclut les dates, et le code les ignore.

### Ce que je ferais avec plus de temps

**Avec un jour de plus**
- Améliorer le système de score : une échelle plus fine que 0 à 3 (une acquisition vaut plus qu'un simple chiffre d'affaires), et quand plusieurs publications ont le même score, choisir selon l'événement annoncé et non selon la taille de la société, en faisant lire par l'IA toutes les publications au score maximal, ce qui coûte peu.
- Lire les tableaux des PDF comme des tableaux.
- Garder la version anglaise quand elle est la seule.

**Architecture cible**
- Un score par profil de lecteur : tout le monde ne suit pas les mêmes informations. Un analyste M&A veut les acquisitions et les offres publiques, un directeur financier les résultats de ses concurrents, un investisseur les sociétés de son portefeuille. Le score combinerait l'importance de l'événement et l'intérêt du lecteur (sociétés, secteurs et types d'information suivis).
- Une queue BullMQ avec un worker sur Railway, une reprise sur échec et un budget de tokens.
- Des personas LLM qui notent les brèves : analyste M&A, directeur financier, journaliste.
- Un suivi de lecture (temps de lecture, Intersection Observer), puis un clustering des lecteurs et du filtrage collaboratif.
- Un critère de sélection ajusté avec les données d'audience, et de petits modèles spécialisés pour réduire le coût.

### Temps passé

Environ 3 h 30.
