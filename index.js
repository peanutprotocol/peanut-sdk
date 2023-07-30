import { ethers } from "ethers";
import { peanut as peanutV5 } from './indexEthersV5.js';
import { peanut as peanutV6 } from './indexEthersV6.js';

let peanut;

if (ethers.version.startsWith('ethers/') || ethers.version.startsWith('5.')) {
    // Using ethers v5
    console.log('%c Detected ethers v5', 'color: #ff0000', ethers.version);
    peanut = peanutV5;
} else if (ethers.version.startsWith('6.')) {
    // Using ethers v6
    console.log('%c Detected ethers v6', 'color: #ff0000', ethers.version);
    peanut = peanutV6;
} else {
    throw new Error('Unsupported version of ethers');
}

export default peanut;