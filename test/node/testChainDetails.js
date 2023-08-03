import { peanut } from '@squirrel-labs/peanut-sdk';



console.log('Peanut version: ', peanut.version);
for (var key in peanut) {
    console.log(key);
}

console.log(peanut.CHAIN_DETAILS);