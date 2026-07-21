/**
 * Static map of TMDB show IDs to fanart.tv poster URLs.
 *
 * Populated by scripts/resolve-fanart-posters.mjs.
 * This is shipped with the app — no runtime fanart.tv API calls are made.
 * Shows not in this map fall back to TMDB posters via bestPosterUrl().
 *
 * 54 shows resolved from fanart.tv.
 */

export const fanartPosterMap: Record<number, string> = {
   "456": "https://assets.fanart.tv/fanart/the-simpsons-536fc64117634.jpg",
   "1104": "https://assets.fanart.tv/fanart/mad-men-52f8f22155bf1.jpg",
   "1396": "https://assets.fanart.tv/fanart/breaking-bad-5427fc5ebded7.jpg",
   "1398": "https://assets.fanart.tv/fanart/the-sopranos-5236796a1a780.jpg",
   "1399": "https://assets.fanart.tv/fanart/game-of-thrones-521441fd9b45b.jpg",
   "1402": "https://assets.fanart.tv/fanart/the-walking-dead-5212771f42d2f.jpg",
   "1405": "https://assets.fanart.tv/fanart/dexter-5251f81d6a966.jpg",
   "1429": "https://assets.fanart.tv/fanart/attack-on-titan-54d51b5b59849.jpg",
   "1438": "https://assets.fanart.tv/fanart/the-wire-53f7e5b69a150.jpg",
   "1668": "https://assets.fanart.tv/fanart/friends-522501392b273.jpg",
   "1920": "https://assets.fanart.tv/fanart/twin-peaks-537a98f4e3bb5.jpg",
   "2190": "https://assets.fanart.tv/fanart/south-park-5534988991a36.jpg",
   "2316": "https://assets.fanart.tv/fanart/the-office-us-544ab61666cc6.jpg",
   "4607": "https://assets.fanart.tv/fanart/lost-5224fbe21f91f.jpg",
   "4613": "https://assets.fanart.tv/fanart/band-of-brothers-5433176d56c9e.jpg",
   "8592": "https://assets.fanart.tv/fanart/parks-and-recreation-53ecf93dc6674.jpg",
   "13916": "https://assets.fanart.tv/fanart/death-note-5febd903493eb.jpg",
   "16997": "https://assets.fanart.tv/fanart/the-pacific-5212a6ad9fdd6.jpg",
   "19885": "https://assets.fanart.tv/fanart/sherlock-52b60767a30c9.jpg",
   "31911": "https://assets.fanart.tv/fanart/fullmetal-alchemist-brotherhood-53e2d03803d36.jpg",
   "42009": "https://assets.fanart.tv/fanart/black-mirror-543563777e280.jpg",
   "42509": "https://assets.fanart.tv/fanart/steinsgate-57b2753b9dc66.jpg",
   "44217": "https://assets.fanart.tv/fanart/vikings-567ad6c091ee2.jpg",
   "46648": "https://assets.fanart.tv/fanart/true-detective-52c3ace03064c.jpg",
   "57243": "https://assets.fanart.tv/fanart/doctor-who-2005-58971b3e2d20c.jpg",
   "60059": "https://assets.fanart.tv/fanart/better-call-saul-54d91da86c07d.jpg",
   "60574": "https://assets.fanart.tv/fanart/peaky-blinders-5277bd833cfd7.jpg",
   "60622": "https://assets.fanart.tv/fanart/fargo-536cab7aa72da.jpg",
   "60625": "https://assets.fanart.tv/fanart/rick-and-morty-55baa82690863.jpg",
   "61222": "https://assets.fanart.tv/fanart/bojack-horseman-5ad1fa798f71f.jpg",
   "61889": "https://assets.fanart.tv/fanart/daredevil-54efa1d6837fb.jpg",
   "63351": "https://assets.fanart.tv/fanart/narcos-55b8137ddafb2.jpg",
   "65494": "https://assets.fanart.tv/fanart/the-crown-5acd08c081921.jpg",
   "66732": "https://assets.fanart.tv/fanart/stranger-things-578c9b2cb3497.jpg",
   "67744": "https://assets.fanart.tv/fanart/mindhunter-59e2965b88bd2.jpg",
   "69740": "https://assets.fanart.tv/fanart/ozark-5969d344038fc.jpg",
   "71446": "https://assets.fanart.tv/fanart/-5a6c7b955aad2.jpg",
   "71912": "https://assets.fanart.tv/fanart/the-witcher-5d1a369dca5c1.jpg",
   "73586": "https://assets.fanart.tv/fanart/yellowstone-2018-5efb9515540dd.jpg",
   "76331": "https://assets.fanart.tv/fanart/succession-63bc77b91e8f3.jpg",
   "76479": "https://assets.fanart.tv/fanart/the-boys-5bcd584a48e8b.jpg",
   "78191": "https://assets.fanart.tv/fanart/you-5c3b74e3d4e7c.jpg",
   "82856": "https://assets.fanart.tv/fanart/the-mandalorian-5f61559007098.jpg",
   "84958": "https://assets.fanart.tv/fanart/marvels-loki-6055a2272c4b6.jpg",
   "87108": "https://assets.fanart.tv/fanart/chernobyl-5cc42916a1ecb.jpg",
   "91239": "https://assets.fanart.tv/fanart/bridgerton-639db722c495c.jpg",
   "93405": "https://assets.fanart.tv/fanart/squid-game-61546f81ab1b0.jpg",
   "94605": "https://assets.fanart.tv/fanart/arcane-618b04ad25130.jpg",
   "94997": "https://assets.fanart.tv/fanart/house-of-the-dragon--6249dab1324d3.jpg",
   "95396": "https://assets.fanart.tv/fanart/severance-6250816dc4374.jpg",
   "100088": "https://assets.fanart.tv/fanart/the-last-of-us-63b8157eda674.jpg",
   "119051": "https://assets.fanart.tv/fanart/wednesday-64048cb3e720e.jpg",
   "70523": "https://assets.fanart.tv/fanart/dark-5a0340d182cc6.jpg",
   "136315": "https://assets.fanart.tv/fanart/the-bear--64808de9bb03e.jpg"
 };
