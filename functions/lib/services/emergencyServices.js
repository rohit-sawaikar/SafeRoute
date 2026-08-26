"use strict";
/**
 * Location-Aware Emergency Services Lookup Table
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMERGENCY_NUMBERS_DATABASE = void 0;
exports.lookupEmergencyNumbers = lookupEmergencyNumbers;
exports.EMERGENCY_NUMBERS_DATABASE = {
    IN: {
        countryCode: 'IN',
        countryName: 'India',
        police: '100',
        ambulance: '108',
        fire: '101',
        womenHelpline: '1091',
        domesticViolenceHelpline: '181',
        generalEmergency: '112',
    },
    US: {
        countryCode: 'US',
        countryName: 'United States',
        police: '911',
        ambulance: '911',
        fire: '911',
        womenHelpline: '1-800-799-7233',
        domesticViolenceHelpline: '1-800-799-SAFE',
        generalEmergency: '911',
    },
    UK: {
        countryCode: 'UK',
        countryName: 'United Kingdom',
        police: '999',
        ambulance: '999',
        fire: '999',
        womenHelpline: '0808 2000 247',
        domesticViolenceHelpline: '0808 2000 247',
        generalEmergency: '112',
    },
    EU: {
        countryCode: 'EU',
        countryName: 'European Union (General)',
        police: '112',
        ambulance: '112',
        fire: '112',
        womenHelpline: '116 016',
        domesticViolenceHelpline: '116 016',
        generalEmergency: '112',
    },
    AU: {
        countryCode: 'AU',
        countryName: 'Australia',
        police: '000',
        ambulance: '000',
        fire: '000',
        womenHelpline: '1800 737 732',
        domesticViolenceHelpline: '1800 737 732',
        generalEmergency: '000',
    },
    CA: {
        countryCode: 'CA',
        countryName: 'Canada',
        police: '911',
        ambulance: '911',
        fire: '911',
        womenHelpline: '1-800-363-9010',
        domesticViolenceHelpline: '1-800-363-9010',
        generalEmergency: '911',
    },
};
function lookupEmergencyNumbers(countryCode) {
    const normalized = (countryCode || 'IN').trim().toUpperCase();
    if (exports.EMERGENCY_NUMBERS_DATABASE[normalized]) {
        return exports.EMERGENCY_NUMBERS_DATABASE[normalized];
    }
    // Check aliases or region mapping
    if (normalized === 'GB')
        return exports.EMERGENCY_NUMBERS_DATABASE['UK'];
    if (normalized === 'USA')
        return exports.EMERGENCY_NUMBERS_DATABASE['US'];
    if (normalized === 'IND')
        return exports.EMERGENCY_NUMBERS_DATABASE['IN'];
    // Global fallback
    return {
        countryCode: normalized || 'GLOBAL',
        countryName: 'International Fallback',
        police: '112',
        ambulance: '112',
        fire: '112',
        womenHelpline: '1091',
        domesticViolenceHelpline: '181',
        generalEmergency: '112',
    };
}
//# sourceMappingURL=emergencyServices.js.map