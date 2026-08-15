import type { Category } from "../types";

export const categories: Category[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    slug: "trockenbau-platten",
    name: "Trockenbau & Platten",
    shortName: "Trockenbau",
    description: "Gipskarton, Profile und Bauplatten für flexible Innenausbauten.",
    number: "01",
    filterKeys: ["Stärke", "Format", "Eigenschaft"],
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    slug: "zement-bauchemie",
    name: "Zement, Mörtel & Bauchemie",
    shortName: "Zement & Bauchemie",
    description: "Zement, Mörtel, Estrich und Kleber für belastbare Ergebnisse.",
    number: "02",
    filterKeys: ["Gebinde", "Anwendung", "Festigkeit"],
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    slug: "daemmung-folien",
    name: "Dämmung & Folien",
    shortName: "Dämmung & Folien",
    description: "Wärme-, Schall- und Feuchteschutz für Dach, Wand und Boden.",
    number: "03",
    filterKeys: ["Stärke", "Material", "WLG"],
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    slug: "holz-bauplatten",
    name: "Holz & Bauplatten",
    shortName: "Holz & Bauplatten",
    description: "OSB, Sperrholz, MDF und Konstruktionsholz in verlässlicher Qualität.",
    number: "04",
    filterKeys: ["Stärke", "Format", "Holzart"],
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    slug: "mauerwerk-steine",
    name: "Mauerwerk & Steine",
    shortName: "Mauerwerk & Steine",
    description: "Ziegel, Porenbeton und Pflaster für Rohbau und Außenanlagen.",
    number: "05",
    filterKeys: ["Format", "Material", "Druckfestigkeit"],
  },
  {
    id: "10000000-0000-0000-0000-000000000006",
    slug: "dach-entwaesserung",
    name: "Dach & Entwässerung",
    shortName: "Dach & Entwässerung",
    description: "Dachbahnen, Rinnen und Zubehör für dauerhaft trockene Gebäude.",
    number: "06",
    filterKeys: ["Material", "Länge", "Farbe"],
  },
];

