# Nature documentary-image research — 1 November 2026

This first allowlist is conservative and uses exact Wikimedia Commons source/file pages that were reviewed during the Nature image research. The Collector rechecks the original file page at runtime; a previously reviewed record does not bypass the next rights check.

| Image | Creator | Licence | Editorial use / limitation |
|---|---|---|---|
| Tiger, India.jpg | Ayush Baheti | CC BY-SA 4.0 | Contextual India tiger image; not the tiger photograph from the Guardian/WWF report. |
| Deep-sea hydrothermal sea cucumber | Yujin Pu, Yang Zhou, Jun Liu, Haibin Zhang | CC BY 4.0 | Kairei vent field, Indian Ocean; not from the Argentine Mar del Plata Canyon expedition. |
| Landscape of Nameri National Park | Debuapriyo | CC BY-SA 4.0 | Context landscape for the Pakke–Nameri reporting; not an image from the global conservation-area dataset. |
| INDIAN PITTA.jpg | Arup Ruidas | CC BY-SA 4.0 | Representative Indian bird photograph; not claimed to depict one of the birds assessed by the Red List project. |
| An Indian Sloth Bear.jpg | Vishalsh521 | CC BY 4.0 | Contextual sloth-bear photograph; not claimed to depict an individual from the Terai study sample. |
| Rub' Al Khali Desert.jpg | Cheezgraterz | CC BY-SA 4.0 | Context photograph of a desert camp; not a photograph from the surveyed transect. |

## Explicit species exclusion

The reviewed Commons `Victoria amazonica.jpg` is a different species and was photographed in a botanical garden. The October report concerns the newly identified *Victoria colombiana* from Colombia. That photograph is intentionally excluded; the story remains text-led until an exact, rights-cleared photo of the reported species is found.

## Verification records retained by the Collector

For each eligible image, the database records the exact Commons file title and page URL, creator, credit, licence short name/version and URL, access timestamp, intended caption, contextual-use disclosure, local prepared-media path, published asset path and any optimization note. The Publisher prints creator/licence credits in the magazine and the Nature feed includes the caption, licence and file-page link.

## Technical policy

- Only `https://commons.wikimedia.org/wiki/File:...` records in the profile allowlist are queried.
- Every run fetches `imageinfo` and `extmetadata` from the original file page. It compares the returned creator and exact licence URL with the checked profile record. Missing/changed metadata fails closed.
- The actual image download must come from `upload.wikimedia.org`, remain within the byte limit, decode successfully, and be a raster photo format.
- Images are prepared only as bounded display copies. Attribution is retained. CC BY-SA derivatives retain the required ShareAlike notice.
- No aggregator thumbnail, search-result image, generated image, unrelated stock photo, or artist's concept can become a documentary photograph through this allowlist.
- This is an editorial rights-screening record, not legal advice or a guarantee of clearance for a changed commercial use.
