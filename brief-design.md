# Fusion Usage — brief de design

Document destiné à un studio de design. Il décrit le produit, les écrans à dessiner et toutes les données que ces écrans peuvent afficher. Chaque bloc s’appuie sur un endpoint déjà disponible. Rien n’est à inventer au-delà de cette liste.

Langue de l’interface : français. Public : un super-administrateur qui veut comprendre qui utilise la plateforme Fusion, et comment.

## 1. Le produit

Fusion est une plateforme d’ingénierie LLM. Les applications qui s’y connectent envoient des **traces** : un enregistrement par exécution (une conversation, un appel de workflow, un run d’agent).

**Fusion Usage** est un tableau de bord séparé, réservé aux super-admins. Il ne sert pas à débugger une trace. Il sert à répondre à quatre questions :

1. Combien de traces partent, et est-ce que ça monte ou ça baisse ?
2. Qui consomme, qui ralentit, qui n’a jamais commencé ?
3. Quelle part de l’usage passe par les **workflows**, quelle part passe par la **plateforme agentique** ?
4. Combien coûtent ces usages, combien de tokens ils consomment, et où sont les erreurs ?

Un utilisateur est rattaché à un **tenant** (une organisation) et à un ou plusieurs **projets**. Les traces sont comptées par projet, puis regroupées par compte.

### Comment une trace est classée

La classification se lit dans les metadata de la trace.

| Type | Signe distinctif | Nom affiché | Détails supplémentaires |
| --- | --- | --- | --- |
| Workflow | présence de `graphId` | `workflowName` | `nodeCount` : nombre de nœuds du graphe |
| Agent | présence de `flow_id` | `flow_name` | `start_time`, `end_time`, `time_elapsed` : durée du run |
| Autre | ni l’un ni l’autre | — | traces hors workflow et hors agent |

Une trace qui contient à la fois `graphId` et `flow_id` compte dans les deux. Les parts « workflow + agent + autre » d’un projet, elles, sont calculées pour totaliser 100 %. Le design ne doit pas présenter un camembert unique « workflow / agent / autre » comme si les deux premiers s’excluaient, sauf sur les parts déjà normalisées par projet (`workflowShare`, `agentShare`).

### Périmètre et période

- Accès : compte **super-admin** uniquement. Un autre compte voit un écran d’accès refusé.
- Période : au plus **90 jours**. Défaut : les 30 derniers jours, du jour J-29 à aujourd’hui inclus.
- Comparaison : la période immédiatement précédente, de même durée. Exemple : 30 jours comparés aux 30 jours d’avant. Cette comparaison n’est pas un paramètre d’API : le dashboard appelle deux fois les endpoints, une fois par fenêtre.
- Granularité des courbes : heure, jour ou semaine. Défaut : jour.
- Filtre utilisateur : un `userId` restreint les courbes, l’adoption, les workflows et les agents à ce compte. Les cartes globales de la vue d’ensemble restent sur l’ensemble des comptes.

## 2. Écrans à designer

Sept écrans. Le chrome (sidebar, filtres) est commun aux écrans 3 à 6.

| # | Écran | Rôle |
| --- | --- | --- |
| 1 | Connexion | email ou identifiant + mot de passe |
| 2 | Vérification | code à 6 chiffres, si le compte a la double authentification |
| 3 | Vue d’ensemble | volume, santé, signaux, top consommateurs, tenants |
| 4 | Workflows et agents | adoption, coût, durée, détail par workflow et par flow |
| 5 | Utilisateurs | tableau de tous les comptes et projets |
| 6 | Fiche utilisateur | panneau latéral : tout le détail d’un compte |
| 7 | États transverses | chargement, vide, erreur, accès refusé, période invalide |

Le classement « top utilisateurs » a aussi un endpoint dédié (`GET /api/auth/usage/top-users`). Aujourd’hui le dashboard le calcule à partir de la liste des projets. Le design de la vue d’ensemble doit prévoir ce classement ; un écran séparé n’est pas nécessaire.

## 3. Chrome commun

Présent dès qu’une session est ouverte.

**Sidebar, rétractable en icônes**

- Marque : « Fusion » / « Usage des traces ».
- Navigation : Vue d’ensemble ; Workflows et agents (badge = nombre de comptes qui ont au moins une trace workflow ou agent) ; Utilisateurs (badge = nombre de lignes).
- Pied : avatar et nom du compte connecté, bascule mode clair / mode sombre, déconnexion.
- Le thème suit le réglage du système au premier passage, puis le choix est mémorisé.

**En-tête de page**

- Fil d’Ariane court (petit texte en capitales) et titre de la section.
- Bouton pour replier la sidebar.

**Barre de filtres, visible en scroll**

- Raccourcis 7 jours, 30 jours, 90 jours. Le raccourci qui correspond exactement aux dates affichées est mis en évidence.
- Date de début, date de fin. La fin ne peut pas dépasser aujourd’hui. La fin ne peut pas précéder le début. L’écart ne peut pas dépasser 90 jours.
- Granularité : Heure, Jour, Semaine.
- Sélecteur d’utilisateur : champ de recherche (nom, tenant, début d’identifiant), liste au clavier (flèches, Entrée, Échap), croix pour retirer le filtre. Chaque ligne montre le nom, le tenant et le nombre de traces.
- Bouton Rafraîchir, libellé « Chargement… » pendant un appel. En dessous : « Mis à jour à HH:MM », ou « Pas encore chargé ».
- Fine barre de progression pendant les chargements suivants. Au premier chargement, des squelettes remplacent le contenu.

**Filtre actif**

Quand un utilisateur est choisi et que sa fiche est fermée, un bandeau dit : « Courbes et détails filtrés sur {nom} », avec « Voir la fiche » et « Retirer le filtre ».

**URL**

Les dates, la granularité, la section et l’utilisateur sont dans l’adresse. Un rafraîchissement ou un lien partagé rouvre la même vue.

**Responsive**

- Large : sidebar + contenu, graphiques côte à côte.
- Moyen : graphiques empilés, cartes KPI sur deux colonnes.
- Étroit : sidebar en tiroir, filtres empilés, KPI sur une colonne, fiche en plein écran.

## 4. Écran 1 — Connexion

Carte centrée, fond neutre. La page de connexion reste en thème clair.

- Marque Fusion / Usage.
- Titre : « Connexion ».
- Texte : « Accès réservé aux comptes super-admin. »
- Champ : email ou nom d’utilisateur.
- Champ : mot de passe.
- Bouton : « Se connecter ». Pendant l’envoi : « Connexion… », bouton désactivé.
- Erreur sous le formulaire, dans un encart : message renvoyé par l’authentification (identifiants refusés, serveur injoignable).

Source : `POST /api/v1/auth/login` sur le service d’authentification.

## 5. Écran 2 — Vérification

Même carte, même marque.

- Titre : « Vérification ».
- Texte : « Entre le code à 6 chiffres de ce compte. »
- Un seul champ numérique, 6 chiffres, focus immédiat.
- Bouton : « Valider ».
- Lien : « Utiliser un autre compte », qui revient à l’écran 1 sans garder le code.
- Même encart d’erreur (code refusé, code expiré).

Source : `POST /api/v1/auth/verify-2fa`. La déconnexion appelle `POST /api/v1/auth/logout`.

## 6. Écran 3 — Vue d’ensemble

Titre : « Qui utilise la plateforme, et comment ça évolue ».
Fil : « Super-admin · usage des traces ».

Question de l’écran : le volume tient-il, et quels comptes demandent une action ?

### 6.1 Quatre cartes

Fond sombre, chiffre principal en grand, précision en dessous.

| Carte | Chiffre | Pastille | Précision |
| --- | --- | --- | --- |
| Traces sur la période | total des traces | variation vs période précédente (`+12 %`, `-23 %`, `Nouveau`, ou rien si égal) | total précédent et moyenne par jour |
| Adoption des comptes auth | part des comptes auth qui ont envoyé au moins une trace | teinte d’alerte si la part est sous 50 % | « 9 sur 14 comptes ont envoyé des traces » |
| Concentration top 5 | part des traces venant des 5 plus gros | alerte si la part atteint 80 % | « L’usage dépend de très peu d’utilisateurs » ou « Part des traces venant des 5 plus gros utilisateurs » |
| À surveiller | nombre de comptes en baisse de plus de 50 %, ou arrêtés | alerte si le nombre est > 0 | « Baisse de plus de 50 % ou arrêt par rapport à la période précédente » |

La variation est verte quand ça monte, orange quand ça baisse.

### 6.2 Évolution des traces

Courbe. Trait plein : période actuelle. Trait pointillé : période précédente, alignée jour pour jour (ou heure pour heure, semaine pour semaine). Les trous sont comblés par des zéros, pour que la courbe ne saute pas.

Au-dessus du graphe, trois faits : total de la courbe, variation, pic (valeur et date).

Si un utilisateur est filtré, le sous-titre le nomme et un bouton retire le filtre. Sinon : « Tous les projets ».

Vide : « Aucune trace sur ces deux périodes. »

Source : `GET /api/auth/usage/timeseries`, appelé deux fois (fenêtre actuelle, fenêtre précédente), avec `granularity` et, si besoin, `userId`.

### 6.3 Santé de l’usage

Anneau + légende. Une ligne par statut, avec le nombre et la part.

| Statut | Règle | Couleur |
| --- | --- | --- |
| Actif | au moins une trace, et la dernière date de moins de 7 jours | vert |
| Ralenti | des traces sur la période, mais la dernière date de plus de 7 jours | ambre |
| Arrêté | rien sur la période, alors qu’il y en avait sur la période précédente | rouge |
| Dormant | rien sur les deux périodes | gris |

Le total de la légende est le nombre de lignes utilisateurs et projets, pas le nombre de traces.

### 6.4 Décisions à prendre

Trois colonnes. Chaque colonne liste au plus 6 noms, puis « et N autres dans le tableau ». Un nom ouvre la fiche.

| Colonne | Qui | Ce qu’on affiche à côté du nom |
| --- | --- | --- |
| Relancer | baisse de plus de 50 %, ou arrêté | « 82 → 40 (−51 %) » |
| Accompagner | aucune trace avant, des traces maintenant | « 120 traces » |
| Activer | compte auth sans aucune trace sur les deux périodes | nom du tenant |

Vide de colonne : « Rien à signaler. »

### 6.5 Top 10 consommateurs

Barres horizontales, 10 premières lignes qui ont au moins une trace. Vert : compte authentifié. Rouge : projet hors authentification (pas de `userId`). Un clic sur une barre de compte auth ouvre la fiche.

Info-bulle : nombre de traces, part du total, variation.

Vide : « Aucune trace sur cette période. »

Le endpoint `GET /api/auth/usage/top-users?limit=1..20` renvoie le même classement, agrégé par compte : `userId`, `userName`, `tenantId`, `tenantName`, `traceCount`. Limite par défaut : 5. Maximum : 20.

### 6.6 Traces par tenant

Barres horizontales. Les tenants sont regroupés, les 7 premiers restent nommés, le reste est fusionné dans « Autres ». Un tenant sans nom s’affiche « Sans tenant ».

Info-bulle : traces et variation vs période précédente.

## 7. Écran 4 — Workflows et agents

Titre : « Comment la plateforme est utilisée ».
Fil : « Workflows et agents ».

Légende permanente : pastille Workflow = trace avec `graphId` ; pastille Agent = trace avec `flow_id`.

### 7.1 Quatre cartes

| Carte | Chiffre | Détail |
| --- | --- | --- |
| Utilisateurs de workflows | nombre de comptes avec au moins une trace workflow | part des utilisateurs actifs, nombre de traces, nombre de workflows distincts, variation du volume de traces workflow |
| Utilisateurs de la plateforme agentique | nombre de comptes avec au moins une trace agent | part des utilisateurs actifs, nombre de comptes qui font aussi des workflows, variation du volume agent |
| Exécutions d’agents | nombre de runs | nombre de flows distincts, durée moyenne, p95 le plus lent |
| Coût workflows et agents | somme des coûts, en dollars | coût workflow, coût agent, tokens (notation compacte), nombre d’erreurs. Alerte si des erreurs existent |

Si les coûts ne sont pas demandés, la quatrième carte dit : « Aucune observation rattachée sur la période ».

### 7.2 Courbe workflows et agents

Deux lignes sur la période actuelle : workflows et agents. Pas de période précédente sur ce graphe. Le filtre utilisateur s’applique.

Vide : « Aucune trace de workflow ou d’agent sur cette période. »

Source : `GET /api/auth/usage/timeseries` avec `feature=workflow`, puis avec `feature=agent`. On peut aussi restreindre à un nom exact : `workflowName` ou `flowName`. Les deux noms ne se combinent pas. Le design doit prévoir ce filtre par nom dans la barre d’outils du tableau (voir 7.4), pas un second sélecteur global : il ne concerne que cette section.

### 7.3 Qui utilise quoi

Barres horizontales empilées, top 10 des comptes qui ont au moins une trace workflow ou agent. Trois segments : Workflows, Agents, Autres traces. Un clic ouvre la fiche.

Vide : « Personne n’a encore utilisé les workflows ou les agents sur cette période. »

### 7.4 Tableau de détail

Deux onglets : « Workflows · N » et « Agents · N ». Recherche texte (nom du workflow ou du flow, identifiant, nom d’utilisateur, tenant). Si un utilisateur est filtré, le tableau ne montre que ses lignes. Bouton « Exporter CSV » : exporte les lignes visibles, séparateur `;`, virgule décimale, en-têtes en français. Le fichier s’ouvre dans Excel en français.

**Onglet Workflows**

| Colonne | Champ |
| --- | --- |
| Workflow | `workflowName`, sinon « Workflow sans nom ». En dessous, `graphId` en monospace, tronqué |
| Utilisateur | nom résolu, tenant en dessous |
| Traces | `traceCount` |
| Sessions | `uniqueSessions` |
| Nœuds moy. | `avgNodeCount` |
| Nœuds max | `maxNodeCount` |
| Coût | `totalCost`, en dollars. « — » si absent. Sous 0,01 $ : « < 0,01 $ » |
| Tokens | `totalTokens`, notation compacte |
| Erreurs | `errorCount`, en rouge si > 0 |
| Dernier usage | `lastUsedAt` |

**Onglet Agents**

| Colonne | Champ |
| --- | --- |
| Flow agentique | `flowName`, sinon « Flow sans nom ». En dessous, `flowId` |
| Utilisateur | nom, tenant |
| Exécutions | `runCount` |
| Sessions | `uniqueSessions` |
| Durée moy. | `avgDurationMs` |
| p50 | `p50DurationMs` |
| p95 | `p95DurationMs` |
| Max | `maxDurationMs` |
| Coût | `totalCost` |
| Erreurs | `errorCount` |
| Dernier usage | `lastUsedAt` |

Les durées s’affichent en millisecondes sous 1 s, en secondes sous 1 min, sinon « N min SS s ». Une valeur absente est « — ».

Un clic sur une ligne de compte auth ouvre la fiche. Les lignes se trient par volume décroissant.

Vide : « Aucune ligne pour ce filtre. »

Message d’ensemble, au-dessus des cartes, quand aucune trace workflow ni agent n’existe sur la période : expliquer les clés attendues (`graphId`, `workflowName`, `nodeCount` pour les workflows ; `flow_id`, `flow_name`, `start_time`, `end_time` pour les agents). Ce message ne remplace pas les cartes : il explique pourquoi elles sont à zéro.

Sources :

- `GET /api/auth/usage/adoption?from&to&userId`
- `GET /api/auth/usage/workflows?from&to&userId&include=observations`
- `GET /api/auth/usage/agent-flows?from&to&userId&include=observations`

`include` n’accepte que la valeur `observations`. Sans ce paramètre, coût, tokens et erreurs sont absents.

## 8. Écran 5 — Utilisateurs

Titre : « Utilisateurs et projets ».
Fil : « Comptes et projets ».

Une ligne par compte authentifié (tous ses projets additionnés) ou, à défaut de compte, par projet nommé. Les projets sans nom et sans compte sont regroupés dans une seule ligne « Projets sans nom ».

Outils : onglets de filtre, recherche nom ou tenant, export CSV des lignes visibles.

| Filtre | Règle |
| --- | --- |
| Tous | toutes les lignes |
| Comptes auth | la ligne a un `userId` |
| Hors auth | la ligne n’a pas de `userId` |
| Workflows | au moins une trace workflow |
| Agents | au moins une trace agent |
| À surveiller | baisse de plus de 50 % |

| Colonne | Contenu |
| --- | --- |
| Nom | nom du compte. Pastille « Compte auth » ou « Projet hors auth ». Si plusieurs projets : « · N projets » |
| Tenant | `tenantName`, sinon « — » |
| Traces | somme de la période |
| Période préc. | somme de la fenêtre précédente |
| Variation | `+12 %`, `-23 %`, `Nouveau`, ou « — » |
| Part | part des traces de la période. « — » si la ligne est à zéro |
| Usage plateforme | pastille « Workflow · N » et « Agent · N ». « — » si les deux sont à zéro |
| Dernière trace | date et heure, ou « — » |
| Statut | pastille de couleur + libellé (Actif, Ralenti, Arrêté, Dormant) |

Un clic ou une touche Entrée sur un compte auth ouvre la fiche et filtre les courbes. La ligne sélectionnée reste surlignée. Une ligne hors auth n’est pas cliquable : elle n’a pas de fiche.

Vide : « Aucune ligne pour ce filtre. »

Source : `GET /api/auth/usage/projects`, deux fois (période et période précédente). Les noms et prénoms viennent de `POST /api/v1/users/by-ids` sur le service d’authentification. Si ce service ne répond pas, on affiche le nom porté par le projet, sinon « Utilisateur sans nom ».

## 9. Écran 6 — Fiche utilisateur

Panneau latéral droit, environ 560 px, plein écran sur mobile. Le reste de la page est assombri. Fermeture : bouton Fermer, touche Échap, clic sur le fond. Le focus entre sur Fermer.

La fiche ne concerne qu’un compte auth. Elle reprend le filtre `userId` déjà appliqué aux courbes.

**En-tête** : « Fiche utilisateur », nom, tenant ou « Sans tenant », pastille de statut.

**Quatre chiffres** : traces de la période avec la variation ; part du total ; nombre de projets actifs ; date de la dernière trace.

**Usage de la plateforme** : barre empilée Workflows / Agents / Autres, puis une ligne par segment avec le nombre et la part. En dessous, une phrase : coût cumulé, tokens, erreurs, et durée moyenne des agents s’il y a des runs.

**Évolution sur la période** : trois lignes, toutes les traces, workflows, agents. Pendant un rechargement, ce bloc passe en attente visuelle sans disparaître.

**Workflows** : liste, la plus volumineuse en premier. Chaque ligne : nom, nœuds moyens, sessions, dernier usage, nombre de traces, coût.

**Flows agentiques** : nom, durée moyenne, p95, erreurs s’il y en a, nombre de runs, coût.

**Projets** : identifiant du projet en monospace, dernière trace, nombre de traces.

Listes vides, chacune son message : « Aucun workflow utilisé sur la période. », « Aucun flow agentique exécuté sur la période. », « Aucun projet actif sur la période. », « Aucune trace de workflow ni d’agent pour ce compte sur la période. »

Si l’identifiant dans l’adresse ne correspond à aucun compte de la période : « Aucune donnée pour ce compte sur la période choisie. »

Champs disponibles et non encore montrés dans la fiche, à placer si la mise en page le permet sans la surcharger : `firstUsedAt` (premier usage), `firstWorkflowAt`, `firstAgentAt`, `maxNodeCount`, `p50DurationMs`, `maxDurationMs`, `uniqueSessions`.

## 10. Écran 7 — États

À dessiner une fois, réutilisables partout.

| État | Où | Contenu |
| --- | --- | --- |
| Premier chargement | à la place du contenu de la section | squelettes : 4 cartes, 2 blocs de graphique, 1 bloc bas. Pas de chiffre fictif |
| Chargement suivant | barre de filtres | le contenu déjà affiché reste. Bouton « Chargement… ». Barre fine animée |
| Période invalide | sous les filtres | « Les dates ne sont pas valides. », « La date de début doit être avant la date de fin. », ou « La période ne peut pas dépasser 90 jours. » |
| Fusion injoignable | bannière | « Fusion est injoignable. Vérifie que le serveur tourne sur le port 3000. » |
| Session expirée | — | retour à l’écran 1, sans bannière |
| Compte non super-admin | bannière, contenu vide | « Ce compte n’est pas super-admin. Ces statistiques lui sont fermées. » |
| Workflows et agents non déployés | uniquement la section 4 | « Les endpoints workflows et agents ne sont pas encore déployés sur ce serveur Fusion. » Les sections 3 et 5 continuent de fonctionner |
| Utilisateur hors périmètre | bannière | le serveur répond 404, code `USER_NOT_FOUND` |
| Liste vide | dans la carte ou le tableau concerné | le message prévu à chaque bloc, jamais une carte blanche sans texte |
| Mouvement réduit | partout | pas d’animation de squelette, de barre, ni d’ouverture de fiche |

## 11. Dictionnaire des données

Toutes les routes d’usage sont des `GET`. Authentification : `Authorization: Bearer <token>`. Fenêtre : `from` et `to` en date ISO. Sans `from`, le serveur prend 30 jours avant `to`. Sans `to`, il prend maintenant.

Erreurs communes : 401 jeton absent ou refusé (`INVALID_TOKEN`), 403 pas super-admin (`FORBIDDEN`), 400 paramètre illisible (`INVALID_QUERY`), 405 autre méthode que GET, 404 utilisateur hors périmètre (`USER_NOT_FOUND`).

### Projets — `GET /api/auth/usage/projects`

Une ligne par projet.

| Champ | Sens |
| --- | --- |
| `projectId` | identifiant du projet |
| `tenantId`, `tenantName` | organisation. Peuvent être vides |
| `userId`, `userName` | compte. Vides si le projet n’est pas rattaché à l’authentification |
| `traceCount` | nombre de traces sur la fenêtre |
| `lastTraceAt` | date de la dernière trace, ou vide |

### Série temporelle — `GET /api/auth/usage/timeseries`

Paramètres en plus : `granularity` (`hour`, `day`, `week`), `userId`, `feature` (`workflow` ou `agent`), `workflowName`, `flowName`.

Réponse : `{ userId, userName, tenantId, tenantName, data: [{ bucket, traceCount }] }`. Le sujet n’est présent que si `userId` a été demandé. `bucket` est une date ISO de début de tranche.

### Top utilisateurs — `GET /api/auth/usage/top-users`

Paramètre `limit`, entier de 1 à 20, défaut 5.

Réponse : `{ data: [{ userId, userName, tenantId, tenantName, traceCount }] }`.

### Adoption — `GET /api/auth/usage/adoption`

Paramètre optionnel `userId`. Une ligne par projet.

| Champ | Sens |
| --- | --- |
| identité | `projectId`, `tenantId`, `tenantName`, `userId`, `userName` |
| `workflowTraceCount`, `agentTraceCount`, `otherTraceCount`, `totalTraceCount` | volumes. Le total égale la somme des trois |
| `workflowShare`, `agentShare` | parts entre 0 et 1, arrondies à 4 décimales |
| `firstWorkflowAt`, `lastWorkflowAt` | bornes d’usage workflow, vides si aucune trace workflow |
| `firstAgentAt`, `lastAgentAt` | bornes d’usage agent |

### Workflows — `GET /api/auth/usage/workflows`

Paramètres : `userId`, `include=observations`. Une ligne par triplet projet + `graphId` + nom.

| Champ | Sens |
| --- | --- |
| identité | comme ci-dessus |
| `graphId` | identifiant du graphe |
| `workflowName` | peut être vide |
| `traceCount` | exécutions |
| `uniqueSessions` | sessions distinctes |
| `avgNodeCount`, `maxNodeCount` | nœuds, vides si `nodeCount` est absent |
| `firstUsedAt`, `lastUsedAt` | bornes |
| `totalCost`, `totalTokens`, `errorCount` | seulement avec `include=observations`. Coût en dollars. Erreurs = observations de niveau ERROR |

### Agents — `GET /api/auth/usage/agent-flows`

Même paramètres. Une ligne par triplet projet + `flowId` + nom.

| Champ | Sens |
| --- | --- |
| `flowId`, `flowName` | identifiant et nom du flow. Le nom peut être vide |
| `runCount` | exécutions |
| `uniqueSessions` | sessions distinctes |
| `avgDurationMs`, `p50DurationMs`, `p95DurationMs`, `maxDurationMs` | durées en millisecondes, vides si les temps ne sont pas lisibles |
| `firstUsedAt`, `lastUsedAt` | bornes |
| `totalCost`, `totalTokens`, `errorCount` | seulement avec `include=observations` |

### Noms des comptes — `POST /api/v1/users/by-ids`

Corps : `{ ids: [ ... ] }`, par paquets de 100. Réponse : prénom, nom, email. Le nom affiché est « prénom nom », sinon l’email.

## 12. Règles de mise en page pour le studio

- Un écran répond à une question. Le chiffre qui répond à la question est le plus grand élément du bloc.
- La comparaison à la période précédente est toujours à côté du chiffre, jamais sur un écran à part.
- Les couleurs portent un sens stable : vert = hausse ou actif, ambre = attention ou ralenti, rouge = baisse, arrêt ou erreur, bleu = workflow, orange = agent, gris = autre ou dormant.
- Les deux thèmes, clair et sombre, sont à livrer. Les couleurs de statut doivent rester lisibles sur les deux.
- Les identifiants (`graphId`, `flowId`, `projectId`) sont en monospace, tronqués, jamais le titre de la ligne. Le titre est le nom humain.
- Une valeur inconnue est « — ». On n’affiche pas 0 à la place d’une valeur absente.
- Les grands nombres sont groupés à la française (1 240). Les tokens au-delà du millier passent en notation compacte (820 k).
- Les exports et le partage d’URL font partie du design : le bouton d’export est dans la barre d’outils du tableau, pas dans un menu caché.
- Prévoir les états vides dessinés, pas seulement les états pleins. Plusieurs déploiements n’ont encore aucune trace workflow ni agent.

## 13. Hors périmètre

À ne pas dessiner : gestion des traces individuelles, prompts, jeux de données, facturation, réglages du compte, administration des tenants, création de workflows ou d’agents. Ce tableau de bord lit l’usage. Il ne modifie rien, à part la session et le thème.

## 14. Livrables attendus

Pour chaque écran de 1 à 7 : desktop (1440 px), tablette (768 px) et mobile (390 px), en clair et en sombre. Inclure la fiche ouverte par-dessus la vue d’ensemble, le sélecteur d’utilisateur déployé, un tableau filtré, et au moins un état vide et un état de chargement.
