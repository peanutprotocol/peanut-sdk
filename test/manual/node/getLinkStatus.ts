import peanut from '../../../src/index' // import directly from source code

console.log(peanut.version)

const link = 'https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD'
const provider = peanut.getDefaultProvider('137', true)
console.log('provider', provider)
const details = await peanut.getLinkDetails(provider, link)
console.log('details', details)
const status = await peanut.getLinkStatus({ signer: provider, link: link })
console.log('status', status)
