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

## Prompts

## Erreurs de l'IA

## Temps
