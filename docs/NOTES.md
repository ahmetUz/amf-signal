# Notes (matière du README)

## Données

- Source : API Opendatasoft Explore v2.1, dataset `flux-amf-new-prod`. Environ 300 publications sur 3 jours, soit 4 pages de 100.
- Champs retenus, vérifiés sur un vrai appel le 30/10/2026 :
  - `uin_idt_uin` : identifiant unique de la publication.
  - `uin_dat_amf` : date et heure du dépôt.
  - `identificationsociete_iso_cd_isi` : ISIN.
  - `identificationsociete_iso_nom_soc` : nom de la société.
  - `identificationsociete_iso_pay_ss` : pays.
  - `type_d_information` et `sous_type_d_information` : type et sous-type d'information.
  - `informationdeposee_inf_tit_inf` : titre.
  - `informationdeposee_inf_lng_inf` : langue (« Français » ou « Anglais »).
  - `url_de_recuperation` : URL du document.
- Doublons bilingues : une même information est déposée en français et en anglais, sous deux identifiants différents, à quelques secondes d'écart (exemple : Air Liquide, `083611` en FR et `083610` en EN, 29 s d'écart).
- **Choix (v1) : on ne collecte que les publications en français** (filtre `where` sur la langue). C'est plus simple qu'un regroupement. Ce qu'on perd : les émetteurs qui publient seulement en anglais, soit 1 ISIN sur 3 jours (Ayvens, dont un résultat trimestriel). Pistes d'amélioration : regrouper par ISIN, sous-type et fenêtre de temps, et garder la version anglaise quand elle est seule.
- Paquets ESEF : certaines URL sont des `.zip` et non des PDF. Certains chemins contiennent une année `8888/01`, qui ressemble à une valeur de remplissage.
- Le champ `filename` vaut « Nouveau » : ce n'est pas le nom du fichier.
- Le champ `informationdeposee_inf_upg_inf_inf_upg_sts` vaut `NEW`. Il existe donc sans doute des rectificatifs (à vérifier).
- Collecte du 30/10/2026 : 187 publications en français sur 3 jours, 0 rejet par Zod. Seuls `type_d_information` et `sous_type_d_information` sont parfois null (1 cas) : ils sont nullable dans le schéma.
- Émetteurs étrangers : 8 publications sur 187 ne sont pas FR (NL, BE, DE, IT, GR). RE (La Réunion) est classé à part alors que c'est la France. On les garde : le pays est stocké et pourra servir de filtre.
- Précision des dates : 116 publications sur 187 ont une heure de dépôt pile à la minute (`:00`), les autres ont des secondes. La précision dépend sans doute du diffuseur, donc on ne peut pas compter sur les secondes pour départager deux dépôts.
- Fuseau horaire incertain : `uin_dat_amf` est en `+00:00`, mais le champ `timezone_uin_dat_amf` vaut `02:00` (heure d'été) alors que Paris est en UTC+1 depuis le 25/10. On stocke l'horodatage tel quel, en `timestamptz`.
- Upsert sur `uin` : une seconde collecte donne toujours 187 lignes. `score` et `selected` ne sont pas écrasés par une nouvelle collecte.
- Sous-types : 110 publications sur 187 sont classées « Informations privilégiées », une catégorie fourre-tout qui couvre aussi bien un contrat qu'une acquisition ou un changement de dirigeant. Le sous-type ne suffit donc pas pour le score de sélection : il faut aussi analyser le titre.
- Type contre sous-type : `type_d_information` n'a que 4 valeurs, trop larges pour être utiles. Le filtre et les badges utilisent donc `sous_type_d_information`.
- Titres génériques : au moins 25 publications ont pour titre la simple répétition de leur catégorie, par exemple « Informations privilégiées / Autres communiqués » ou « Information financière trimestrielle / Information financière du troisième trimestre ». Le titre ne dit alors rien de l'événement : seul le document permet de juger.
- Pièges de mots-clés : un titre comme « Acquisition ou cession des actions de l'émetteur / Transactions sur actions propres » contient le mot « acquisition », alors qu'il s'agit d'un rachat d'actions courant, pas d'une opération de M&A. À l'inverse, « Malteries Franco Belges : Résultats de l'exercice […] et mise à disposition du Rapport financier annuel » contient « mise à disposition », mot typique de la routine, mais il annonce de vrais résultats.
- Émetteurs non cotés : des collectivités locales déposent aussi dans le flux (« Délibération BP 2026 », « Délibération Augmentation de plafond EMTN »), car elles émettent des obligations.
- Champ `cac40` irrégulier : il vaut « 1 » pour 24 publications, « 0 » pour 65 et null pour 98, alors que null et « 0 » signifient la même chose. Comme Postgres place les null en tête d'un tri DESC, le premier tri des candidates était faux : il a fallu un `coalesce(..., false)`.
- Conséquence de la précision à la minute : des publications sont ex aequo sur le score, le CAC 40 et la date. Sans critère de tri supplémentaire, Postgres renvoyait les candidates dans un ordre variable d'un appel à l'autre. On ajoute `uin` comme dernier critère pour que la sélection soit reproductible.
- Formats de nombres relevés dans 10 PDF : `1,4 milliard d’euros`, `14 444 millions d’euros`, `+304 m€` (« m€ » en minuscules signifie millions), `491 Md€`, `9,1 G$`, `- 13,6 %` (signe séparé), `−42,2 %` (moins typographique), `250 pb`, `1,9 point`, ainsi que des tableaux « (en millions d'euros) » dont les cellules n'ont pas d'unité.
- Limites connues de `lib/verification/numbers.ts` :
  - unpdf aplatit les tableaux en une seule ligne, si bien que des cellules voisines peuvent fusionner en un seul nombre (« 477 464 429 » est lu comme 477 464 429). Le chiffre devient alors introuvable : on obtient un faux négatif (« à confirmer » ou « non vérifiable »), jamais un faux « vérifié » ;
  - le format anglo-saxon `1,234.5` est mal lu ;
  - un nombre sans unité dans le texte correspond à n'importe quelle échelle (repli nécessaire pour les tableaux). Le contrôle (a) sur la citation compense en partie ce manque de rigueur.

## Prompts

- Écart avec la spec initiale (30/10/2026) : la documentation à jour de l'API indique que `tool_choice` forcé renvoie une 400 sur Sonnet 5.5 et Opus 5.5, et que toute température non par défaut renvoie une 400 sur Haiku 5.5 et Sonnet 5.5. On utilise donc les structured outputs (`messages.parse`, avec un schéma Zod garanti par l'API puis revalidé). Pour la stabilité, on compte sur `effort: "low"` et sur une grille de champs fermés plutôt que sur la température.

### Grille de sélection (Haiku, `lib/selection/grid.ts`)

Modèle `claude-haiku-5-5`, `effort: "low"`, structured output avec `gridSchema` (Zod). Entrée : société, type AMF, titre, puis le texte des 3 premières pages entre balises `<document>`.

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

Premier essai (30/10/2026, 10 candidates, 25 s) : les 10 citations ont été retrouvées mot pour mot. Vérification manuelle d'un cas douteux : TotalEnergies avait `impact_capital = true`, ce que confirme le document (augmentation de capital réservée aux salariés et rachat d'actions de 2,5 G$).

### Brève (Haiku, `lib/briefs/write.ts`)

Modèle `claude-haiku-5-5` (choisi plutôt que Sonnet : c'est un test technique, et la vérification par le code compense), `effort: "medium"`, structured output `briefOutputSchema`. Le lien vers la source est ajouté par le code.

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

### Relance (une seule, `lib/briefs/generate.ts`)

Déclenchée si un chiffre est `non_verifiable` ou si le corps sort de 100 à 150 mots (compte fait par le code). On renvoie la brève précédente et la liste des problèmes :

```
Le contrôle automatique a détecté des problèmes dans ta brève précédente.
Réécris la brève complète en corrigeant ces problèmes, avec les mêmes règles.
```

Premier essai (30/10/2026, 5 brèves) : 4 sur 5 ont eu besoin d'une relance, et les 5 ont fini avec tous leurs chiffres `verifie` (46 chiffres). Le motif des premières tentatives n'a pas été conservé (voir les améliorations).

## Comparaison avec Clarsource et Clardot (30/10/2026)

- **Clarsource** (le fil) ne rédige pas de brève pour une publication AMF. Il reprend le titre officiel, ajoute une étiquette de catégorie (« Résultats & Vie financière », « Nominations », « Fusions & Acquisitions »), le type et le sous-type AMF, puis renvoie vers le PDF.
- **Clardot** (le journal) rédige les articles. Leur corps est réservé aux abonnés, on ne peut donc comparer que le titre et le chapô. Leurs titres utilisent un verbe éditorial et le chiffre-clé en toutes lettres (« Sapmer accuse une perte nette de 13,1 millions d'euros au semestre »). Le chapô donne l'angle (« …malgré…, mais… »), suivi d'une section « À retenir ». Nos brèves sont plus neutres et n'ont pas de chapô, mais leurs chiffres sont contrôlés et le statut de chaque chiffre est affiché.
- **Ce que notre sélection a raté.** Clardot a consacré un article à 2 publications que nous n'avons pas retenues :
  - **Sapmer** (« Sapmer-Rapport financier semestriel 2026 ») : notre règle classait « rapport financier » en routine. **Corrigé** : seule la « mise à disposition » d'un rapport est de la routine (test TDD sur le titre réel). Le score passe de 0 à 1 (« à vérifier dans le document »).
  - **AgroGeneration** (« Résultats semestriels 2026… ») : score de 3, mais hors du top 10, car les ex aequo sont départagés par le CAC 40. **Biais assumé, non corrigé** : le départage favorise les grandes sociétés, alors que Clardot couvre aussi les petites valeurs quand le fait est marquant.
- Pistes d'amélioration : départager les ex aequo sur l'événement (une grille Haiku sur plus de candidates, ce qui est peu coûteux) plutôt que sur la taille ; ajouter un champ `chapo` et un style de titre éditorial dans le prompt de la brève.

## Erreurs de l'IA

## Temps
