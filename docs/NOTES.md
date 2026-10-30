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

## Prompts

## Erreurs de l'IA

## Temps
