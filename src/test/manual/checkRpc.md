I need help debugging a very weird error. I am developing a typescript sdk. One of my functions is called checkRPC, which checks the liveliness of an ethers rpc provider. here it is:

```

function timeout(ms: number, promise: Promise<any>) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timed out after ${ms} ms`))
		}, ms)

		promise
			.then((value) => {
				clearTimeout(timer)
				resolve(value)
			})
			.catch((err) => {
				clearTimeout(timer)
				reject(err)
			})
	})
}

async function checkRpc(rpc: string): Promise<boolean> {
	console.log('checkRpc rpc:', rpc)

	try {
		const provider = new ethers.providers.JsonRpcProvider(rpc)
		await timeout(
			2000,
			new Promise((resolve, reject) => {
				provider.ready // added this, it hangs forever
				provider.getBalance('0x0000000000000000000000000000000000000000').then(resolve).catch(reject)
			})
		)
		return true
	} catch (error) {
		console.log('Error checking provider:', rpc, 'Error:', error)
		return false
	}
}
```

I wrote this test to check if it worked. The test passes happily:
import peanut from '../index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, describe, it } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('checkRpc & getDefaultProvider', function () {
it('getDefaultProvider polygon', async function () {
const provider = await peanut.getDefaultProvider('137')
// try getting block number and balance of zero adddress
const blockNumber = await provider.getBlockNumber()
expect(blockNumber).toBeGreaterThan(0)
const balance = await provider.getBalance(ethers.constants.AddressZero)
console.log('balance: ', balance)
})
})

Here is my test output:
$ npx jest src/test/checkRpc.test.ts
console.log
peanut-sdk version: undefined

      at Object.<anonymous> (src/index.ts:1103:9)

console.log
checkRpc rpc: https://polygon-rpc.com

      at checkRpc (src/index.ts:71:10)

console.log
balance: BigNumber { \_hex: '0x0e80f49fc2b3c52d3b08', \_isBigNumber: true }

      at Object.<anonymous> (src/test/checkRpc.test.ts:14:11)

PASS src/test/checkRpc.test.ts (7.326 s)
checkRpc & getDefaultProvider
✓ getDefaultProvider polygon (2008 ms)

Test Suites: 1 passed, 1 total
Tests: 1 passed, 1 total
Snapshots: 0 total
Time: 7.457 s, estimated 18 s
Ran all test suites matching /src\/test\/checkRpc.test.ts/i.

However, the bizarre thing is that the test doesn't seem to pass if I run it in a node environment pulling from the bundled code:

import peanut from '@squirrel-labs/peanut-sdk'
import { ethers } from 'ethersv5' // v5

const provider = await peanut.getDefaultProvider('137')
// try getting block number and balance of zero adddress
const blockNumber = await provider.getBlockNumber()
expect(blockNumber).toBeGreaterThan(0)
const balance = await provider.getBalance(ethers.constants.AddressZero)
console.log('balance: ', balance)

This fails:
$ node checkRpc.manual.js
WARNING: Missing strong random number source
peanut-sdk version: 0.2.6
checkRpc rpc: https://polygon-rpc.com
Error checking provider: https://polygon-rpc.com Error: Error: could not detect network (event="noNetwork", code=NETWORK_ERROR, version=providers/5.7.2)
at Logger.makeError (file:///home/hugo/Projects/peanut-sdk/src/test/manual/node_modules/.pnpm/@squirrel-labs+peanut-sdk@0.2.6/node_modules/@squirrel-labs/peanut-sdk/dist/peanut-sdk.node.js:7967:23)
at Logger.throwError (file:///home/hugo/Projects/peanut-sdk/src/test/manual/node_modules/.pnpm/@squirrel-labs+peanut-sdk@0.2.6/node_modules/@squirrel-labs/peanut-sdk/dist/peanut-sdk.node.js:7976:20)
at JsonRpcProvider.<anonymous> (file:///home/hugo/Projects/peanut-sdk/src/test/manual/node_modules/.pnpm/@squirrel-labs+peanut-sdk@0.2.6/node_modules/@squirrel-labs/peanut-sdk/dist/peanut-sdk.node.js:11589:27)
at Generator.throw (<anonymous>)
at rejected (file:///home/hugo/Projects/peanut-sdk/src/test/manual/node_modules/.pnpm/@squirrel-labs+peanut-sdk@0.2.6/node_modules/@squirrel-labs/peanut-sdk/dist/peanut-sdk.node.js:11153:65)
at runNextTicks (node:internal/process/task_queues:60:5)
at listOnTimeout (node:internal/timers:538:9)
at process.processTimers (node:internal/timers:512:7) {
reason: 'could not detect network',
code: 'NETWORK_ERROR',
event: 'noNetwork'
}
checkRpc rpc: https://polygon.llamarpc.com
Error checking provider: https://polygon.llamarpc.com Error: Error: could not detect network (event="noNetwork", code=NETWORK_ERROR, version=providers/5.7.2)
....

Do you have any idea what it could be? How do i investigate this bug? The Rpcs clearly work, its not an rpc issue.
