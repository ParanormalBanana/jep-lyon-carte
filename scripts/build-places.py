#!/usr/bin/env python3
"""Transform official JEP Wemap dump into curated places.json."""

from __future__ import annotations

import html
import json
import math
import re
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path

RAW = Path("/tmp/jep/metro_raw.json")
OUT = Path("/workspace/src/data/places.json")

ARTICLE = {
    "Villa Berliet",
    "Hôtel du gouverneur Lyon",
    "CNSMD",
    "Conservatoire de musique et de danse de Lyon",
    "Lycée Saint-Marc",
    "Cathédrale Saint-Jean-Baptiste",
    "Musée des Beaux-Arts",
    "Musée d'histoire de Lyon et Musée des arts de la marionnette",
    "Musée d'art contemporain de Lyon - macLYON",
}

INSTAGRAM = {
    "Villa Berliet",
    "Hôtel du gouverneur Lyon",
    "CNSMD",
    "Conservatoire de musique et de danse de Lyon",
    "Lycée Saint-Marc",
    "Cathédrale Saint-Jean-Baptiste",
}

# Editorial overrides: crowd 1-4, interest 1-5
OVERRIDES = {
    "Hôtel de Ville": {
        "crowd": 4,
        "interest": 5,
        "crowdNote": "Le site le plus demandé des JEP lyonnaises : plusieurs milliers de visiteurs, files de 45 min à 1 h en milieu de journée.",
        "whyGo": "Salons d'apparat, bureau du maire, carillon de 64 cloches et exposition photo « Visages de la Résistance ». Fermé le reste de l'année.",
        "category": "institution",
    },
    "Villa Berliet": {
        "crowd": 4,
        "interest": 5,
        "crowdNote": "Ouverture annuelle très relayée : attendez-vous à une file, surtout samedi après-midi.",
        "whyGo": "Demeure Art nouveau de 1912, décors Majorelle et Gruber, camionnette Rochet-Schneider dans le parc. N'ouvre qu'une fois par an.",
        "category": "monument",
    },
    "Hôtel du gouverneur Lyon": {
        "crowd": 3,
        "interest": 5,
        "crowdNote": "Jauge limitée, après-midi seulement. File probable mais plus courte que l'Hôtel de Ville.",
        "whyGo": "Hôtel particulier de 1858 habituellement fermé : escalier d'honneur et salons d'époque.",
        "category": "monument",
    },
    "Lycée Saint-Marc": {
        "crowd": 3,
        "interest": 5,
        "crowdNote": "La chapelle cachée attire les curieux ; concerts d'orgue = pics d'affluence.",
        "whyGo": "Chapelle Saint-Marc invisible depuis la rue, fresques restaurées, vitraux et orgue classé. Pépite du 2e.",
        "category": "religieux",
    },
    "CNSMD": {
        "crowd": 3,
        "interest": 4,
        "crowdNote": "Visites guidées sur inscription : créneaux qui partent, mais le site reste praticable.",
        "whyGo": "Coulisses du Conservatoire national supérieur (musique et danse) dans le 9e.",
        "category": "spectacle",
    },
    "Conservatoire de musique et de danse de Lyon": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Moins médiatisé que le CNSMD ; chasse au trésor et happenings, affluence raisonnable.",
        "whyGo": "Visites libres et guidées, happenings musicaux et dansés.",
        "category": "spectacle",
    },
    "Cathédrale Saint-Jean-Baptiste": {
        "crowd": 4,
        "interest": 4,
        "crowdNote": "Vieux-Lyon saturé tout le week-end. La visite de nuit (payante) et le Trésor (gratuit) attirent beaucoup.",
        "whyGo": "Trésor, animations et regard ralenti sur la primatiale. La nocturne à la lampe est en tarif préférentiel, pas gratuite.",
        "category": "religieux",
    },
    "Musée des Beaux-Arts": {
        "crowd": 4,
        "interest": 5,
        "crowdNote": "Collections permanentes gratuites : salle comble samedi, un peu plus fluide dès l'ouverture ou dimanche matin.",
        "whyGo": "L'un des plus grands musées de France, accès libre aux permanentes et fonds photographiques rarement montrés.",
        "category": "musee",
    },
    "Musée d'histoire de Lyon et Musée des arts de la marionnette": {
        "crowd": 3,
        "interest": 4,
        "crowdNote": "Gadagne reste fluide hors dimanche après-midi. Conte jonglé : file à la billetterie dès 13 h.",
        "whyGo": "Deux musées + médiation + exposition photo L'Œil de Mermoz dans la cour.",
        "category": "musee",
    },
    "Musée d'art contemporain de Lyon - macLYON": {
        "crowd": 3,
        "interest": 4,
        "crowdNote": "Les visites architecture Renzo Piano se remplissent ; le parc Cité internationale dilue un peu la foule.",
        "whyGo": "Pas les collections : visite architecturale gratuite du bâtiment de Renzo Piano (extérieur, intérieur, coulisses).",
        "category": "architecture",
    },
    "Lugdunum - musée et théâtres romains": {
        "crowd": 3,
        "interest": 5,
        "crowdNote": "Théâtres en plein air : confortable. Ateliers cyanotype : inscription le jour même, arriver tôt.",
        "whyGo": "Musée + théâtres antiques, restauration de l'entrée nord, cyanotypes et spectacles.",
        "category": "musee",
    },
    "Jardin Rosa Mir": {
        "crowd": 3,
        "interest": 5,
        "crowdNote": "Dimanche uniquement, petite jauge, dernière entrée 17h30. File dès le matin si le soleil est là.",
        "whyGo": "Jardin d'art brut méditerranéen, inscrit MH, joyau caché de la Croix-Rousse.",
        "category": "jardin",
    },
    "Les Célestins, Théâtre de Lyon": {
        "crowd": 3,
        "interest": 5,
        "crowdNote": "Dimanche matin seulement, 9h30-12h30. Arrivez à l'ouverture.",
        "whyGo": "Salle à l'italienne, foyer, dessous de scène et machinerie d'origine.",
        "category": "spectacle",
    },
    "Opéra de Lyon": {
        "crowd": 3,
        "interest": 4,
        "crowdNote": "Réservation, créneaux limités. Popularité élevée mais file organisée.",
        "whyGo": "Coulisses de l'Opéra de Jean Nouvel.",
        "category": "spectacle",
    },
    "Préfecture du Rhône": {
        "crowd": 3,
        "interest": 4,
        "crowdNote": "Institution fermée le reste de l'année : file aux visites guidées 9h-17h.",
        "whyGo": "Ouverture rare des salons de la préfecture.",
        "category": "institution",
    },
    "Le Grenier d'Abondance (DRAC Auvergne-Rhône-Alpes)": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Beaucoup d'animations (vitrailliste, relieur, musée numérique) : vivant sans être saturé.",
        "whyGo": "DRAC + CNSMD : jardin, hall, centre de doc, démonstrations de métiers d'art.",
        "category": "institution",
    },
    "Cité Musée Tony Garnier": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "8e arrondissement, moins de monde que le centre. Idéal dimanche après-midi.",
        "whyGo": "Cité-jardin des États-Unis, appartements témoins et fresques.",
        "category": "musee",
    },
    "Fort de Vaise": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Hors des circuits Instagram : jeux, expos, peu de files.",
        "whyGo": "Fort militaire, enquêtes et expo photo « Gardiens & passeurs de Patrimoine ».",
        "category": "monument",
    },
    "Palais Saint-Jean": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Samedi seulement, dans l'orbite de la cathédrale mais encore respirable.",
        "whyGo": "Académie de Lyon : bibliothèque, salons, boiseries de l'ancien palais archiépiscopal.",
        "category": "monument",
    },
    "Chapelle Sainte Croix": {
        "crowd": 3,
        "interest": 5,
        "crowdNote": "Ossuaire des Brotteaux, réservation obligatoire, créneaux courts : complet vite.",
        "whyGo": "Crypte-ossuaire du siège de 1793, visites accompagnées uniquement.",
        "category": "religieux",
    },
    "La Sablière": {
        "crowd": 4,
        "interest": 5,
        "crowdNote": "Complet d'après les organisateurs / Instagram. Vérifier une liste d'attente, sinon autre chose.",
        "whyGo": "Dernière demeure de soyeux du XIXe, jardins à l'italienne à Caluire. Réservation obligatoire.",
        "category": "monument",
    },
    "Auditorium Maurice-Ravel": {
        "crowd": 3,
        "interest": 4,
        "crowdNote": "Coulisses brutalistes sur réservation : jauge petite, demande forte.",
        "whyGo": "Espaces techniques de l'Auditorium et concert d'orgue.",
        "category": "spectacle",
    },
    "Notre-Dame de Fourvière": {
        "crowd": 4,
        "interest": 4,
        "crowdNote": "Toujours noir de monde + funiculaire saturé. Les toits sont en tarif préférentiel.",
        "whyGo": "Basilique, cryptes et animations. Privilégier très tôt le matin.",
        "category": "religieux",
    },
    "Musée des Confluences, musée Guimet et muséum d'histoire naturelle": {
        "crowd": 2,
        "interest": 3,
        "crowdNote": "Seules deux conférences sont gratuites au programme officiel — pas l'entrée collections.",
        "whyGo": "Deux conférences gratuites (momie égyptienne, couleurs yoruba). Les collections et le musée Guimet ne sont pas en visite libre JEP.",
        "category": "conference",
        "name": "Musée des Confluences (conférences)",
    },
    "Bibliothèque municipale de la Part-dieu": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Visites des silos et de l'atelier de reliure : groupes, peu de badauds.",
        "whyGo": "Atelier de reliure, collections anciennes, dépôt légal, silos, estampes disparues.",
        "category": "archives",
    },
    "Archives de Lyon": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Public de passionnés, files rares. Atelier photo labellisé bicentenaire.",
        "whyGo": "Documents d'exception et coulisses du métier d'archiviste, thème photographie.",
        "category": "archives",
    },
    "Usine TASE": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Vaulx-en-Velin : peu de monde relativement au centre.",
        "whyGo": "Cité ouvrière textile de 1924, expo Elles et les Luttes, atelier de tissage.",
        "category": "industriel",
    },
    "Musée de l'automobile Henri Malartre": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Rochetaillée, accès voiture/bus : familles, sans la cohue de la Presqu'île.",
        "whyGo": "Château + collections auto/deux-roues, vélos rigolos et déambulations théâtrales.",
        "category": "musee",
    },
    "Centre d'histoire de la résistance": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "CHRD : public engagé, files modérées.",
        "whyGo": "Objets à toucher, performances du CNSMD, atelier d'impression.",
        "category": "musee",
    },
    "Église Notre-Dame du Liban": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Première ouverture, deux créneaux samedi 10h et 11h : petit lieu, arriver pile.",
        "whyGo": "Architecture labellisée XXe, communauté maronite, surprise gustative.",
        "category": "religieux",
    },
    "Temple Maçonnique Grande Loge Féminine de France": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Dimanche, sans inscription : curiosité locale, file courte.",
        "whyGo": "Ouverture rare d'un temple maçonnique féminin à la Croix-Rousse.",
        "category": "institution",
    },
    "Piscine de Vaise": {
        "crowd": 1,
        "interest": 3,
        "crowdNote": "Visites techniques sur créneaux : quasi pas d'attente si vous tenez l'horaire.",
        "whyGo": "Coulisses d'un bassin olympique brutaliste (sous-station eau/air).",
        "category": "sport",
    },
    "place bertone": {
        "crowd": 2,
        "interest": 4,
        "crowdNote": "Plein air place Bertone, tout le week-end : vivant, sans file monument.",
        "whyGo": "Meilleurs Ouvriers de France : taille de pierre, verre, ferronnerie, charpente.",
        "category": "artisanat",
        "name": "Meilleurs Ouvriers de France — place Bertone",
    },
}


# Official pinpoint (lieu) tags — not event tags.
PINPOINT_CATEGORY = [
    ("edifice-religieux", "religieux"),
    ("espace-naturel-parc-jardin", "jardin"),
    ("edifice-militaire-enceinte-urbaine", "monument"),
    ("chateau-hotel-urbain-palais-manoir", "monument"),
    ("edifice-industriel-scientifique-et-technique", "industriel"),
    ("edifice-scolaire-et-educatif", "educatif"),
    ("edifice-hospitalier", "institution"),
    ("archives", "archives"),
    ("edifice-civil-public", "institution"),
    ("lieu-de-pouvoir-edifice-judiciaire", "institution"),
    ("edifice-dartisanat-du-commerce-et-du-tertiaire", "artisanat"),
    ("site-archeologique", "archeologie"),
]

EVENT_TAG_CATEGORY = [
    ("atelier-demonstration-savoir-faire", "artisanat"),
    ("spectacle-concert", "spectacle"),
    ("circuit-randonnee", "balade"),
    ("fouille-archeologique", "archeologie"),
    ("exposition", "exposition"),
    ("conference", "conference"),
]

NAME_CATEGORY = [
    (r"théâtre|theatre|opéra|opera|auditorium|conservatoire|cnsmd|guignol", "spectacle"),
    (r"église|eglise|cathédrale|cathedrale|chapelle|basilique|temple|mosquée|mosquee", "religieux"),
    (r"jardin|parc|roseraie|cressonnière|cressonniere|zoo|botanique", "jardin"),
    (r"archive|bibliothèque|bibliotheque|médiathèque|mediatheque", "archives"),
    (r"hôtel de ville|hotel de ville|mairie|préfecture|prefecture|bourse du travail", "institution"),
    (r"fort |lycée|lycee|université|universite|faculté|faculte", "educatif"),
    (r"usine|tase|imprimerie|dépôt|depot", "industriel"),
    (r"piscine|stade|hippodrome", "sport"),
]

ARCHI_TITLE = re.compile(
    r"visite architecturale|d[ée]couverte architecturale",
    re.I,
)
ARCHI_BODY = re.compile(
    r"coulisses du b[âa]timent|b[âa]timent cr[ée]{1,2} par|architecture cr[ée]{1,2}e sur mesure|"
    r"projet architectural et mus[ée]ographique|projet architectural au service",
    re.I,
)
MUSEE_VISIT = re.compile(
    r"parcourez les collections|collections du mus[ée]e(?!\s+num[ée]rique)|collections permanentes|"
    r"espaces du mus[ée]e|visite libre du mus[ée]e|visite sp[ée]ciale du mus[ée]e|"
    r"visite guid[ée]e du mus[ée]e|[àa] la d[ée]couverte du mus[ée]e|"
    r"portes ouvertes au mus[ée]e|m[ée]diateur.?rices vous accueillent|"
    r"mus[ée]e d['’]histoire de lyon|mus[ée]e des arts de la marionnette|"
    r"150 camions de pompiers|"
    r"visite libre de la classe-mus[ée]e|m[ée]diateurs du mus[ée]e|"
    r"objets conserv[ée]s par le mus[ée]e",
    re.I,
)
PRIMARY_ORDER = [
    "musee",
    "architecture",
    "conference",
    "religieux",
    "archives",
    "monument",
    "institution",
    "spectacle",
    "jardin",
    "industriel",
    "educatif",
    "artisanat",
    "exposition",
    "archeologie",
    "sport",
    "balade",
    "patrimoine",
]


def strip_html(text: str | None) -> str:
    if not text:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


PC_CITY = {
    "69001": "Lyon",
    "69002": "Lyon",
    "69003": "Lyon",
    "69004": "Lyon",
    "69005": "Lyon",
    "69006": "Lyon",
    "69007": "Lyon",
    "69008": "Lyon",
    "69009": "Lyon",
    "69317": "Lyon",
    "69366": "Lyon",
    "69437": "Lyon",
    "69495": "Pierre-Bénite",
    "69100": "Villeurbanne",
    "69300": "Caluire-et-Cuire",
    "69120": "Vaulx-en-Velin",
    "69500": "Bron",
    "69200": "Vénissieux",
    "69800": "Saint-Priest",
    "69270": "Rochetaillée-sur-Saône",
    "69110": "Sainte-Foy-lès-Lyon",
    "69350": "La Mulatière",
    "69600": "Oullins-Pierre-Bénite",
    "69310": "Pierre-Bénite",
    "69230": "Saint-Genis-Laval",
    "69130": "Écully",
    "69160": "Tassin-la-Demi-Lune",
    "69340": "Francheville",
    "69150": "Décines-Charpieu",
    "69380": "Lissieu",
    "69140": "Rillieux-la-Pape",
    "69250": "Neuville-sur-Saône",
    "69580": "Sathonay-Camp",
    "69660": "Collonges-au-Mont-d'Or",
    "69330": "Meyzieu",
    "69290": "Craponne",
    "69540": "Irigny",
    "69170": "Tarare",
}


def postal(addr: str) -> str:
    m = re.search(r"\b(69\d{3})\b", addr or "")
    return m.group(1) if m else ""


def city_from_addr(addr: str, pc: str) -> str:
    if pc in PC_CITY:
        return PC_CITY[pc]
    m = re.search(r"69\d{3}\s+([^,]+)", addr or "")
    if m:
        return tidy_city(m.group(1))
    if re.search(r"\blyon\b", addr or "", re.I) and "montluel" not in (addr or "").lower():
        return "Lyon"
    return "Métropole"


def tidy_city(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw.strip())
    s = s.replace(" Et ", "-et-").replace(" Sur ", "-sur-").replace(" Les ", "-lès-")
    s = s.replace(" La ", "-la-").replace(" Au ", "-au-")
    parts = re.split(r"([\s\-']+)", s)
    out = []
    small = {"et", "sur", "les", "lès", "le", "la", "au", "aux", "en", "d", "de", "des", "l"}
    for i, p in enumerate(parts):
        if re.match(r"[\s\-']+$", p):
            out.append(p)
            continue
        pl = p.lower()
        if pl in small and i != 0:
            out.append(pl)
        else:
            out.append(p[:1].upper() + p[1:].lower() if p else p)
    return "".join(out)


def arrondissement(pc: str, city: str) -> str:
    mapping = {
        "69001": "Lyon 1er",
        "69002": "Lyon 2e",
        "69003": "Lyon 3e",
        "69004": "Lyon 4e",
        "69005": "Lyon 5e",
        "69006": "Lyon 6e",
        "69007": "Lyon 7e",
        "69008": "Lyon 8e",
        "69009": "Lyon 9e",
        "69317": "Lyon 4e",
    }
    if pc in mapping:
        return mapping[pc]
    return city or "Métropole"


def event_blob(event: dict) -> str:
    return f"{event.get('name') or ''} {strip_html(event.get('description'))}"


def classify_categories(
    name: str,
    pinpoint_tags: set[str],
    events: list[dict],
) -> tuple[str, list[str]]:
    """Categories from official sheets: what is actually offered this weekend."""
    offers: set[str] = set()
    blobs = [event_blob(e) for e in events]
    combined = "\n".join(blobs)
    event_tags: set[str] = set()
    for event in events:
        event_tags.update(event.get("tags") or [])

    archi_title = any(ARCHI_TITLE.search(event.get("name") or "") for event in events)
    archi_body = bool(ARCHI_BODY.search(combined))
    museum_visit = bool(MUSEE_VISIT.search(combined))
    conference_only = bool(events) and all(
        "conference" in (event.get("tags") or [])
        or re.match(r"conf[ée]rence", event.get("name") or "", re.I)
        for event in events
    )

    if archi_title or archi_body:
        offers.add("architecture")
    if museum_visit:
        offers.add("musee")
    elif "musee-de-france" in pinpoint_tags and not conference_only and not (archi_title and not museum_visit):
        offers.add("musee")

    if conference_only:
        offers.add("conference")
        offers.discard("musee")

    # Museum building whose only JEP sheet is an architectural tour → not a museum visit.
    if archi_title and not museum_visit and not conference_only:
        offers.add("architecture")
        offers.discard("musee")

    for tag, cat in EVENT_TAG_CATEGORY:
        if tag in event_tags:
            offers.add(cat)

    for tag, cat in PINPOINT_CATEGORY:
        if tag in pinpoint_tags:
            offers.add(cat)

    blob_name = name.lower()
    for pat, cat in NAME_CATEGORY:
        if cat in {"jardin", "industriel"}:
            continue
        if re.search(pat, blob_name):
            offers.add(cat)

    if any(
        "exposition" in (event.get("tags") or [])
        or re.match(r"exposition\b", event.get("name") or "", re.I)
        for event in events
    ):
        offers.add("exposition")

    if (
        re.search(r"mus[ée]e", name, re.I)
        and "exposition" in offers
        and "architecture" not in offers
        and not conference_only
    ):
        offers.add("musee")

    if not offers:
        for pat, cat in NAME_CATEGORY:
            if re.search(pat, blob_name):
                offers.add(cat)
                break

    if not offers:
        offers.add("patrimoine")

    architecture_is_the_visit = bool(archi_title and not museum_visit)

    if name in OVERRIDES and OVERRIDES[name].get("category"):
        forced = OVERRIDES[name]["category"]
        if forced in {"architecture", "conference"}:
            offers.discard("musee")
        offers.add(forced)
        primary = forced
    else:
        primary = pick_primary(name, offers, architecture_is_the_visit)

    ordered = [primary] + [c for c in PRIMARY_ORDER if c in offers and c != primary]
    for extra in sorted(offers):
        if extra not in ordered:
            ordered.append(extra)
    return primary, ordered


def pick_primary(name: str, offers: set[str], architecture_is_the_visit: bool) -> str:
    if "musee" in offers:
        return "musee"
    if "educatif" in offers and re.search(
        r"école|ecole|lyc[ée]e|universit|facult", name, re.I
    ):
        return "educatif"
    lieu_first = [
        "religieux",
        "archives",
        "monument",
        "jardin",
        "educatif",
        "institution",
        "industriel",
        "sport",
        "archeologie",
        "spectacle",
    ]
    if architecture_is_the_visit and "architecture" in offers:
        if not (offers & {"religieux", "archives", "jardin", "spectacle", "musee"}):
            return "architecture"
    for cat in lieu_first:
        if cat in offers:
            return cat
    if "architecture" in offers:
        return "architecture"
    if "conference" in offers and not (offers - {"conference", "exposition"}):
        return "conference"
    for cat in PRIMARY_ORDER:
        if cat in offers:
            return cat
    return "patrimoine"


def dist_center(lat: float, lon: float) -> float:
    # km approx from Terreaux
    return math.hypot((lat - 45.767) * 111, (lon - 4.835) * 80)


def estimate_crowd(name: str, tags: set[str], lat: float, lon: float, city: str, exceptional: bool) -> tuple[int, str]:
    if name in OVERRIDES:
        return OVERRIDES[name]["crowd"], OVERRIDES[name]["crowdNote"]
    d = dist_center(lat, lon)
    score = 2
    famous = re.search(
        r"hôtel de ville|beaux-arts|fourvière|fourviere|confluences|lugdunum|gadagne|saint-jean|berliet|terreaux|bellecour",
        name.lower(),
    )
    if famous:
        score = 4
    elif exceptional and d < 2.5:
        score = 3
    elif "featured" in tags:
        score = 3
    elif city != "Lyon" or d > 6:
        score = 1
    elif "reservation-obligatoire" in tags and d > 3:
        score = 1
    elif exceptional:
        score = 2

    notes = {
        1: "Peu médiatisé, souvent sans file — bon plan pour éviter la foule du centre.",
        2: "Affluence classique de week-end culturel : un peu d'attente possible aux horaires de pointe.",
        3: "Site recherché : prévoyez de l'attente en début d'après-midi, mieux tôt le matin.",
        4: "Très forte affluence attendue. Arrivez à l'ouverture ou en fin de journée.",
    }
    return score, notes[score]


def estimate_interest(name: str, tags: set[str], category: str, exceptional: bool, n_events: int) -> tuple[int, str]:
    if name in OVERRIDES:
        return OVERRIDES[name]["interest"], OVERRIDES[name]["whyGo"]
    score = 3
    if exceptional and category in {"monument", "musee", "spectacle", "religieux", "architecture"}:
        score = 4
    if "featured" in tags:
        score = max(score, 4)
    if category in {"balade"} and not exceptional:
        score = 3
    if category in {"institution"} and not exceptional:
        score = 3
    if n_events >= 5:
        score = max(score, 4)
    if re.search(r"place |parvis|esplanade", name.lower()) and category == "balade":
        score = 2
    why = {
        5: "Coup de cœur : lieu rare, architecture ou collection exceptionnelle.",
        4: "Très intéressant : ouverture inhabituelle, coulisses ou bel ensemble patrimonial.",
        3: "Belle visite, surtout si vous êtes déjà dans le quartier.",
        2: "Intérêt plus ponctuel (balade, animation, petit site).",
        1: "Programme léger — à croiser si vous passez devant.",
    }
    return score, why.get(score, "")


def official_slug(name: str) -> str:
    """Match the JEP site slugify (NFKD, strip marks, keep letters/digits/spaces/hyphens)."""
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9 -]", "", s)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def event_url(eid: int, name: str = "") -> str:
    slug = official_slug(name)
    if slug:
        return f"https://journeesdupatrimoine.culture.gouv.fr/w/391796/evenement/{eid}/{slug}"
    return f"https://journeesdupatrimoine.culture.gouv.fr/w/391796/evenement/{eid}"


def parse_hours(events: list[dict]) -> list[dict]:
    slots = []
    seen = set()
    for e in events:
        for d in e.get("dates") or []:
            start = d.get("start") or ""
            end = d.get("end") or ""
            if not start:
                continue
            try:
                st = datetime.fromisoformat(start)
                en = datetime.fromisoformat(end) if end else None
            except ValueError:
                continue
            day = {18: "ven", 19: "sam", 20: "dim"}.get(st.day)
            if not day:
                continue
            key = (day, st.strftime("%H:%M"), en.strftime("%H:%M") if en else "")
            if key in seen:
                continue
            seen.add(key)
            slots.append(
                {
                    "day": day,
                    "start": st.strftime("%H:%M"),
                    "end": en.strftime("%H:%M") if en else "",
                    "label": e.get("name") or "",
                }
            )
    order = {"ven": 0, "sam": 1, "dim": 2}
    slots.sort(key=lambda s: (order.get(s["day"], 9), s["start"]))
    return slots


def reservation_status(tags: set[str]) -> str:
    if "reservation-obligatoire" in tags:
        return "obligatoire"
    if "sans-reservation" in tags or "visite-libre" in tags:
        return "sans"
    return "selon-animation"


def slugify(name: str, pid: int) -> str:
    s = name.lower()
    s = re.sub(r"[àâä]", "a", s)
    s = re.sub(r"[éèêë]", "e", s)
    s = re.sub(r"[îï]", "i", s)
    s = re.sub(r"[ôö]", "o", s)
    s = re.sub(r"[ùûü]", "u", s)
    s = re.sub(r"ç", "c", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"{s[:60]}-{pid}"


def merge_key(p: dict) -> tuple:
    lat = round(float(p.get("latitude") or 0), 4)
    lon = round(float(p.get("longitude") or 0), 4)
    name = re.sub(r"\s+", " ", (p.get("name") or "").strip().lower())
    name = re.sub(r"[^a-z0-9 ]", "", name)[:40]
    return (name, lat, lon)


def main() -> None:
    raw = json.loads(RAW.read_text())
    pinpoints = {p["id"]: p for p in raw["pinpoints"]}
    events_by: dict[int, list] = defaultdict(list)
    for e in raw["events"]:
        pid = (e.get("pinpoint") or {}).get("id")
        if pid:
            events_by[pid].append(e)
            if pid not in pinpoints:
                pinpoints[pid] = e["pinpoint"]

    grouped: dict[tuple, list[int]] = defaultdict(list)
    for pid, p in pinpoints.items():
        grouped[merge_key(p)].append(pid)

    places = []
    for key, pids in grouped.items():
        all_events = []
        for pid in pids:
            all_events.extend(events_by.get(pid, []))
        free = [e for e in all_events if "gratuit" in (e.get("tags") or [])]
        reduced = [e for e in all_events if "tarif-preferentiel" in (e.get("tags") or []) and e not in free]
        if not free and not reduced:
            continue
        primary_events = free or reduced
        p = pinpoints[pids[0]]
        # prefer named pinpoints
        for pid in pids:
            cand = pinpoints[pid]
            if cand.get("name") and len(cand["name"]) > len(p.get("name") or ""):
                p = cand

        tags: set[str] = set()
        for e in primary_events:
            tags.update(e.get("tags") or [])
        name = (p.get("name") or "Lieu sans nom").strip().rstrip(",")
        if name in OVERRIDES and OVERRIDES[name].get("name"):
            display = OVERRIDES[name]["name"]
        else:
            display = name

        addr = p.get("address") or ""
        pc = postal(addr)
        city = city_from_addr(addr, pc)
        lat = float(p.get("latitude") or 0)
        lon = float(p.get("longitude") or 0)
        addr_l = addr.lower()
        if any(x in addr_l for x in (" ain,", " montluel", " tarare", " loire,", " isère,", " isere,")):
            continue
        if not (45.68 <= lat <= 45.85 and 4.74 <= lon <= 5.05):
            continue
        if pc and pc not in PC_CITY and pc[:2] != "69":
            continue

        exceptional = "ouverture-exceptionnelle" in tags
        pinpoint_tags: set[str] = set()
        for pid in pids:
            pinpoint_tags.update(pinpoints[pid].get("tags") or [])
        category, categories = classify_categories(name, pinpoint_tags, primary_events)
        crowd, crowd_note = estimate_crowd(name, tags, lat, lon, city, exceptional)
        interest, why = estimate_interest(name, tags, category, exceptional, len(primary_events))

        sources = ["officiel"]
        if name in ARTICLE or display in ARTICLE:
            sources.append("lebonbon")
        if name in INSTAGRAM or display in INSTAGRAM:
            sources.append("instagram")

        desc = strip_html(p.get("description"))
        if not desc:
            desc = strip_html(primary_events[0].get("description"))
        # trim description
        if len(desc) > 700:
            desc = desc[:680].rsplit(" ", 1)[0] + "…"

        event_payload = []
        for e in primary_events:
            event_payload.append(
                {
                    "id": e.get("id"),
                    "name": e.get("name"),
                    "description": strip_html(e.get("description"))[:500],
                    "tags": e.get("tags") or [],
                    "dates": e.get("dates") or [],
                    "url": event_url(e["id"], e.get("name") or "") if e.get("id") else None,
                    "featured": "featured" in (e.get("tags") or []),
                }
            )

        in_lyon = city == "Lyon" or (pc or "").startswith("6900")
        price = "gratuit" if free else "reduit"

        places.append(
            {
                "id": pids[0],
                "ids": pids,
                "slug": slugify(display, pids[0]),
                "name": display,
                "address": addr,
                "postalCode": pc,
                "city": city,
                "district": arrondissement(pc, city),
                "inLyon": in_lyon,
                "lat": round(lat, 6),
                "lng": round(lon, 6),
                "category": category,
                "categories": categories,
                "interest": interest,
                "whyGo": why,
                "crowd": crowd,
                "crowdNote": crowd_note,
                "exceptional": exceptional,
                "reservation": reservation_status(tags),
                "price": price,
                "hours": parse_hours(primary_events),
                "summary": desc,
                "sources": sources,
                "image": p.get("media_url") or p.get("image_url"),
                "events": event_payload,
                "eventCount": len(event_payload),
                "officialSearch": "https://journeesdupatrimoine.culture.gouv.fr/programme",
            }
        )

    places.sort(key=lambda x: (-x["interest"], -x["crowd"], x["name"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "meta": {
            "edition": "43e",
            "dates": ["2026-09-19", "2026-09-20"],
            "theme": [
                "Patrimoine de la photographie",
                "Patrimoine en péril : raviver, résister, réimaginer",
            ],
            "updated": datetime.now().isoformat(timespec="seconds"),
            "source": "Programme officiel des Journées européennes du patrimoine (ministère de la Culture / Wemap)",
            "sourceUrl": "https://journeesdupatrimoine.culture.gouv.fr/programme",
            "disclaimer": "Affluence et notes d'intérêt sont des estimations (médiatisation, jauge, localisation, habitudes des JEP). Vérifiez horaires et réservations sur la fiche officielle.",
            "counts": {
                "places": len(places),
                "gratuit": sum(1 for p in places if p["price"] == "gratuit"),
                "reduit": sum(1 for p in places if p["price"] == "reduit"),
                "lyon": sum(1 for p in places if p["inLyon"]),
            },
        },
        "places": places,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print("Wrote", OUT, "places", len(places), "gratuit", payload["meta"]["counts"]["gratuit"], "reduit", payload["meta"]["counts"]["reduit"], "lyon", payload["meta"]["counts"]["lyon"])


if __name__ == "__main__":
    main()
