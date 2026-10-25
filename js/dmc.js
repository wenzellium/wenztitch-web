// DMC floss color database and perceptual (CIE LAB) color matching
// Direct port of dmc_colors.py

const DMC_COLORS = [
  ["blanc","White",255,255,255],
  ["ecru","Ecru",240,234,218],
  ["3865","Winter White",245,243,234],
  ["3866","Ultra Vy Lt Mocha Brn",250,244,236],
  ["3713","Salmon-VY LT",255,214,206],
  ["761","Salmon-LT",255,188,180],
  ["760","Salmon",242,158,148],
  ["3712","Salmon-MD",239,129,119],
  ["3328","Salmon-DK",220,100,90],
  ["347","Salmon-VY DK",185,40,40],
  ["963","Dusty Rose-UL VY LT",255,214,217],
  ["3716","Dusty Rose-VY LT",255,174,185],
  ["3354","Dusty Rose-LT",224,155,165],
  ["3733","Dusty Rose",227,128,148],
  ["3731","Dusty Rose-VY DK",210,95,128],
  ["3350","Dusty Rose-UL DK",190,55,100],
  ["776","Pink-MD",255,180,188],
  ["899","Pink",240,130,155],
  ["335","Pink-DK",215,55,100],
  ["326","Pink-VY DK",185,25,70],
  ["151","Dusty Rose-VY LT",240,195,205],
  ["3801","Christmas Red-LT",254,67,101],
  ["666","Christmas Red-BRT",204,0,0],
  ["321","Christmas Red",180,0,0],
  ["304","Christmas Red-MD",175,10,25],
  ["498","Christmas Red-DK",152,10,20],
  ["816","Garnet",140,10,20],
  ["815","Garnet-MD",130,18,26],
  ["814","Garnet-DK",120,10,20],
  ["3824","Apricot-LT",255,188,160],
  ["3341","Apricot",255,165,130],
  ["3340","Apricot-MD",240,128,90],
  ["608","Burnt Orange-BRT",240,90,45],
  ["606","Burnt Orange",230,50,0],
  ["900","Burnt Orange-DK",210,60,0],
  ["947","Burnt Orange-LT",255,115,40],
  ["946","Burnt Orange-MD",240,90,0],
  ["945","Tawny",251,194,151],
  ["402","Mahogany-VY LT",255,176,116],
  ["722","Orange Spice-LT",240,145,75],
  ["721","Orange Spice-MD",225,125,55],
  ["720","Orange Spice-DK",205,95,30],
  ["919","Red Copper",175,65,10],
  ["918","Red Copper-DK",160,50,10],
  ["3823","Yellow-UL LT",255,253,220],
  ["3855","Autumn Gold-LT",255,235,175],
  ["3854","Autumn Gold-MD",255,210,130],
  ["3853","Autumn Gold-DK",240,175,80],
  ["3852","Straw-VY DK",210,150,40],
  ["725","Topaz",255,200,60],
  ["726","Topaz-LT",255,215,85],
  ["727","Topaz-VY LT",255,235,130],
  ["744","Yellow-Pale",255,235,115],
  ["745","Yellow-LT Pale",255,240,165],
  ["746","Off White",255,248,220],
  ["307","Lemon",255,220,0],
  ["444","Lemon-DK",255,195,0],
  ["973","Canary-BRT",255,180,0],
  ["972","Canary-DP",255,160,0],
  ["971","Pumpkin",245,130,0],
  ["970","Pumpkin-LT",230,110,0],
  ["3819","Moss Green-LT",215,230,100],
  ["3817","Celadon Green-LT",175,210,190],
  ["3816","Celadon Green",145,195,170],
  ["3815","Celadon Green-DK",80,155,120],
  ["3814","Aquamarine-DK",65,130,110],
  ["966","Baby Green-MD",185,220,190],
  ["564","Jade-VY LT",155,210,180],
  ["563","Jade-LT",125,195,160],
  ["562","Jade-MD",95,170,130],
  ["561","Jade-VY DK",70,140,100],
  ["3818","Forest Green-UL DK",0,105,75],
  ["704","Chartreuse-BRT",130,220,80],
  ["703","Chartreuse",115,195,65],
  ["702","Kelly Green",100,175,50],
  ["701","Kelly Green-LT",85,155,40],
  ["700","Kelly Green-BRT",0,140,50],
  ["699","Christmas Green",0,120,35],
  ["906","Parrot Green-MD",130,215,85],
  ["905","Parrot Green-DK",95,190,55],
  ["904","Parrot Green-VY DK",80,165,40],
  ["890","Pistachio-UL DK",15,75,30],
  ["987","Forest Green-DK",90,140,70],
  ["986","Forest Green-VY DK",65,110,55],
  ["895","Christmas Green-DK",35,85,35],
  ["471","Avocado-VY LT",175,200,115],
  ["470","Avocado-LT",150,180,85],
  ["469","Avocado",120,155,60],
  ["937","Avocado-MD",95,130,45],
  ["936","Avocado-VY DK",80,105,35],
  ["935","Avocado-DK",65,90,30],
  ["934","Avocado-BK",50,70,25],
  ["3756","Baby Blue-UL VY LT",225,240,250],
  ["3755","Baby Blue",170,210,240],
  ["3325","Baby Blue-LT",140,190,230],
  ["334","Baby Blue-MD",110,165,210],
  ["322","Baby Blue-DK",80,140,195],
  ["312","Baby Blue-VY DK",50,105,165],
  ["311","Navy Blue-MD",35,85,140],
  ["336","Navy Blue",25,60,120],
  ["820","Royal Blue-VY DK",20,50,110],
  ["791","Cornflower-VY DK",55,55,130],
  ["792","Cornflower-DK",80,85,155],
  ["793","Cornflower-MD",110,115,175],
  ["794","Cornflower-LT",145,155,200],
  ["3840","Lavender Blue-LT",175,190,225],
  ["3839","Lavender Blue-MD",140,160,210],
  ["3838","Lavender Blue-DK",110,130,190],
  ["995","Electric Blue-DK",0,165,215],
  ["996","Electric Blue-MD",45,195,240],
  ["3846","Bright Turquoise-LT",20,190,230],
  ["3847","Teal Green-DK",0,155,180],
  ["3848","Teal Green-MD",0,120,150],
  ["3849","Teal Green-LT",0,90,115],
  ["3750","Antique Blue-VY DK",25,55,90],
  ["3747","Blue Violet-VY LT",215,210,240],
  ["341","Blue Violet-LT",175,180,225],
  ["3746","Blue Violet-DK",120,110,195],
  ["333","Blue Violet-VY DK",95,75,165],
  ["327","Violet-DK",100,40,100],
  ["154","Grape-VY DK",75,25,75],
  ["208","Lavender-VY DK",145,90,160],
  ["209","Lavender-DK",170,120,185],
  ["210","Lavender-MD",195,150,205],
  ["211","Lavender-LT",220,185,225],
  ["3836","Grape-LT",185,140,190],
  ["3835","Grape-MD",155,110,165],
  ["3834","Grape-DK",120,75,135],
  ["550","Violet-VY DK",85,30,100],
  ["552","Violet-MD",115,55,130],
  ["553","Violet",145,85,155],
  ["554","Violet-LT",185,135,190],
  ["3779","Rosewood-UL VY LT",245,210,195],
  ["3778","Terra Cotta-LT",225,175,155],
  ["3830","Terra Cotta",195,115,90],
  ["355","Terra Cotta-DK",160,75,55],
  ["356","Terra Cotta-MD",185,100,75],
  ["3857","Rosewood-DK",105,45,30],
  ["950","Desert Sand-LT",225,190,165],
  ["3064","Desert Sand",195,155,130],
  ["407","Desert Sand-DK",165,115,90],
  ["632","Desert Sand-UL DK",140,90,65],
  ["3863","Mocha Beige-MD",165,120,85],
  ["3862","Mocha Beige-DK",145,100,65],
  ["3861","Mocha Beige-LT",120,80,50],
  ["938","Coffee Brown-UL DK",65,30,15],
  ["801","Coffee Brown-DK",90,50,20],
  ["898","Coffee Brown-VY DK",75,40,20],
  ["433","Brown-MD",130,80,35],
  ["434","Brown-LT",155,100,50],
  ["435","Brown-VY LT",180,125,65],
  ["436","Tan",200,150,85],
  ["437","Tan-LT",215,175,110],
  ["738","Tan-VY LT",230,200,150],
  ["739","Tan-UL VY LT",240,220,180],
  ["842","Beige Brown-VY LT",220,200,170],
  ["841","Beige Brown-LT",200,175,140],
  ["840","Beige Brown-MD",180,150,110],
  ["839","Beige Brown-DK",155,120,80],
  ["838","Beige Brown-VY DK",130,95,55],
  ["3024","Brown Gray-VY LT",215,215,210],
  ["3023","Brown Gray-LT",185,185,175],
  ["3022","Brown Gray-MD",155,155,140],
  ["647","Beaver Gray-MD",175,175,170],
  ["646","Beaver Gray-DK",145,145,135],
  ["645","Beaver Gray-VY DK",115,115,105],
  ["844","Beaver Gray-UL DK",80,80,80],
  ["317","Pewter Gray",95,95,100],
  ["413","Pewter Gray-DK",75,75,80],
  ["414","Steel Gray-DK",110,110,115],
  ["415","Pearl Gray",175,175,178],
  ["762","Pearl Gray-VY LT",215,215,218],
  ["3799","Pewter Gray-VY DK",50,50,55],
  ["310","Black",0,0,0],
];

function rgbToLab(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const lin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  r = lin(r); g = lin(g); b = lin(b);
  let X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  let Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  let Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  X /= 0.95047; Z /= 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

// Pre-compute LAB for all DMC colors
const DMC_LAB = DMC_COLORS.map(([code, name, r, g, b]) => {
  const [L, a, bv] = rgbToLab(r, g, b);
  return [code, name, r, g, b, L, a, bv];
});

function findNearestDmc(r, g, b) {
  const [L, a, bv] = rgbToLab(r, g, b);
  let best = null, bestDist = Infinity;
  for (const e of DMC_LAB) {
    const d = (L - e[5]) ** 2 + (a - e[6]) ** 2 + (bv - e[7]) ** 2;
    if (d < bestDist) { bestDist = d; best = e; }
  }
  return [best[0], best[1], best[2], best[3], best[4]];
}

// Returns [[dmc5, dist], ...] sorted by perceptual distance
// Searches inventory if non-empty, else all DMC
function nearestInInventory(r, g, b, inventory, n = 8) {
  const [L, a, bv] = rgbToLab(r, g, b);
  const results = [];
  for (const e of DMC_LAB) {
    if (inventory.size > 0 && !inventory.has(e[0])) continue;
    const d = (L - e[5]) ** 2 + (a - e[6]) ** 2 + (bv - e[7]) ** 2;
    results.push([[e[0], e[1], e[2], e[3], e[4]], d]);
  }
  results.sort((a, b) => a[1] - b[1]);
  return results.slice(0, n);
}
