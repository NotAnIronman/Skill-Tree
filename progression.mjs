// Editorial overview choices. These are landmarks, never mandatory training routes.
const rules={
  Attack:/^Wield (?:bronze melee|steel weapons|black weapons|mithril weapons|adamant weapons|rune weapons|dragon weapons|abyssal whips|Ghrazi rapiers|Osmumten)/i,
  Strength:/^Wield (?:bronze|steel|black|mithril|adamant|rune|dragon|elder|granite) (?:warhammers|mauls)/i,
  Defence:/^Wear (?:bronze|steel|black|mithril|adamant|rune|dragon|Barrows|Bandos|Torva).*armour/i,
  Ranged:/^Wield (?:shortbows|oak shortbows|willow shortbows|maple shortbows|yew shortbows|magic shortbows|dark bows|toxic blowpipes|twisted bows)/i,
  Prayer:/^Activate (?:Thick Skin|Rock Skin|Protect from|Chivalry|Piety|Rigour|Augury)/i,
  Magic:/^Cast (?:Wind Strike|Water Strike|Earth Strike|Fire Strike|Varrock Teleport|Lumbridge Teleport|Falador Teleport|High Level Alchemy|Camelot Teleport|Watchtower Teleport|Teleport to House|Fire Wave|Fire Surge|Ice Barrage)/i,
  Runecraft:/^Craft (?:air|mind|water|earth|fire|body|cosmic|chaos|astral|nature|law|death|blood|soul|wrath) runes\b/i,
  Construction:/^Build (?:a|an) (?:Crude wooden chair|Wooden larder|Oak larder|Teak altar|Gilded altar|Ornate rejuvenation pool|Basic jewellery box|Ornate jewellery box|Portal nexus)/i,
  Hitpoints:/^Heal .*with Anglerfish/i,
  Agility:/^Access (?:the )?(?:Gnome Stronghold|Draynor Village|Al Kharid|Varrock|Canifis|Falador|Seers' Village|Pollnivneach|Rellekka|Ardougne).*Course/i,
  Herblore:/^Mix (?:attack|strength|restore|energy|prayer|super attack|super strength|super restore|ranging|magic|Saradomin brew|super combat).*potions/i,
  Thieving:/^Pickpocket (?:men|farmers|H\.A\.M\.|warriors|guards|knights|paladins|heroes|elves|vyres)/i,
  Crafting:/^Craft (?:leather gloves|gold rings|sapphire rings|emerald rings|ruby rings|diamond rings|dragonstone rings|black dragonhide bodies|zenyte amulet)/i,
  Fletching:/^Fletch (?:arrow shafts|shortbow|oak shortbow|willow shortbow|maple shortbow|yew shortbow|magic shortbow)/i,
  Slayer:/^Slay /i,
  Hunter:/^Catch (?:crimson swifts|copper longtails|tropical wagtails|swamp lizards|spotted kebbits|red salamanders|chinchompas|red chinchompas|black salamanders|black chinchompas|herbiboar|moonlight moths)/i,
  Mining:/^Mine (?:copper ore|iron ore|coal|gold ore|mithril ore|adamantite ore|runite ore|amethyst)\b/i,
  Smithing:/^Smelt (?:bronze|iron|steel|mithril|adamant(?:ite)?|runite) bars/i,
  Fishing:/^Catch (?:shrimps|sardines|anchovies|trout|salmon|tuna|lobsters|swordfish|monkfish|karambwan|sharks|anglerfish|dark crabs)\b/i,
  Cooking:/^Cook (?:shrimps|sardines|trout|salmon|tuna|lobsters|swordfish|monkfish|karambwan|sharks|anglerfish|dark crabs)\b/i,
  Firemaking:/^Burn (?:logs|oak logs|willow logs|teak logs|maple logs|mahogany logs|yew logs|magic logs|redwood logs)\b/i,
  Woodcutting:/^Chop (?:logs|oak logs|willow logs|teak logs|maple logs|mahogany logs|yew logs|magic logs|redwood logs|camphor logs|ironwood logs|rosewood logs)\b/i,
  Farming:/^Grow (?:potatoes|onions|cabbages|tomatoes|sweetcorn|strawberries|watermelons|guam|ranarr|snapdragon|torstol|oak|willow|maple|yew|magic|spirit|redwood)\b/i,
  Sailing:/^Sail a /i
};
export function coreUnlockIds(nodes){
  const chosen=new Map();
  for(const node of nodes){
    const key=`${node.skill}:${node.min}`;
    if(node.note==='Skill mastery')chosen.set(key,node.id);
    else if(!chosen.has(key)&&rules[node.skill]?.test(node.note))chosen.set(key,node.id);
  }
  return new Set(chosen.values());
}
