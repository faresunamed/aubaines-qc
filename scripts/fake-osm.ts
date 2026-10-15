// Faux Nominatim + Overpass pour les tests e2e (port 3199) : aucune requête vers OpenStreetMap.
import http from "node:http";
http.createServer((req, res) => {
  const u = new URL(req.url!, "http://x");
  res.setHeader("content-type", "application/json");
  if (u.pathname.startsWith("/search")) return void res.end(JSON.stringify([{ lat: "45.52", lon: "-73.58" }]));
  const q = u.searchParams.get("data") ?? "";
  const brand = /~"([^"]+)",i/.exec(q)?.[1]?.replace(/\\/g, "") ?? "Test";
  res.end(JSON.stringify({ elements: [{ lat: 45.53, lon: -73.58, tags: { shop: "supermarket", name: `${brand} Test`, "addr:housenumber": "99", "addr:street": "rue Fictive", "addr:city": "Montréal" } }] }));
}).listen(3199, () => console.log("fake OSM :3199"));
