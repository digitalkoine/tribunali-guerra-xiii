# Tribunali di guerra del XIII corpo d'armata dell'esercito italiano — RDF + static browser

This repository provides a lightweight RDF distribution and a static browser (GitHub Pages) for:

**Tribunali di guerra del XIII corpo d'armata dell'esercito italiano**

To access the ontology: https://digitalkoine.github.io/tribunali-guerra-xiii/ 

It includes:
- `front_justice_cases.ttl` — RDF dataset (Turtle)
- `front_justice_ontology.ttl` — minimal ontology (Turtle)
- `index.html` — static interface to:
  - visualise the ontology graph (vis-network)
  - browse and facet-filter records (embedded JSON for speed)
  - run custom SPARQL queries in-browser (Comunica)

## GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Select the branch (e.g. `main`) and folder `/ (root)`.
4. Open the published URL.

## Notes

- The *Data* tab uses `assets/data_embed.js` (embedded dataset) so it works even if opened locally.
- The *SPARQL* tab relies on loading Comunica from a CDN; it requires an internet connection and may be blocked by some environments.
- The *Origin map* in record details uses Leaflet + OpenStreetMap tiles (requires internet for tiles).

## License

MIT (see `LICENSE`).

## How to cite

**Vitali, Giovanni Pietro.** *Tribunali di guerra del XIII corpo d'armata dell'esercito italiano — RDF + static browser.* 2026. GitHub repository / GitHub Pages.

```bibtex
@software{vitali_tribunali_guerra_xiii_rdf,
  author = {Vitali, Giovanni Pietro},
  title  = {Tribunali di guerra del XIII corpo d'armata dell'esercito italiano — RDF + static browser},
  year   = {2026},
  note   = {RDF (Turtle) + GitHub Pages viewer (facets, ontology graph, SPARQL)},
}
```
