import { readFileSync } from 'fs';
import { join } from 'path';

export function loadCityConfigs() {
  const path = 'D:\\project\\MouWelfare\\api\\src\\crawler\\config\\cities.config.json'
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}
