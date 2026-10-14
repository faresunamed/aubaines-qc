import { normalize } from "./text";
import { iconFor } from "./category-icons";

/**
 * Pictogramme selon le NOM du produit. Les entrées les plus précises passent en premier
 * (« pomme de terre » avant « pomme »). Un mot terminé par * accepte un préfixe.
 * Aucun résultat → pictogramme du type de produit.
 */
const RULES: [string[], string][] = [
  [["pomme de terre", "pommes de terre", "patate*"], "🥔"],
  [["pomme*"], "🍎"], [["banane*"], "🍌"], [["orange*", "clementine*", "mandarine*"], "🍊"], [["citron*", "lime"], "🍋"],
  [["fraise*"], "🍓"], [["bleuet*", "myrtille*"], "🫐"], [["raisin*"], "🍇"], [["poire*"], "🍐"], [["melon*"], "🍈"],
  [["pasteque*"], "🍉"], [["ananas"], "🍍"], [["mangue*"], "🥭"], [["peche*", "nectarine*"], "🍑"], [["cerise*"], "🍒"],
  [["avocat*"], "🥑"], [["tomate*"], "🍅"], [["carotte*"], "🥕"], [["brocoli", "chou-fleur"], "🥦"], [["concombre*"], "🥒"],
  [["poivron*", "piment*"], "🫑"], [["oignon*"], "🧅"], [["ail"], "🧄"], [["champignon*"], "🍄"], [["mais"], "🌽"],
  [["laitue", "salade*", "epinard*", "chou*"], "🥬"], [["aubergine*"], "🍆"],
  [["poulet", "cuisse*", "ailes de poulet", "dinde"], "🍗"], [["steak", "bifteck", "boeuf", "hache*", "veau", "agneau"], "🥩"],
  [["bacon", "lard"], "🥓"], [["saucisse*", "hot-dog*", "hot dog*"], "🌭"], [["jambon", "porc", "cote*"], "🍖"],
  [["saumon", "poisson*", "thon", "morue", "truite", "filet de sole"], "🐟"], [["crevette*", "homard*", "crabe*"], "🦐"],
  [["lait", "creme*"], "🥛"], [["fromage*", "cheddar", "mozzarella", "brie", "feta", "parmesan"], "🧀"], [["beurre", "margarine"], "🧈"],
  [["oeuf*"], "🥚"], [["yogourt*", "yaourt*", "kefir"], "🥣"],
  [["baguette*"], "🥖"], [["pain*"], "🍞"], [["croissant*"], "🥐"], [["bagel*"], "🥯"], [["muffin*", "cupcake*"], "🧁"],
  [["gateau*", "tarte*"], "🍰"], [["beigne*"], "🍩"], [["biscuit*", "craquelin*"], "🍪"], [["tortilla*", "wrap*"], "🫓"],
  [["pizza*"], "🍕"], [["poutine", "frites"], "🍟"], [["hamburger*", "burger*"], "🍔"], [["sandwich*"], "🥪"],
  [["pates", "spaghetti", "macaroni", "nouille*", "lasagne*"], "🍝"], [["riz"], "🍚"], [["cereale*", "avoine"], "🥣"],
  [["soupe*"], "🍲"], [["sauce*", "ketchup", "moutarde", "mayonnaise"], "🍅"], [["huile", "vinaigre"], "🫒"],
  [["miel", "sirop*"], "🍯"], [["confiture*"], "🍓"], [["beurre d arachide", "arachide*", "noix", "amande*"], "🥜"],
  [["cafe", "espresso", "capsule*"], "☕"], [["the", "tisane*"], "🍵"], [["jus"], "🧃"], [["eau"], "💧"],
  [["biere*", "ipa", "lager", "pale ale"], "🍺"], [["vin", "vins"], "🍷"], [["vodka", "whisky", "gin", "rhum", "spiritueux", "cooler*"], "🥃"],
  [["cola", "coca", "pepsi", "soda*", "boisson*", "limonade"], "🥤"], [["energisant*"], "⚡"],
  [["creme glacee", "glace*"], "🍦"], [["chocolat*"], "🍫"], [["bonbon*", "gomme*"], "🍬"], [["chips", "croustille*", "gaufrette*"], "🥔"],
  [["popcorn"], "🍿"], [["bretzel*"], "🥨"],
  [["vitamine*", "supplement*", "probiotique*", "analgesique*", "ibuprofene", "acetaminophene", "advil", "tylenol"], "💊"],
  [["pansement*"], "🩹"], [["thermometre*"], "🌡️"], [["masque*"], "😷"],
  [["shampooing", "shampoing", "revitalisant", "lotion*", "creme pour", "soin*"], "🧴"], [["savon*"], "🧼"],
  [["dentifrice", "brosse a dents"], "🪥"], [["rasoir*"], "🪒"], [["deodorant*"], "🧴"], [["parfum*"], "🌸"],
  [["maquillage", "mascara", "rouge a levres", "fond de teint", "vernis"], "💄"],
  [["couche*"], "👶"], [["biberon*", "formule", "lait maternise"], "🍼"], [["lingette*"], "🧻"], [["poussette*"], "👶"],
  [["chien*", "os a macher"], "🐕"], [["chat", "chats", "litiere"], "🐈"], [["croquette*"], "🐾"],
  [["papier hygienique", "essuie-tout", "essuie tout", "mouchoir*"], "🧻"], [["detergent*", "lessive", "assouplissant*", "javel", "nettoyant*"], "🧴"],
  [["eponge*"], "🧽"], [["balai*", "vadrouille*"], "🧹"], [["sac a ordures", "sacs poubelle"], "🗑️"],
  [["casserole*", "poele*", "cocotte*"], "🍳"], [["mijoteuse", "cafetiere*", "grille-pain", "friteuse*", "bouilloire*"], "🍳"],
  [["assiette*", "vaisselle", "tasse*"], "🍽️"], [["oreiller*", "matelas", "drap*", "couverture*", "literie"], "🛏️"],
  [["canape*", "chaise*", "meuble*", "table"], "🛋️"], [["lampe*", "ampoule*"], "💡"], [["tapis"], "🧶"],
  [["television*", "televiseur*", "tele", "ecran*"], "📺"], [["ordinateur*", "portable", "laptop"], "💻"], [["tablette electronique", "ipad"], "📱"],
  [["telephone*", "cellulaire*", "iphone"], "📱"], [["ecouteur*", "casque*", "airpods"], "🎧"], [["haut-parleur*", "enceinte*", "barre de son"], "🔊"],
  [["camera*"], "📷"], [["console*", "xbox", "playstation", "nintendo"], "🎮"], [["imprimante*"], "🖨️"], [["chargeur*", "cable*"], "🔌"],
  [["refrigerateur*"], "🧊"], [["laveuse", "secheuse", "lave-vaisselle"], "🧺"], [["micro-onde*", "four"], "♨️"], [["aspirateur*", "robot"], "🤖"],
  [["perceuse*", "visseuse*"], "🔧"], [["marteau*", "clou*", "vis"], "🔨"], [["tournevis", "outil*", "coffre a outils"], "🧰"], [["scie*"], "🪚"],
  [["peinture*", "pinceau*"], "🎨"], [["echelle*"], "🪜"], [["robinet*", "plomberie", "toilette", "douche"], "🚿"], [["plancher*", "bois", "panneau*"], "🪵"],
  [["tondeuse*", "gazon"], "🌱"], [["terreau", "semence*", "engrais", "jardin*"], "🌱"], [["plante*", "fleur*"], "🌷"], [["barbecue*", "bbq", "propane"], "🔥"],
  [["souffleuse*", "deneigeuse*", "pelle*", "sel de deglacage"], "❄️"],
  [["manteau*", "veste*"], "🧥"], [["chandail*", "t-shirt", "camisole*"], "👕"], [["jeans", "pantalon*"], "👖"], [["robe*", "jupe*"], "👗"],
  [["botte*", "bottes"], "🥾"], [["chaussure*", "espadrille*", "souliers", "sandale*"], "👟"], [["tuque*"], "🧢"], [["gant*", "mitaine*"], "🧤"],
  [["foulard*"], "🧣"], [["bas"], "🧦"], [["pyjama*"], "🩳"],
  [["velo*", "bicyclette*"], "🚲"], [["tente*", "camping", "sac de couchage"], "⛺"], [["ski", "skis", "raquette*"], "⛷️"], [["patin*", "hockey"], "🏒"],
  [["ballon*", "soccer"], "⚽"], [["yoga", "tapis d exercice", "haltere*", "fitness"], "🏋️"], [["golf"], "⛳"], [["peche", "canne a peche"], "🎣"],
  [["lego"], "🧱"], [["poupee*", "barbie"], "🪆"], [["peluche*"], "🧸"], [["casse-tete", "puzzle*"], "🧩"], [["jeu de societe", "jeux de societe"], "🎲"],
  [["pneu*", "pneus"], "🛞"], [["huile a moteur", "batterie auto", "essuie-glace*"], "🚗"],
];

const compiled = RULES.map(([kws, emoji]) => ({
  emoji,
  re: new RegExp(
    "(^| )(" +
      kws
        .map((k) => normalize(k.replace(/\*$/, "")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (k.endsWith("*") ? "" : "(?= |$)"))
        .join("|") +
      ")",
  ),
}));

/** Pictogramme du produit d'après son titre, sinon celui de son type. */
export function productIcon(title: string, categorySlug: string): string {
  const n = normalize(title);
  for (const r of compiled) if (r.re.test(n)) return r.emoji;
  return iconFor(categorySlug);
}
