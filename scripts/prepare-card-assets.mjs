// Extract original card faces from the public tabletop atlas. No artwork is repainted.
// Sources and rights are documented in docs/ARTWORK.md. Download source files into
// ignored outputs/source-art/ before running this optional asset-preparation script.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const districts = {
  armory:0,barracks:1,basilica:2,capitol:3,castle:4,cathedral:5,church:6,
  docks:7,dragon:8,factory:9,fortress:11,framework:12,goldmine:13,greatwall:14,
  harbor:15,haunted:16,treasury:17,ivorytower:18,keep:19,laboratory:20,library:21,
  manor:22,maproom:23,market:24,monastery:25,monument:26,museum:27,necropolis:28,
  observatory:29,palace:30,park:31,poorhouse:32,prison:33,quarry:34,school:35,
  secretvault:36,smithy:37,stables:38,statue:39,tavern:40,temple:41,theater:42,
  den:43,townhall:44,trading:45,watchtower:46,well:47,
};
// Role IDs are app identities, not ranks. Atlas positions are row-major in a 4×7 grid.
const roles = {
  1:4,2:22,3:11,4:10,5:5,6:14,7:2,8:24,9:3,
  10:25, // Witch
  11:12, // Magistrate
  12:20, // Spy
  13:6,  // Blackmailer
  14:26, // Wizard
  15:19, // Seer
  16:9,  // Emperor
  17:16, // Patrician
  18:0,  // Abbot
  19:7,  // Cardinal
  20:1,  // Alchemist
  21:23, // Trader
  22:15, // Navigator
  23:18, // Scholar
  24:8,  // Diplomat
  25:13, // Marshal
  26:17, // Queen
  27:21, // Tax Collector
};
await mkdir("public/cards", {recursive:true});
async function extract(file, columns, rows, mapping, prefix = "") {
  const {width,height} = await sharp(file).metadata();
  for (const [key,index] of Object.entries(mapping)) {
    const x = index % columns, y = Math.floor(index / columns);
    const left = Math.round(x * width / columns), top = Math.round(y * height / rows);
    await sharp(file).extract({left,top,width:Math.round((x+1)*width/columns)-left,height:Math.round((y+1)*height/rows)-top})
      .resize({width:600,withoutEnlargement:true}).webp({quality:86}).toFile(`public/cards/${prefix}${key}.webp`);
  }
}
await extract("outputs/source-art/districts.png",7,7,districts);
await extract("outputs/source-art/characters.png",4,7,roles,"role-");
await sharp("outputs/source-art/character-back.png").resize({width:600}).webp({quality:85}).toFile("public/cards/character-back.webp");
console.log("Prepared 47 district faces, 27 role faces and the role back.");
