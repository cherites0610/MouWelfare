import { getTextByLocation, getTextByService, LocationNum, ServiceNum } from '../../utils/getTextByNumber';

export const regions: string[] = Array.from({ length: LocationNum - 1 }, (_, i) => getTextByLocation(i + 1));
export const services: string[] = Array.from({ length: ServiceNum - 1 }, (_, i) => getTextByService(i + 1));
export const familyTypes: string[] = ["測試"];