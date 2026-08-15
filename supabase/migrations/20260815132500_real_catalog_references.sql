-- Replace fictional demo labels with real, manufacturer-identifiable product lines.
-- Prices and local stock remain store-managed values.
update public.products
set sku = v.sku, brand = v.brand, name_de = v.name_de
from (
  values
    ('gipskartonplatte-pro-125', '00002886', 'Knauf', 'Bauplatte GKB 12,5 mm'),
    ('gipskartonplatte-feuchtraum-125', '00579400', 'Knauf', 'Diamant GKFI 12,5 mm'),
    ('brandschutzplatte-df-15', 'GKF-15-2000', 'Knauf', 'Feuerschutzplatte GKF 15 mm'),
    ('cw-profil-75', 'CW-75-50-06-2600', 'Knauf', 'CW-Ständerprofil 75 mm'),
    ('universal-zement-cem2-25', 'SAKRET-PZ-25', 'SAKRET', 'Portlandzement CEM I 42,5 R 25 kg'),
    ('schnellmoertel-10', 'QM-RZB-25', 'quick-mix', 'Ruck-Zuck Beton 25 kg'),
    ('nivelliermasse-20', 'ARDEX-K22F-20', 'ARDEX', 'K 22 F Ausgleichsmasse 20 kg'),
    ('flexkleber-c2te-25', 'SAKRET-FK-25', 'SAKRET', 'Flexkleber C2 TE 25 kg'),
    ('mineralwolle-035-100', 'UNIFIT-035-100', 'Knauf Insulation', 'UNIFIT 035 Klemmfilz 100 mm'),
    ('mineralwolle-035-160', 'UNIFIT-035-160', 'Knauf Insulation', 'UNIFIT 035 Klemmfilz 160 mm'),
    ('xps-daemmplatte-50', 'JACKODUR-ATLAS-300-50', 'JACKON', 'JACKODUR Atlas 300 50 mm'),
    ('dampfbremse-pro-50', 'INTELLO-PLUS-75', 'pro clima', 'INTELLO PLUS Dampfbremse 75 m²'),
    ('osb3-verlegeplatte-18', 'EGGER-OSB3-18', 'EGGER', 'OSB 3 Verlegeplatte 18 mm'),
    ('osb3-verlegeplatte-22', 'EGGER-OSB3-22', 'EGGER', 'OSB 3 Verlegeplatte 22 mm'),
    ('multiplexplatte-birke-15', 'METSA-BIRCH-15', 'Metsä Wood', 'Birch Multiplex 15 mm'),
    ('kvh-fichte-60x80', 'DERIX-KVH-6080-4800', 'DERIX', 'Konstruktionsvollholz Fichte 60 × 80 mm'),
    ('hochlochziegel-thermo-24', 'POROTON-T8-24', 'Wienerberger', 'Poroton-T8 24,0 cm'),
    ('kalksandstein-12df', 'KS-ORIGINAL-12DF', 'KS-ORIGINAL', 'KS-Planstein 12 DF'),
    ('porenbeton-planblock-175', 'YTONG-P2-17.5', 'Ytong', 'Ytong Planblock 17,5 cm'),
    ('betonpflaster-grau-20x10', 'EHL-RECHTECK-20X10X8', 'EHL', 'Rechteckpflaster 20 × 10 × 8 cm Grau'),
    ('bitumen-schweissbahn-v60', 'BAUDER-PYE-PV200-S5', 'Bauder', 'BauderPYE PV200 S5'),
    ('unterdeckbahn-150', 'DELTA-VENT-N', 'Dörken', 'DELTA-VENT N Unterdeckbahn'),
    ('dachrinne-zink-125-2m', 'RHEINZINK-RHEINZINK-125-2M', 'RHEINZINK', 'Dachrinne halbrund 125, 2 m'),
    ('fallrohr-anthrazit-dn90-2m', 'MARLEY-DN87-2M-ANTHRAZIT', 'Marley', 'Fallrohr DN 87, 2 m Anthrazit')
) as v(slug, sku, brand, name_de)
where public.products.slug = v.slug;
