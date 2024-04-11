import { computeAddress } from "ethersv5/lib/utils";
import { CHAIN_DETAILS, LATEST_STABLE_BATCHER_VERSION, LATEST_STABLE_CONTRACT_VERSION, getLatestContractVersion } from "../../src"

function compareVersions(version1: string, version2: string, lead: string): boolean {
    const cleanVersion1 = version1.startsWith(lead) ? version1.substring(lead.length) : version1;
    const cleanVersion2 = version2.startsWith(lead) ? version2.substring(lead.length) : version2;

    const parts1 = cleanVersion1.split('.').map(Number);
    const parts2 = cleanVersion2.split('.').map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);


    for (let i = 0; i < maxLength; i++) {
        const part1 = i < parts1.length ? parts1[i] : 0;
        const part2 = i < parts2.length ? parts2[i] : 0;

        if (part1 > part2) return false; 
        if (part1 < part2) return true;  

    }
    return true;

}


describe('Deployment tests', () => {
    const LTS = LATEST_STABLE_CONTRACT_VERSION
    const LTS_BATCHER = LATEST_STABLE_BATCHER_VERSION

    test.each(Object.keys(CHAIN_DETAILS))('Should have the latest contract version for chain %s deployed',
        function (chainId) {
            const lts = getLatestContractVersion({chainId: CHAIN_DETAILS[chainId].chainId, type: 'normal'})
            console.log('lts', lts)
            expect(compareVersions(LTS, lts, 'v')).toBe(true)  
        },
    100000)

    test.each(Object.keys(CHAIN_DETAILS))('Should have the latest batcher version for chain %s deployed',
        function (chainId) {
            const lts = getLatestContractVersion({chainId: CHAIN_DETAILS[chainId].chainId, type: 'batch'})
            expect(compareVersions(LTS_BATCHER, lts, 'Bv')).toBe(true)
        },
    100000)
})